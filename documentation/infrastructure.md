---
description: Runtime infrastructure and deployment environments for Scoops.
---

# Infrastructure

Scoops runs as two separately deployed applications: a TanStack Start/Nitro web
app and a NestJS server. Staging and production run both on **Coolify**, at
`coolify.john-petros.com`, as separate environments of the Scoops project. The
server owns
business data, authentication, REST endpoints, and background-job registration;
the web app calls it over HTTPS. The shared packages under `packages/` are built
into the applications and are not deployed as services.

## Environments

| Environment | Applications | Database | Background jobs | Email |
| --- | --- | --- | --- | --- |
| Local | Web and server run with pnpm | Docker Compose PostgreSQL | Docker Compose Inngest Dev Server | Mailpit SMTP |
| Staging | Separate Coolify applications for web (`web-staging.scoops.com.br`) and server (`server-staging.scoops.com.br`) | Supabase PostgreSQL | Staging branch in the free Inngest Cloud plan | Resend |
| Production | Separate Coolify applications for web (`scoops.com.br`) and server (`server.scoops.com.br`) | Supabase PostgreSQL | Production branch in the free Inngest Cloud plan | Resend |

The staging and production Inngest branches are separate. Each deployed server
uses the event and signing credentials for its own branch so events and jobs stay
within the intended environment. The server exposes registered functions at
`/api/inngest`.

PostgreSQL is the system of record for business data and Better Auth sessions.
Local development uses the Docker Compose PostgreSQL service; staging and
production use Supabase PostgreSQL. Drizzle accesses each environment through
`DATABASE_URL`. Supabase's transaction pooler cannot hold `LISTEN`, so deployed
servers set `DATABASE_LISTENER_URL` to Supabase's session pooler (port 5432);
the direct host is IPv6-only. Business events that require durable publication are written to
a PostgreSQL outbox in the originating transaction;
the server publishes committed events to Inngest, where module-owned jobs handle
side effects.

## Deployment

[`server-app-cd.yml`](../.github/workflows/server-app-cd.yml) and
[`web-app-cd.yml`](../.github/workflows/web-app-cd.yml) deploy both
environments. Each run builds a Docker image, pushes it to GitHub Container
Registry as `ghcr.io/johnpetros/scoops-{server,web}:<mode>-<sha>` (`stg` or
`prod`), syncs the environment's env file from its repository secret to the
Coolify application, and deploys that image tag through the Coolify API with
[`scripts/coolify-deploy.mjs`](../scripts/coolify-deploy.mjs). The server
workflow first runs the image's `release` target, which applies Drizzle
migrations, so the schema is current before the new version starts.

| | Staging | Production |
| --- | --- | --- |
| Trigger | Matching pushes to `main` | Merge of a release PR into `production` |
| Image tag | `stg-<sha>` | `prod-<sha>` |
| Env file secrets | `SCOOPS_SERVER_APP_STAGING_ENV`, `SCOOPS_WEB_APP_STAGING_ENV` | `SCOOPS_SERVER_APP_PRODUCTION_ENV`, `SCOOPS_WEB_APP_PRODUCTION_ENV` |
| Sentry | None: staging builds skip the source-map upload and deploy with empty DSNs | `SENTRY_SERVER_PRODUCTION_PROJECT`, `SENTRY_WEB_PRODUCTION_PROJECT`, `SENTRY_WEB_PRODUCTION_DSN`; the server DSN is in its env file |

Each GitHub environment (`staging`, `production`) holds the variables
`COOLIFY_URL`, `COOLIFY_SERVER_APP_UUID` and `COOLIFY_WEB_APP_UUID`, and may hold
its own `COOLIFY_API_TOKEN` secret, which overrides the repository one. Both
workflows can also be started by hand for either environment, with an optional
ref such as a release tag, to redeploy or roll back.

### Releases

`production` holds the published version and changes only through release PRs.
A release PR is a `release/vX.Y.Z` branch cut at the exact SHA of `main`, titled
`Release vX.Y.Z` and opened against `production` with the `open-release-pr`
prompt. When it merges,
[`create-release.yml`](../.github/workflows/create-release.yml) checks that the
merged tree equals the release branch tree, creates the annotated tag `vX.Y.Z`
on the merge commit, publishes the GitHub Release from the PR body, comments the
links on the PR, and deploys the server and then the web app to production. The
deploys are called directly because a release published with the workflow's
`GITHUB_TOKEN` cannot start other workflows.

The deployment environment supplies secrets and service configuration. The root
`.env` configures local Docker Compose, `apps/server/.env` configures server-only
values, and `apps/web/.env` configures the web app. Only `VITE_` values are exposed
to browser code. Do not put database URLs, Better Auth secrets, Inngest keys, or
email-provider credentials in browser configuration.

The server's `/health` endpoint checks PostgreSQL readiness. Only production
reports web and server telemetry to Sentry; staging, local and test modes never
initialize it. MinIO is optional
local infrastructure reserved for future object storage; it is not a current
deployed dependency. Billing provider integration is planned.

For application boundaries and request flow, see
[`architecture.md`](architecture.md). For local commands and ports, see
[`tooling.md`](tooling.md).
