import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCoolifyClient,
  deployImage,
  deploymentOutcome,
  parseDotenv,
  toEnvPayload,
} from '../coolify-deploy.mjs'

test('parseDotenv reads plain, quoted and exported assignments', () => {
  const source = [
    '# comment',
    '',
    'PLAIN=value=with=equals',
    'export EXPORTED=yes',
    'DOUBLE="line one\\nline two"',
    "SINGLE='keeps \\n literally'",
  ].join('\n')

  assert.deepEqual(parseDotenv(source), {
    PLAIN: 'value=with=equals',
    EXPORTED: 'yes',
    DOUBLE: 'line one\nline two',
    SINGLE: 'keeps \\n literally',
  })
})

test('parseDotenv rejects malformed lines', () => {
  assert.throws(() => parseDotenv('NO_SEPARATOR'), /line 1/u)
  assert.throws(() => parseDotenv('OK=1\n1BAD=2'), /Invalid dotenv key on line 2/u)
  assert.throws(() => parseDotenv('OPEN="unclosed'), /Unclosed quote on line 1/u)
  assert.throws(() => parseDotenv('LONE="'), /Unclosed quote on line 1/u)
})

test('toEnvPayload marks values literal and flags multiline ones', () => {
  assert.deepEqual(toEnvPayload({ URL: 'postgres://$user', KEY: 'a\nb' }), {
    data: [
      {
        key: 'URL',
        value: 'postgres://$user',
        is_literal: true,
        is_multiline: false,
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
      {
        key: 'KEY',
        value: 'a\nb',
        is_literal: true,
        is_multiline: true,
        is_preview: false,
        is_buildtime: false,
        is_runtime: true,
      },
    ],
  })
})

test('deploymentOutcome maps Coolify statuses', () => {
  assert.equal(deploymentOutcome('finished'), 'succeeded')
  assert.equal(deploymentOutcome('failed'), 'failed')
  assert.equal(deploymentOutcome('cancelled-by-user'), 'failed')
  assert.equal(deploymentOutcome('queued'), 'pending')
  assert.equal(deploymentOutcome('in_progress'), 'pending')
})

test('createCoolifyClient requires a URL and token', () => {
  assert.throws(() => createCoolifyClient({ baseUrl: '', token: 't' }), /required/u)
  assert.throws(
    () => createCoolifyClient({ baseUrl: 'https://c', token: '' }),
    /required/u,
  )
})

test('createCoolifyClient sends authenticated requests to the v1 API', async () => {
  const calls = []
  const request = async (url, init) => {
    calls.push({ url, init })
    return { ok: true, json: async () => ({ deployments: [] }) }
  }
  const client = createCoolifyClient({
    baseUrl: 'https://coolify.test/',
    token: 'secret',
    request,
  })

  await client.updateEnvs('app', { A: '1' })
  await client.setImageTag('app', 'abc')
  await client.startDeploy('app')

  assert.deepEqual(
    calls.map(({ url, init }) => `${init.method} ${url}`),
    [
      'PATCH https://coolify.test/api/v1/applications/app/envs/bulk',
      'PATCH https://coolify.test/api/v1/applications/app',
      'POST https://coolify.test/api/v1/deploy?uuid=app&cancel_previous=queued',
    ],
  )
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret')
  assert.deepEqual(JSON.parse(calls[1].init.body), { docker_registry_image_tag: 'abc' })
  assert.equal(calls[2].init.body, undefined)
})

test('createCoolifyClient reports failed responses with their status', async () => {
  const request = async () => ({ ok: false, status: 401 })
  const client = createCoolifyClient({ baseUrl: 'https://c', token: 't', request })
  await assert.rejects(
    client.setImageTag('app', 'abc'),
    /PATCH \/applications\/app failed \(401\)/u,
  )
})

function fakeClient(statuses, deployments = [{ deployment_uuid: 'dep-1' }]) {
  const log = []
  return {
    log,
    setImageTag: async (app, tag) => log.push(`tag ${app} ${tag}`),
    startDeploy: async (app) => {
      log.push(`deploy ${app}`)
      return { deployments }
    },
    getDeployment: async (uuid) => {
      log.push(`status ${uuid}`)
      return { status: statuses.shift() }
    },
  }
}

const noWait = { pollIntervalMs: 1, timeoutMs: 5, wait: async () => {} }

test('deployImage sets the tag, deploys and waits until finished', async () => {
  const client = fakeClient(['queued', 'in_progress', 'finished'])
  assert.equal(await deployImage(client, 'app', 'sha', noWait), 'dep-1')
  assert.deepEqual(client.log, [
    'tag app sha',
    'deploy app',
    'status dep-1',
    'status dep-1',
    'status dep-1',
  ])
})

test('deployImage fails when the deployment fails', async () => {
  await assert.rejects(
    deployImage(fakeClient(['failed']), 'app', 'sha', noWait),
    /dep-1 failed/u,
  )
})

test('deployImage fails when Coolify starts no deployment', async () => {
  await assert.rejects(
    deployImage(fakeClient([], []), 'app', 'sha', noWait),
    /did not start/u,
  )
})

test('deployImage times out when the deployment never settles', async () => {
  const client = fakeClient(Array(20).fill('in_progress'))
  await assert.rejects(
    deployImage(client, 'app', 'sha', noWait),
    /did not finish in time/u,
  )
})
