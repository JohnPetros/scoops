import { beforeEach, describe, expect, it, vi } from 'vitest'

const { browserEnv, sentry } = vi.hoisted(() => {
  const scope = { setLevel: vi.fn(), setTag: vi.fn() }
  return {
    browserEnv: {
      scoopsServerAppUrl: 'https://scoops.test',
      scoopsServerRestUrl: 'https://scoops.test/api/server',
      scoopsWebAppMode: 'prod',
      sentryDsn: 'https://public@o1.ingest.sentry.io/1' as string | undefined,
      scoopsReleaseSha: 'a'.repeat(40),
    },
    sentry: {
      withScope: vi.fn((callback: (value: typeof scope) => void) => callback(scope)),
      captureMessage: vi.fn(),
      metrics: { distribution: vi.fn() },
    },
  }
})

vi.mock('@sentry/tanstackstart-react', () => sentry)

vi.mock('@/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/constants')>()),
  BROWSER_ENV: browserEnv,
}))

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({ handler: <Handler>(handler: Handler) => handler }),
}))

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeader: (name: string) =>
    name === 'cookie' ? 'scoops.session_token=session-token' : undefined,
  setResponseHeader: vi.fn(),
}))

import { AuthRouteUnavailableError } from '../auth-route-unavailable-error'
import { requireAuthMiddleware } from '../require-auth-middleware'

const location = { pathname: '/dashboard', searchStr: '' }

describe('requireAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    browserEnv.scoopsWebAppMode = 'prod'
    browserEnv.sentryDsn = 'https://public@o1.ingest.sentry.io/1'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
  })

  it('reports an unavailable auth session to Sentry in production', async () => {
    await expect(requireAuthMiddleware({ location })).rejects.toBeInstanceOf(
      AuthRouteUnavailableError,
    )

    expect(sentry.captureMessage).toHaveBeenCalledWith(
      'web.warning.auth.session.TypeError',
    )
  })

  it('does not report to Sentry on staging, even with a DSN configured', async () => {
    browserEnv.scoopsWebAppMode = 'stg'

    await expect(requireAuthMiddleware({ location })).rejects.toBeInstanceOf(
      AuthRouteUnavailableError,
    )

    expect(sentry.captureMessage).not.toHaveBeenCalled()
  })

  it('does not report to Sentry in production without a DSN', async () => {
    browserEnv.sentryDsn = undefined

    await expect(requireAuthMiddleware({ location })).rejects.toBeInstanceOf(
      AuthRouteUnavailableError,
    )

    expect(sentry.captureMessage).not.toHaveBeenCalled()
  })
})
