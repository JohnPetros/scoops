// Runs the local checks for the code changed since a branch left the target branch.
// Nothing here checks a whole workspace's tests; see the Local check scope in
// documentation/tooling.md.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIRECTORY = fileURLToPath(new URL('..', import.meta.url))
const WORKSPACES = {
  'packages/core': {
    name: '@scoops/core',
    source: 'src/',
    dependents: ['packages/validation', 'apps/server', 'apps/web'],
    architecture: true,
    coverage: 'core',
  },
  'packages/validation': {
    name: '@scoops/validation',
    source: 'src/',
    dependents: ['apps/server', 'apps/web'],
    architecture: true,
  },
  'packages/email': {
    name: '@scoops/email',
    source: 'templates/',
    dependents: ['apps/server'],
  },
  'apps/server': {
    name: 'server',
    source: 'src/',
    dependents: [],
    architecture: true,
    coverage: 'server',
    needsDocker: true,
    // Controller tests boot the whole application, so `vitest related` would select
    // nearly the whole suite for almost any file.
    runsOwnTests: true,
  },
  'apps/web': {
    name: 'web',
    source: 'src/',
    dependents: [],
    architecture: true,
    coverage: 'web',
    testArguments: ['--testTimeout=15000'],
  },
}
const CODE_FILE = /\.tsx?$/
const LINTABLE_FILE = /\.(?:[cm]?[jt]sx?|jsonc?|css)$/
const TEST_CODE = /\.test\.(?:[cm]?js|tsx?)$|\/(?:tests|fixtures|fakers)\//
const TEST_FILE = /\.test\.(?:[cm]?js|tsx?)$/
// Files the coverage configurations leave out.
const UNMEASURED_FILE = /(?:^|\/)index\.ts$|\.d\.ts$|(?:^|\/)database\/seed\.ts$/
const WORKSPACE_CONFIG =
  /^(?:package\.json|tsconfig[^/]*\.json|vite[^/]*\.config\.[cm]?ts)$/
const SHARED_FILE =
  /^(?:package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|turbo\.json|biome\.json|\.dependency-cruiser\.mjs)$|^(?:apps|packages)\/[^/]+\/(?:[^/]*config[^/]*|package\.json)$|\/fixtures\//
const USE_CASE = /^packages\/core\/(src\/(?:.+\/)?use-cases\/[^/]+-use-case\.ts)$/
const USE_CASE_TEST =
  /^(packages\/core\/src\/(?:.+\/)?use-cases\/)tests\/([^/]+-use-case)\.test\.ts$/
const USAGE =
  'Usage: pnpm check:changed [--base <git-ref>] [--tests <test-file>...] [--dry-run]'

function step(label, command, extra = {}) {
  return { label, command, ...extra }
}

function describeWorkspace(directory, changes) {
  const prefix = `${directory}/`
  const { source } = WORKSPACES[directory]
  const own = changes
    .filter(({ path }) => path.startsWith(prefix))
    .map(({ path, deleted }) => ({ path: path.slice(prefix.length), deleted }))
  const code = own.filter(({ path }) => path.startsWith(source) && CODE_FILE.test(path))
  return {
    directory,
    code,
    isChanged: code.length > 0 || own.some(({ path }) => WORKSPACE_CONFIG.test(path)),
    // Source that other workspaces can import may change what they compile against.
    changesContract: code.some(({ path }) => !TEST_CODE.test(path)),
  }
}

function planStaticChecks(existing, workspaces, base) {
  const changed = workspaces.filter(({ isChanged }) => isChanged)
  const lintable = existing.filter((path) => LINTABLE_FILE.test(path))
  const typed = new Set(changed.map(({ directory }) => directory))
  for (const { directory, changesContract } of changed) {
    if (!changesContract) continue
    for (const dependent of WORKSPACES[directory].dependents) typed.add(dependent)
  }
  return [
    ...(lintable.length
      ? [
          step('Lint', [
            'pnpm',
            'exec',
            'biome',
            'check',
            '--no-errors-on-unmatched',
            '--files-ignore-unknown=true',
            ...lintable,
          ]),
        ]
      : []),
    ...(workspaces.some(({ code }) => code.length)
      ? [step('Complexity', ['node', 'scripts/check-complexity.mjs', '--base', base])]
      : []),
    ...Object.keys(WORKSPACES)
      .filter((directory) => typed.has(directory))
      .map((directory) =>
        step(`Types: ${directory}`, [
          'pnpm',
          '--filter',
          WORKSPACES[directory].name,
          'check:types',
        ]),
      ),
    ...changed
      .filter(({ directory }) => WORKSPACES[directory].architecture)
      .map(({ directory }) =>
        step(`Architecture: ${directory}`, [
          'pnpm',
          '--filter',
          WORKSPACES[directory].name,
          'check:architecture',
        ]),
      ),
  ]
}

// A test owns the file it is named after, from the `tests` folder beside it.
function findOwnTest(directory, path, exists) {
  const folder = posix.dirname(path)
  const stem = posix.basename(path).replace(CODE_FILE, '')
  const name = stem === 'index' ? posix.basename(folder) : stem
  return ['ts', 'tsx']
    .map((extension) => `${folder}/tests/${name}.test.${extension}`)
    .find((candidate) => exists(`${directory}/${candidate}`))
}

function selectOwnTests(directory, files, requested, exists) {
  const targets = new Set(requested)
  const untested = []
  for (const file of files) {
    if (TEST_FILE.test(file)) targets.add(file)
    else {
      const own = findOwnTest(directory, file, exists)
      if (own) targets.add(own)
      else if (!TEST_CODE.test(file) && !UNMEASURED_FILE.test(file)) untested.push(file)
    }
  }
  return { targets: [...targets].sort(), untested }
}

function readRequestedTests(tests) {
  return tests.map((path) => {
    const directory = Object.keys(WORKSPACES).find(
      (candidate) =>
        WORKSPACES[candidate].coverage && path.startsWith(`${candidate}/src/`),
    )
    if (!directory || !TEST_FILE.test(path)) {
      throw new Error(`Not a Core, Server or Web test file: ${path}`)
    }
    return { directory, file: path.slice(directory.length + 1) }
  })
}

// Runs only the tests tied to the change, then measures only the changed lines.
function planTests({ directory, code }, { base, isDockerRunning, exists, requested }) {
  const workspace = WORKSPACES[directory]
  const files = code.filter(({ deleted }) => !deleted).map(({ path }) => path)
  const extra = requested
    .filter((item) => item.directory === directory)
    .map(({ file }) => file)
  if (!workspace.coverage || !(files.length + extra.length)) {
    return { steps: [], notes: [] }
  }
  const { targets, untested } = workspace.runsOwnTests
    ? selectOwnTests(directory, files, extra, exists)
    : { targets: [...new Set([...files, ...extra])], untested: [] }
  const tests = `Tests: ${directory}`
  const thresholds = ['branches', 'functions', 'lines', 'statements'].map(
    (metric) => `--coverage.thresholds.${metric}=0`,
  )
  const selection = workspace.runsOwnTests
    ? ['run', ...targets]
    : ['related', ...targets, '--run', '--passWithNoTests']
  let skip
  // Without a file argument Vitest would run the whole suite, so there is no command.
  if (!targets.length) skip = 'no test is named after the changed files; use --tests'
  else if (workspace.needsDocker && !isDockerRunning) skip = 'Docker is not running'
  const command = targets.length
    ? [
        'pnpm',
        '--filter',
        workspace.name,
        'exec',
        'vitest',
        ...selection,
        '--coverage',
        ...thresholds,
        ...(workspace.testArguments ?? []),
      ]
    : []
  return {
    steps: [
      step(tests, command, skip ? { skip } : {}),
      step(
        `Changed-lines coverage: ${directory}`,
        [
          'node',
          'scripts/check-changed-coverage.mjs',
          workspace.coverage,
          `${directory}/coverage/lcov.info`,
          '--base',
          base,
          '--working-tree',
        ],
        { requires: tests },
      ),
    ],
    notes:
      untested.length && !extra.length
        ? [
            `No test is named after ${untested.map((file) => `${directory}/${file}`).join(', ')}. Add the tests that cover them with --tests.`,
          ]
        : [],
  }
}

function planMutation(existing, exists) {
  const useCases = new Set()
  for (const path of existing) {
    const test = path.match(USE_CASE_TEST)
    const candidate = test ? `${test[1]}${test[2]}.ts` : path
    const match = candidate.match(USE_CASE)
    if (match && !TEST_CODE.test(candidate) && exists(candidate)) useCases.add(match[1])
  }
  if (!useCases.size) return []
  const files = [...useCases].sort()
  return [
    step(
      'Mutation: changed use cases',
      ['pnpm', '--filter', '@scoops/core', 'test:mutation', '--files', ...files],
      // Finishing the run says nothing about the score, which has no local limit.
      { review: 'compare each file score with 70%' },
    ),
  ]
}

function planScriptTests(changes, exists) {
  const tests = new Set()
  for (const { path } of changes) {
    const match = path.match(/^scripts\/(?:tests\/)?([^/]+?)(?:\.test)?\.mjs$/)
    const test = match && `scripts/tests/${match[1]}.test.mjs`
    if (test && exists(test)) tests.add(test)
  }
  return tests.size
    ? [step('Script tests', ['node', '--test', ...[...tests].sort()])]
    : []
}

function planBrowserTests(existing) {
  const specs = existing
    .filter((path) => path.startsWith('apps/web/tests/') && path.endsWith('.test.ts'))
    .map((path) => path.slice('apps/web/'.length))
  // Without file arguments Playwright would run the complete suite, so no step exists.
  return specs.length
    ? [
        step('Changed Playwright files', [
          'pnpm',
          '--filter',
          'web',
          'exec',
          'playwright',
          'test',
          ...specs,
        ]),
      ]
    : []
}

function planNotes(changes, existing) {
  const notes = []
  const shared = changes.map(({ path }) => path).filter((path) => SHARED_FILE.test(path))
  if (shared.length) {
    notes.push(
      `Shared code changed (${shared.join(', ')}). Run a broader check yourself if the change needs it.`,
    )
  }
  const hasUi = existing.some(
    (path) => /^apps\/web\/src\/(?:ui|routes)\//.test(path) && !TEST_CODE.test(path),
  )
  if (hasUi) {
    notes.push(
      'Web UI changed. Run the Playwright files for the changed routes: pnpm --filter web exec playwright test <file>',
    )
  }
  for (const directory of ['packages/validation', 'packages/email']) {
    if (
      existing.some((path) => path.startsWith(`${directory}/`) && CODE_FILE.test(path))
    ) {
      notes.push(
        `${directory} has no tests of its own. Run the consumer tests that cover it.`,
      )
    }
  }
  return notes
}

export function planChecks(changes, { base, isDockerRunning, exists, tests = [] }) {
  const existing = changes.filter(({ deleted }) => !deleted).map(({ path }) => path)
  const workspaces = Object.keys(WORKSPACES).map((directory) =>
    describeWorkspace(directory, changes),
  )
  const testContext = {
    base,
    isDockerRunning,
    exists,
    requested: readRequestedTests(tests),
  }
  const testPlans = workspaces.map((workspace) => planTests(workspace, testContext))
  return {
    steps: [
      ...planStaticChecks(existing, workspaces, base),
      ...planScriptTests(changes, exists),
      ...(existing.some((path) => TEST_FILE.test(path))
        ? [
            step('Test integrity', [
              'node',
              'scripts/check-test-integrity.mjs',
              '--base',
              base,
            ]),
          ]
        : []),
      ...testPlans.flatMap(({ steps }) => steps),
      ...planBrowserTests(existing),
      // Mutation testing is the slowest check, so it runs last.
      ...planMutation(existing, exists),
    ],
    notes: [...testPlans.flatMap(({ notes }) => notes), ...planNotes(changes, existing)],
  }
}

export function executeSteps(steps, run) {
  const results = new Map()
  for (const { label, command, skip, requires, review } of steps) {
    const blocked =
      requires && results.get(requires)?.status !== 'PASS'
        ? `${requires} did not pass`
        : undefined
    const reason = skip ?? blocked
    if (reason) results.set(label, { status: 'SKIPPED', reason })
    else if (!run(label, command)) results.set(label, { status: 'FAIL' })
    else if (review) results.set(label, { status: 'REVIEW', reason: review })
    else results.set(label, { status: 'PASS' })
  }
  return results
}

// A skipped check is not a pass: 1 means a failure, 2 an incomplete run.
export function exitCodeFor(results) {
  const statuses = [...results.values()].map(({ status }) => status)
  if (statuses.includes('FAIL')) return 1
  return statuses.includes('SKIPPED') ? 2 : 0
}

export function parseArguments(argumentsList) {
  const options = { base: 'origin/main', isDryRun: false, tests: [] }
  const rest = argumentsList.filter((argument) => argument !== '--')
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === '--dry-run') options.isDryRun = true
    else if (rest[index] === '--base' && rest[index + 1]) options.base = rest[++index]
    else if (rest[index] === '--tests' && rest[index + 1]) {
      while (rest[index + 1] && !rest[index + 1].startsWith('--')) {
        options.tests.push(rest[++index])
      }
    } else throw new Error(USAGE)
  }
  return options
}

function git(...argumentsList) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...argumentsList], {
    cwd: ROOT_DIRECTORY,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
}

// Committed, staged, unstaged and untracked changes all count.
function listChanges(base) {
  const fields = git('diff', '--name-status', '--no-renames', '-z', base, '--')
    .split('\0')
    .filter(Boolean)
  const changes = []
  for (let index = 0; index < fields.length; index += 2) {
    changes.push({ path: fields[index + 1], deleted: fields[index] === 'D' })
  }
  const untracked = git('ls-files', '--others', '--exclude-standard', '-z')
    .split('\0')
    .filter(Boolean)
  return [...changes, ...untracked.map((path) => ({ path, deleted: false }))]
}

function isDockerRunning() {
  return spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0
}

function runCommand(label, [command, ...argumentsList]) {
  console.log(`\n=== ${label} ===`)
  const executable =
    process.platform === 'win32' && command === 'pnpm' ? 'pnpm.cmd' : command
  const result = spawnSync(executable, argumentsList, {
    cwd: ROOT_DIRECTORY,
    stdio: 'inherit',
  })
  return result.status === 0
}

function main() {
  const options = parseArguments(process.argv.slice(2))
  const base = git('merge-base', options.base, 'HEAD').trim()
  const changes = listChanges(base)
  const missing = options.tests.find((path) => !existsSync(join(ROOT_DIRECTORY, path)))
  if (missing) throw new Error(`Test file not found: ${missing}`)
  const { steps, notes } = planChecks(changes, {
    base,
    tests: options.tests,
    isDockerRunning: isDockerRunning(),
    exists: (path) => existsSync(join(ROOT_DIRECTORY, path)),
  })
  console.log(
    `${changes.length} changed file(s) since ${base.slice(0, 8)}, ${steps.length} check(s).`,
  )
  if (options.isDryRun) {
    for (const { label, command, skip } of steps) {
      console.log(
        `\n${label}${skip ? ` (would skip: ${skip})` : ''}\n  ${command.join(' ')}`,
      )
    }
  } else {
    const results = executeSteps(steps, runCommand)
    console.log('\n=== Summary ===')
    for (const [label, { status, reason }] of results) {
      console.log(`${status.padEnd(7)}  ${label}${reason ? ` (${reason})` : ''}`)
    }
    process.exitCode = exitCodeFor(results)
  }
  for (const note of notes) console.log(`\nNote: ${note}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main()
  } catch (error) {
    console.error(`Changed-code checks: ${error.message}`)
    process.exitCode = 1
  }
}
