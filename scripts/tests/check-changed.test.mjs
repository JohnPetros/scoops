import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  executeSteps,
  exitCodeFor,
  parseArguments,
  planChecks,
} from '../check-changed.mjs'

const SCRIPT = fileURLToPath(new URL('../check-changed.mjs', import.meta.url))
const USE_CASE = 'packages/core/src/pdv/use-cases/register-order-use-case.ts'
const USE_CASE_TEST =
  'packages/core/src/pdv/use-cases/tests/register-order-use-case.test.ts'

function plan(paths, options = {}) {
  const changes = paths.map((path) =>
    typeof path === 'string' ? { path, deleted: false } : path,
  )
  return planChecks(changes, {
    base: 'abc',
    isDockerRunning: true,
    exists: () => true,
    ...options,
  })
}

const labels = ({ steps }) => steps.map(({ label }) => label)
const command = ({ steps }, label) =>
  steps.find((step) => step.label === label)?.command.join(' ')

test('checks a changed use case and the types of its dependents', () => {
  const result = plan([USE_CASE])

  assert.deepEqual(labels(result), [
    'Lint',
    'Complexity',
    'Types: packages/core',
    'Types: packages/validation',
    'Types: apps/server',
    'Types: apps/web',
    'Architecture: packages/core',
    'Tests: packages/core',
    'Changed-lines coverage: packages/core',
    'Mutation: changed use cases',
  ])
  assert.match(command(result, 'Lint'), new RegExp(`${USE_CASE}$`))
  assert.match(
    command(result, 'Tests: packages/core'),
    /vitest related src\/pdv\/use-cases\/register-order-use-case\.ts --run/,
  )
  assert.match(
    command(result, 'Changed-lines coverage: packages/core'),
    /--base abc --working-tree$/,
  )
  assert.match(
    command(result, 'Mutation: changed use cases'),
    /--files src\/pdv\/use-cases\/register-order-use-case\.ts$/,
  )
})

test('mutates the use case of a changed test without touching dependents', () => {
  const result = plan([USE_CASE_TEST])

  assert.deepEqual(
    labels(result).filter((label) => label.startsWith('Types')),
    ['Types: packages/core'],
  )
  assert.ok(labels(result).includes('Test integrity'))
  assert.match(
    command(result, 'Mutation: changed use cases'),
    /--files src\/pdv\/use-cases\/register-order-use-case\.ts$/,
  )
})

test('never plans a check of a whole test suite', () => {
  const result = plan([
    USE_CASE,
    'apps/server/src/pdv/rest/controllers/a-controller.ts',
    'apps/web/src/ui/pdv/widgets/a/index.tsx',
    'apps/web/tests/pdv/pages/orders.page.test.ts',
    'pnpm-lock.yaml',
    'apps/web/vitest.config.ts',
  ])

  for (const { command } of result.steps) {
    const text = command.join(' ')
    assert.doesNotMatch(text, /test:coverage|test:integration|--all\b/)
    if (text.includes('vitest run')) {
      assert.match(command[command.indexOf('run') + 1], /\.test\.tsx?$/)
    }
    if (command.includes('playwright')) {
      assert.deepEqual(command.slice(-2), ['test', 'tests/pdv/pages/orders.page.test.ts'])
    }
  }
  assert.match(result.notes.join('\n'), /Shared code changed \(pnpm-lock\.yaml/)
})

test('reminds about browser tests instead of running them all', () => {
  const result = plan(['apps/web/src/ui/pdv/widgets/a/index.tsx'])

  assert.ok(!labels(result).includes('Changed Playwright files'))
  assert.match(result.notes.join('\n'), /Playwright files for the changed routes/)
})

const CONTROLLER = 'apps/server/src/pdv/rest/controllers/list-orders.controller.ts'
const CONTROLLER_TEST =
  'apps/server/src/pdv/rest/controllers/tests/list-orders.controller.test.ts'
const MAPPER = 'apps/server/src/pdv/database/drizzle/mappers/order-mapper.ts'

test('runs only the server tests named after the changed files', () => {
  const result = plan([CONTROLLER], {
    exists: (path) => path === CONTROLLER_TEST,
  })

  assert.match(
    command(result, 'Tests: apps/server'),
    /exec vitest run src\/pdv\/rest\/controllers\/tests\/list-orders\.controller\.test\.ts --coverage/,
  )
})

test('asks for the covering tests of a server file without its own', () => {
  const options = { exists: () => false }
  const unnamed = plan([MAPPER], options)
  const [tests] = unnamed.steps.filter(({ label }) => label === 'Tests: apps/server')

  assert.deepEqual(tests.command, [])
  assert.equal(
    executeSteps(unnamed.steps, () => true).get('Tests: apps/server').status,
    'SKIPPED',
  )
  assert.match(unnamed.notes.join('\n'), /order-mapper\.ts\. Add the tests/)

  const named = plan([MAPPER], { ...options, tests: [CONTROLLER_TEST] })
  assert.match(command(named, 'Tests: apps/server'), /list-orders\.controller\.test\.ts/)
  assert.deepEqual(named.notes, [])
  assert.throws(() => plan([MAPPER], { tests: [MAPPER] }), /test file/)
})

test('skips server tests without Docker and the coverage that needs them', () => {
  const result = plan(['apps/server/src/pdv/rest/a.ts'], { isDockerRunning: false })
  const results = executeSteps(result.steps, () => true)

  assert.equal(results.get('Tests: apps/server').status, 'SKIPPED')
  assert.equal(results.get('Changed-lines coverage: apps/server').status, 'SKIPPED')
  assert.equal(results.get('Lint').status, 'PASS')
  assert.equal(exitCodeFor(results), 2)
})

test('leaves deleted files out of file checks but still checks their workspace', () => {
  const result = plan([{ path: USE_CASE, deleted: true }])

  assert.deepEqual(labels(result), [
    'Complexity',
    'Types: packages/core',
    'Types: packages/validation',
    'Types: apps/server',
    'Types: apps/web',
    'Architecture: packages/core',
  ])
})

test('runs only the tests of changed scripts, and nothing for documentation', () => {
  const scripts = plan(['scripts/check-changed.mjs', 'scripts/tests/open-doop.test.mjs'])

  assert.equal(
    command(scripts, 'Script tests'),
    'node --test scripts/tests/check-changed.test.mjs scripts/tests/open-doop.test.mjs',
  )
  assert.deepEqual(plan(['documentation/tooling.md']), { steps: [], notes: [] })
})

test('asks for review of a finished mutation run instead of passing it', () => {
  const results = executeSteps(plan([USE_CASE]).steps, () => true)

  assert.equal(results.get('Mutation: changed use cases').status, 'REVIEW')
  assert.equal(exitCodeFor(results), 0)
})

test('reports a failure ahead of a skipped check', () => {
  const results = executeSteps(
    [
      { label: 'tests', command: ['a'] },
      { label: 'coverage', command: ['b'], requires: 'tests' },
    ],
    () => false,
  )

  assert.deepEqual(
    [...results.values()].map(({ status }) => status),
    ['FAIL', 'SKIPPED'],
  )
  assert.equal(exitCodeFor(results), 1)
})

test('reads its options and rejects anything else', () => {
  assert.deepEqual(parseArguments([]), {
    base: 'origin/main',
    isDryRun: false,
    tests: [],
  })
  assert.deepEqual(
    parseArguments(['--', '--tests', 'a', 'b', '--base', 'main', '--dry-run']),
    { base: 'main', isDryRun: true, tests: ['a', 'b'] },
  )
  assert.throws(() => parseArguments(['--tests']), /Usage/)
  assert.throws(() => parseArguments(['--all']), /Usage/)
})

test('lists the planned checks without running them', () => {
  const run = spawnSync(process.execPath, [SCRIPT, '--base', 'HEAD', '--dry-run'], {
    encoding: 'utf8',
  })

  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /changed file\(s\) since [0-9a-f]{8}/)
})
