// Deploys a prebuilt image to a Coolify application.
// Usage:
//   node scripts/coolify-deploy.mjs sync-env <env-file> <app-uuid> [github-env-file]
//   node scripts/coolify-deploy.mjs deploy <app-uuid> <image-tag>
// Both commands read COOLIFY_URL and COOLIFY_API_TOKEN from the environment.
import { randomUUID } from 'node:crypto'
import { appendFile, readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'

const POLL_INTERVAL_MS = 5000
const DEPLOY_TIMEOUT_MS = 20 * 60 * 1000
const FAILED_STATUSES = new Set(['failed', 'cancelled-by-user', 'cancelled'])

export function parseDotenv(source) {
  const entries = {}

  for (const [index, rawLine] of source.split(/\r?\n/u).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const assignment = line.startsWith('export ') ? line.slice(7).trim() : line
    const separator = assignment.indexOf('=')
    if (separator < 1) throw new Error(`Invalid dotenv assignment on line ${index + 1}`)

    const key = assignment.slice(0, separator).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) {
      throw new Error(`Invalid dotenv key on line ${index + 1}`)
    }

    entries[key] = parseValue(assignment.slice(separator + 1).trim(), index + 1)
  }

  return entries
}

function parseValue(value, lineNumber) {
  if (!value.startsWith("'") && !value.startsWith('"')) return value

  const quote = value[0]
  if (value.length < 2 || !value.endsWith(quote)) {
    throw new Error(`Unclosed quote on line ${lineNumber}`)
  }

  const unquoted = value.slice(1, -1)
  return quote === '"' ? unquoted.replace(/\\n/gu, '\n') : unquoted
}

// Literal values keep `$` from being interpolated by Coolify. Images are built in
// GitHub Actions, so the values are only needed inside the running container.
export function toEnvPayload(config) {
  return {
    data: Object.entries(config).map(([key, value]) => ({
      key,
      value,
      is_literal: true,
      is_multiline: value.includes('\n'),
      is_preview: false,
      is_buildtime: false,
      is_runtime: true,
    })),
  }
}

export function deploymentOutcome(status) {
  if (status === 'finished') return 'succeeded'
  if (FAILED_STATUSES.has(status)) return 'failed'
  return 'pending'
}

export function createCoolifyClient({ baseUrl, token, request = fetch }) {
  if (!baseUrl || !token)
    throw new Error('COOLIFY_URL and COOLIFY_API_TOKEN are required.')
  const apiUrl = `${baseUrl.replace(/\/$/u, '')}/api/v1`

  async function call(method, path, body) {
    const response = await request(`${apiUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!response.ok)
      throw new Error(`Coolify ${method} ${path} failed (${response.status})`)
    return response.json()
  }

  return {
    updateEnvs: (appUuid, config) =>
      call(
        'PATCH',
        `/applications/${encodeURIComponent(appUuid)}/envs/bulk`,
        toEnvPayload(config),
      ),
    setImageTag: (appUuid, tag) =>
      call('PATCH', `/applications/${encodeURIComponent(appUuid)}`, {
        docker_registry_image_tag: tag,
      }),
    startDeploy: (appUuid) =>
      call('POST', `/deploy?uuid=${encodeURIComponent(appUuid)}&cancel_previous=queued`),
    getDeployment: (deploymentUuid) =>
      call('GET', `/deployments/${encodeURIComponent(deploymentUuid)}`),
  }
}

export async function deployImage(client, appUuid, tag, options = {}) {
  const {
    pollIntervalMs = POLL_INTERVAL_MS,
    timeoutMs = DEPLOY_TIMEOUT_MS,
    wait = sleep,
  } = options
  await client.setImageTag(appUuid, tag)
  const deploymentUuid = await startDeployment(client, appUuid)

  for (let waited = 0; waited <= timeoutMs; waited += pollIntervalMs) {
    const { status } = await client.getDeployment(deploymentUuid)
    const outcome = deploymentOutcome(status)
    if (outcome === 'succeeded') return deploymentUuid
    if (outcome === 'failed')
      throw new Error(`Coolify deployment ${deploymentUuid} ${status}.`)
    await wait(pollIntervalMs)
  }

  throw new Error(`Coolify deployment ${deploymentUuid} did not finish in time.`)
}

async function startDeployment(client, appUuid) {
  const { deployments } = await client.startDeploy(appUuid)
  const deploymentUuid = deployments?.[0]?.deployment_uuid
  if (!deploymentUuid)
    throw new Error(`Coolify did not start a deployment for ${appUuid}.`)
  return deploymentUuid
}

async function exportGitHubEnvironment(path, config) {
  let output = ''
  for (const [key, value] of Object.entries(config)) {
    const delimiter = `SCOOPS_${randomUUID()}`
    output += `${key}<<${delimiter}\n${value}\n${delimiter}\n`
  }
  await appendFile(path, output, { encoding: 'utf8', mode: 0o600 })
}

async function syncEnv(client, [envFilePath, appUuid, githubEnvPath]) {
  if (!envFilePath || !appUuid) {
    throw new Error(
      'Usage: coolify-deploy.mjs sync-env <env-file> <app-uuid> [github-env-file]',
    )
  }
  const config = parseDotenv(await readFile(envFilePath, 'utf8'))
  if (githubEnvPath) await exportGitHubEnvironment(githubEnvPath, config)
  await client.updateEnvs(appUuid, config)
  console.log(`Synced ${Object.keys(config).length} Coolify env vars for ${appUuid}.`)
}

async function deploy(client, [appUuid, tag]) {
  if (!appUuid || !tag)
    throw new Error('Usage: coolify-deploy.mjs deploy <app-uuid> <image-tag>')
  const deploymentUuid = await deployImage(client, appUuid, tag)
  console.log(`Coolify deployment ${deploymentUuid} finished with image tag ${tag}.`)
}

async function main([command, ...args]) {
  const client = createCoolifyClient({
    baseUrl: process.env.COOLIFY_URL,
    token: process.env.COOLIFY_API_TOKEN,
  })
  if (command === 'sync-env') return syncEnv(client, args)
  if (command === 'deploy') return deploy(client, args)
  throw new Error(`Unknown command: ${command ?? '(none)'}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main(process.argv.slice(2))
}
