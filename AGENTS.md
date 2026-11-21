Guidance for AI coding agents working in this repository (Scoops).

## Tool availability and usage

The development environment uses Doop and Context7 MCP servers. Use an MCP when
the task matches its purpose; do not invoke one when local source, repository
documentation, and normal validation commands are sufficient. Use the Playwright
CLI for all browser interaction, inspection and validation; do not use
`browser-use`, CDP workflows or Playwright MCP for repository implementation.

## Grilling protocol

When the grilling protocol is being applied, do not use the question tool
(`request_user_input`) to ask the user questions. Ask any needed questions through
the conversation in accordance with the grilling protocol defined in
[`documentation/prompts/interview-prompt.md`](documentation/prompts/interview-prompt.md).

## Parallel work and subagents

Whenever the work contains independent workstreams that can be executed in
parallel, create subagents and delegate those workstreams instead of performing
them sequentially. Give each subagent a clearly bounded responsibility, identify
the files or paths it owns, and give it a specific name that describes its
responsibility; do not use generic names. Avoid assigning overlapping edits.
Keep shared decisions and integration in the main task, then review and validate
all subagent results together before completion.
Subagent names must be specific and descriptive of the assigned responsibility,
such as `checkout-flow-tester`, `catalog-schema-explorer`, or
`auth-api-builder`; do not use generic names such as `worker`, `agent`, or
`subagent`.

### Doop MCP

Use the Doop MCP for the `Scoops` canvas: frame inspection or editing,
design-system work, component and token reading, design-to-code implementation, and
visual validation tied to those designs. Drawing or changing frames follows the
`design` workflow and critiquing them the `review-design` workflow.

- Work only through the Doop MCP. The Doop canvas `Scoops`
  (https://doop.design/c/ams11lLQ8a) is the visual source; follow
  [`documentation/rules/doop-rules.md`](documentation/rules/doop-rules.md) for pages,
  frame names and components.
- Pass an `agent_name` on every Doop call. Read `get_guide` with the topic
  `doop-instructions` once per session, and with the topic `components` before the
  first component change of a task. Confirm with `get_canvas` that the connected
  canvas is `Scoops`; the account may have other canvases.
- Locate pages and frames by name instead of hardcoding IDs.
- Use the canvas's components (`list_components`) and tokens (`get_tokens`), do
  not change existing components without a request, and verify every change by
  capturing the affected frames with `get_frame_screenshot`.
- Draw a dialog as a standalone frame, never as a full page with a backdrop.
- Check frames with `pnpm run check:design` (see
  [`documentation/tooling.md`](documentation/tooling.md)); it reads a saved snapshot,
  not the live canvas.

Before modifying a Doop frame, classify the request as either a visual-only change or a
product-behavior change. A change to actors, permissions, workflow, states, validation,
scope or business outcomes is a product-behavior change.

For a product-behavior change requested outside an active Spec:

1. Pause the frame edit and read the affected module PRD.
2. Identify the current PRD statement, the proposed change and its product
   impact; ask concise product questions for any unresolved behavior.
3. Present the proposed PRD amendment and obtain explicit user approval.
4. Update the PRD first, then reread it before editing the frames.
5. Apply and visually validate the approved frame change.

Do not create or reopen a Spec solely for an out-of-Spec design request. If the
change is later selected for implementation, create the normal issue and Spec from the
updated PRD and the Doop frames; the Spec's Design Contract names the frames. When a
Spec is already active, use its contract amendment workflow instead. Visual-only changes
do not require a PRD amendment, but must remain consistent with the current PRD and
Design documentation.

When implementing a design from the Doop canvas:

1. Read `documentation/design.md` and the applicable UI rules first.
2. Inspect the named frames and the canvas components and tokens through the Doop MCP.
3. Map the frame's values to existing Scoops tokens instead of introducing parallel
   hardcoded colors, spacing, typography, radii, or shadows.
4. Implement the smallest coherent screen or component boundary.
5. Validate the result with the Playwright CLI when the application can be run
   locally.
6. After an approved frame update, treat the affected design as an implementation
   change when production code is in scope: trace the changed frames to their owning
   source paths, update the corresponding UI, routes, behavior and tests in the same
   task, and validate the runtime result against the updated frame. Do not finish with
   only a frame change when the request includes implementation changes. If the frame
   update changes product behavior, use the active Spec amendment and PRD workflow
   before editing production code.

### Context7 MCP

Use Context7 when implementation depends on current documentation for a library,
framework, SDK, API, CLI, or cloud service. This is especially important for
TanStack Start and Router, NestJS, Drizzle, Inngest, Better Auth, Supabase, Resend,
Vite, Nitro, and
other dependencies whose APIs evolve.

Resolve the library identifier with
`mcp__context7__resolve_library_id`, then query the relevant documentation with
`mcp__context7__query_docs`. Ask a narrow question that includes the installed
version or intended API when it matters.

Prefer Context7 over relying on memory or copying an example from another
project. Context7 supplements rather than replaces local evidence: inspect the
installed package version, repository source, configuration, and project rules
before applying documentation examples.

### Playwright CLI

Use the Playwright CLI to validate real browser behavior in `apps/web`, especially
after changes to UI, routes, forms, responsive layouts, accessibility,
authentication, or REST integration. Use the CLI for both automated suites and
interactive/manual scenarios; do not use `browser-use`, CDP workflows or
Playwright MCP instead.

Use accessible role and name locators where possible. Inspect the DOM, final URL,
network requests, console messages, viewport behavior and keyboard paths. For every
UI change where the rendered appearance could be affected, capture a fresh
screenshot with the CLI after the change and inspect it against the applicable
design reference. Repeat this at each relevant implementation or correction
checkpoint; never reuse a pre-change screenshot as evidence. Screenshots support
the behavioral assertions and do not replace them. Non-visual changes do not
require a new screenshot. Mocked transport coverage must not be presented as
evidence that a real authenticated, server-backed flow works.

Automated Playwright tests under `apps/web/tests` must not capture screenshots or
use visual snapshot assertions. The agent may capture screenshots separately
with the Playwright CLI for visual review.

Keep browser artifacts under `apps/web/.playwright-cli/`: page screenshots in
`screenshots/`, page snapshots in `snapshots/`, browser logs and traces in
`logs/`, and authentication state in `states/`. Do not write artifacts to
`apps/web/test-results/` or `apps/web/test-results-evidence/`. In
`apps/web/playwright.config.ts`, place Playwright's `outputDir` and HTML report
under `.playwright-cli/logs/`. Keep CLI-captured screenshots in
`.playwright-cli/screenshots/`.

## CodeGraph MCP

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.

## Inngest local MCP

When the local Inngest Dev Server is running through Docker Compose, use the
project-scoped MCP endpoint configured in `.codex/config.toml`:

```text
http://localhost:8388/mcp
```

Use this MCP to inspect local apps, registered functions, events, runs and
traces, or to send explicitly requested local test events. Confirm that the
server application and the Inngest Dev Server are running before inspecting a
workflow. Use the separate Cloud MCP for deployed environments and explicitly
target the intended environment, such as `staging`; do not send events to a
deployed environment unless the task requests it.

#### Required Playwright CLI validation workflow

1. Identify the services required by the flow. For full-stack behavior, inspect
   `docker compose ps` and verify the relevant health endpoints before running the
   Playwright CLI flow. Default local endpoints are PostgreSQL at
   `postgresql://postgres:postgres@localhost:54322/postgres`, the server at
   `http://localhost:3336`, the web app at `http://localhost:4000`, and Mailpit
   at `http://localhost:54324`.
   For flows using persisted authentication, verify that the local Manager and
   Operator seed accounts exist. If they do not, run
   `pnpm --filter server db:seed` explicitly before
   `pnpm --filter web test:auth:setup`; the seed resets local Auth users and
   application seed data, so Playwright must not invoke it implicitly.
2. Start `pnpm --filter server dev` and `pnpm --filter web dev` in persistent
   terminal sessions when the flow needs both applications. Wait for compilation
   and Nest bootstrap to finish before Playwright assertions.
3. Run the applicable Playwright CLI suite or focused test against the target
   route and capture fresh evidence after each state-changing interaction.
4. Exercise the user-visible behavior with accessible role and name locators
   rather than CSS selectors where possible.
5. Verify both the visible result and the resulting URL, network request, or
   persisted state relevant to the behavior. A successful navigation alone is
   not sufficient evidence for a server-backed flow.
6. Inspect console messages and failed network requests before calling a
   flow successful. Classify console errors, hydration warnings, and HTTP 4xx/5xx
   responses as fixed, pre-existing, or blocking.
7. For UI changes, exercise at least one narrow viewport and a keyboard path.
   Validate theme, focus, loading, empty, and error behavior when those states are
   part of the change.
8. For each appropriate UI change, capture and inspect a fresh screenshot after
   the change, including the relevant desktop or narrow viewport state. Record
   the screenshot path and the comparison result in the applicable evaluation
   evidence.
9. Stop application processes started for the validation. Leave shared Docker
   services running unless the task explicitly requests teardown.

Route or transport mocks are acceptable for isolated tests, but they must not be
presented as evidence that a real authenticated or server-backed integration
works. Use `pnpm --filter web test:integration` for the repository's committed
Playwright test suite.

## Skills

### Third-party skills

The third-party skills pinned in `skills-lock.json` live in `.agents/skills/` (ignored by
Git, with links under `.claude/skills/`) and are restored with `pnpm skills`; change the
set with `pnpm dlx skills add` or `remove`, which update the lock file. Invoke the skill
whose purpose matches the task instead of working from memory; the project workflows under
`documentation/prompts/` and the rules in this file take precedence over a skill's generic
advice.

| Skill               | Use when                                                                                      | Project notes                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `impeccable`        | Designing, critiquing, auditing or refining UI: hierarchy, type, color, layout, copy, motion. | In Doop work, use it through `/design` and `/review-design`; its `critique` runs only through them.     |
| `frontend-design`   | Choosing an aesthetic direction for new UI or a reshaped one.                                 | `documentation/design.md` and the Doop canvas decide; use it only where they leave the direction open.  |
| `accessibility`     | WCAG 2.2 audits and fixes: contrast, keyboard, focus, screen readers.                         | For Doop frames, `pnpm run check:design --rule contrast` covers contrast (it reads a saved snapshot).   |
| `performance`       | Load speed, bundle size, caching and rendering cost.                                          |                                                                                                         |
| `core-web-vitals`   | LCP, INP and CLS problems.                                                                    |                                                                                                         |
| `best-practices`    | Security, compatibility and code-quality review of web code.                                  | Follow the repository Rules first; the skill's generic advice never overrides them.                     |
| `seo`               | Meta tags, structured data, sitemaps and search visibility.                                   |                                                                                                         |
| `web-quality-audit` | A combined audit of performance, accessibility, SEO and best practices.                       |                                                                                                         |
| `playwright-cli`    | Driving a real browser: exploration, inspection, diagnosis and one-off tasks.                 | Follow the Playwright CLI section above for environments, accounts and credentials.                     |
| `gh-cli`            | GitHub operations through `gh`: issues, Pull Requests, CI checks and releases.                | Pull Requests follow the `open-pr` workflow.                                                          |

### Project workflow skills

The project's own workflows are the prompts in `documentation/prompts/`. They are the only
source: `node ./scripts/sync-commands.mjs` (`pnpm sync:commands`) turns each prompt into a
skill (`.agents/skills/<name>/SKILL.md`) and a slash command (`.claude/commands`,
`.cursor/commands`, `.opencode/commands`), where `<name>` is the file name without a
trailing `-prompt`. The agent definitions in `documentation/agents/*-agent.md` become
subagents through `scripts/sync-agents.mjs` (`pnpm sync:agents`); `pnpm sync` runs both.

- Edit the prompt or agent definition and re-run the sync; never edit the generated files,
  which are ignored by Git and overwritten on the next sync.
- Every prompt needs a one-line `description` in its frontmatter; the script fails without
  it, and it is what makes the skill discoverable. The skill name comes from the file name,
  not from a `name` field. An agent definition needs a `name` equal to its file name.
- When a task matches a workflow below, invoke that skill instead of working from memory.
  These workflows take precedence over the third-party skills above;
  [SDD Workflow](documentation/sdd.md) defines how the SDD ones chain together.
- A workflow that is missing for a recurring task is a gap: ask before adding a prompt.

| Group         | Skills                                                                                 | Use when                                                                       |
| ------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Issues        | `open-feat-issue`, `open-bug-issue`, `open-refactor-issue`                             | Opening a scoped GitHub issue from a requirement, failure or technical debt.   |
| PRD           | `create-prd`                                                                           | Researching, creating or refining a module PRD.                                |
| Design        | `design`, `review-design`                                                              | Drawing the Doop frames a PRD needs, or critiquing existing frames.            |
| SDD delivery  | `interview`, `create-spec`, `implement-spec`, `conclude-spec`                          | Specifying, implementing and closing a feature delivery.                       |
| Bugs          | `create-bug-report`                                                                    | Diagnosing a GitHub bug issue into an evidence-based report.                   |
| Git and PRs   | `commit`, `open-pr`, `resolve-pr-feedback`, `open-release-pr`                          | Committing, publishing a PR, resolving review feedback and releasing.          |
| Tests         | `increase-test-coverage`                                                               | Raising coverage with behavior-focused tests without weakening baselines.      |

The table groups the prompts for orientation; `documentation/prompts/` is the complete and
current list. Skill names are the file names without the `-prompt` suffix.

## Required reading

Repository documentation is architectural intent. Read the documents selected
below before implementation rather than reconstructing the intended design from
code alone.

### 1. [`documentation/rules.md`](documentation/rules.md) — always

This is the dynamic rule router for the repository.

- Read it before selecting task-specific rules.
- Match both the paths being changed and the behavior affected.
- Read every selected rule document in full.
- Repeat discovery if implementation expands into another layer.

Do not load every rule by default, and do not select rules from request wording
alone.

### 2. [`documentation/architecture.md`](documentation/architecture.md) — architecture, domain, or integrations

Read this before changing system layers, persistence strategy, authentication,
asynchronous processing, runtime technology, or external integrations.

### 3. [`documentation/modules.md`](documentation/modules.md) — module ownership

Read this before changing business capabilities, module ownership, cross-module
contracts, domain events, or feature placement. Keep Identity, Billing, MRP, PDV,
and Communication responsibilities inside their owning boundaries. Shared
infrastructure may support modules but must not absorb their business rules.

### 4. Module PRDs under [`documentation/prds`](documentation/prds) — product behavior

Read the PRD owned by the affected module before changing outcomes, actors,
capabilities, experience, user journeys, permissions, validation, product
dependencies, or other product-facing behavior:

- `identity.md` for establishments, users, access, and onboarding;
- `billing.md` for plans, trials, subscriptions, and charges;
- `mrp.md` for catalog, stock, recipes, and production;
- `pdv.md` for sales channels, carts, orders, and POS behavior;
- `communication.md` for email and in-product notifications.

If implementation changes a business rule, update the corresponding PRD in the
same task so product intent and code remain aligned.

PRDs do not record delivery state. Delivery is tracked by Spec and Evaluation evidence.

### 5. [`documentation/design.md`](documentation/design.md) — UI work

Read this before changing UI, styling, layouts, or reusable components. Use the
documented tokens and existing CSS variables. Do not introduce arbitrary colors,
fonts, spacing, radii, or shadows when the design system already defines the
value.

Validate responsive behavior, contrast, focus visibility, reduced motion, and
other accessibility expectations relevant to the change.

### 6. [`documentation/tooling.md`](documentation/tooling.md) — commands and configuration

Read this before installing dependencies, running unfamiliar commands, or
changing `package.json`, `turbo.json`, `biome.json`, TypeScript configuration,
test configuration, Docker Compose, Drizzle, or Inngest setup.

Use pnpm and workspace `--filter` commands. Do not copy package names, scripts,
CI configuration, deployment secrets, or environment names from another project.

## Worktree and environment safety

- Never commit `.env` files or credentials. Keep `.env.example` templates free of
  real secrets.
- When creating another worktree, copy only ignored, untracked local environment
  files that are needed there. Do not copy tracked `.env.example` templates as if
  they were secrets.
- Do not delete Docker volumes, reset databases, remove migrations, or tear down
  shared services unless the user explicitly requests that destructive action.
- Stop persistent development processes started for a task when validation is
  complete, unless the user asks to leave them running.

## User communication

Every reply, question, design section and report written for the user follows
the same plain style, in the user's language:

- Lead with the answer or conclusion, then give the supporting detail.
- Use short sentences with one idea each; avoid chaining clauses with
  semicolons, dashes and parentheses.
- Mention file paths, symbols and commands only where they help locate
  something; describe the idea otherwise.
- Write natural language without untranslated jargon or literal calques; define
  an unavoidable technical term in a few words.
- When referring to an earlier decision, check or identifier, restate in a few
  words what it means.
- Send only what changed instead of repeating long blocks, except where a
  workflow explicitly requires a full re-ask.
