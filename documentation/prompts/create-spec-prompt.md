---
name: create-spec
description: Create or refine an implementation-ready feature Spec from a PRD, GitHub Issue, report, reference, or direct request, grounded in repository rules and real code paths.
---

# Create a Spec

Create or revise one implementation-ready feature Spec in the current task. Do not create
another user-owned task. Use a direct maintenance workflow when the requested work does not
need a feature Contract.

## Workflow

Follow these stages in order. Research may precede clarification; writing or modifying
`spec.md` may not. The clarification gate is a hard stop, not a documentation step: never
create a draft Spec or other contract artifact and then ask the user
to resolve a material product or technical choice that the artifact already encodes. Research
outputs such as notes may be saved when needed, but the feature
Spec remains unwritten until the gate passes.

### 1. Establish repository authority

1. Read the root and applicable nested `AGENTS.md` files.
2. Read `documentation/rules.md`, select Rules from affected paths and behavior, and read
   every selected Rule in full.
3. Read the actual source request and the applicable Architecture, Modules, PRD, Design and
   Tooling documents.
4. Inspect the worktree and preserve unrelated or user-owned changes.

Repository authority overrides generic workflow assumptions. Use actual repository paths,
commands, versions, terminology and source systems. Never invent tickets, migrations,
framework conventions or validation categories.

When a PRD is authoritative, consume each applicable `PRQ-*` through its `Outcome`, `Actors`,
`Consumes`, `Provides`, `Capabilities` and `Experience`. The PRD does not own Acceptance
Criteria or User Stories: derive the Spec's `FR-*` and `AC-*` contract from those requirement
fields instead of expecting, reconstructing or requesting duplicate PRD sections. Use User
Journeys as cross-`PRQ-*` scenario context. Treat the Product Dependency Graph as product
capability and authoritative-fact dependency evidence only, never as implementation order,
foundation work, agent execution order.

PRDs do not record delivery state; Spec scope comes from the applicable requirements only.

### 2. Classify and research

Record the real source as `prd`, `issue`, `report` or `direct-request`. Choose depth from
delivery risk, not file or endpoint counts:

| Mode | Use when |
| --- | --- |
| `compact` | One cohesive outcome, stable dependencies, limited ownership and low delivery risk. |
| `complete` | Multiple applications or layers, persistence/integration changes, several UI states, or material security, concurrency, migration or operational risk. |

#### Direct repository research

The Orchestrator owns consequential decisions and verifies repository facts. Research runs
in lanes, one per affected app or package (`apps/web`, `apps/server`, `packages/core`,
`packages/validation`, `packages/email`). In `complete` mode, delegate every lane to its own
read-only [Spec Researcher](../agents/spec-researcher-agent.md), launched in parallel with a
specific lane name; in `compact` mode, research directly or delegate at your discretion.
Give each Researcher the source, its workspace and modules, the depth mode, the Rules
selected for that workspace and the cross-workspace edges it should check. Reconcile every
Researcher result before clarification: verify each fact a question relies on, resolve
conflicting edge contracts between lanes, and merge the proposed file trees. Resume the same
Researcher for follow-up facts about its workspace.

Inspect every affected boundary for:

- current paths, declarations, exports, registration, configuration and generated files;
- current control/data flow, reusable contracts and the exact technical gap;
- contracts crossing packages, applications, providers or persistence;
- established implementation and testing patterns to reuse;
- installed versions and current library documentation when APIs evolve;
- security, tenancy, concurrency, transactions, side effects, failures, SSR/hydration,
  migration and rollout risk.

Treat documentation as intent when it conflicts with code. Surface the discrepancy and
record any intentional deviation from supplied references.

### 3. Clarify product and technical choices

After research and the verification pass, and before creating or modifying
`spec.md`, identify every unresolved choice that could materially alter the
Contract.

#### Grilling protocol

Map unresolved choices as a design tree: every decision branches into decisions that depend on
it. Work the tree in rounds:

- The frontier is every decision whose prerequisites are already settled.
- Keep one monotonically increasing question sequence across all rounds; never restart numbering.
- Ask the frontier in small batches of at most five questions per message, ordered by dependency
  and impact, and carry the rest of the frontier into the next batch. Number each question and
  give repository evidence, at least two materially different lettered options (`A`, `B`, `C`,
  plus `Something else` when useful) with a one-line consequence each, exactly one marked
  recommendation with a short reason, and the consequence of accepting it. Short answers such as
  `1A, 2B` must be possible. When a choice depends on an earlier answer, defer it instead of
  embedding a speculative default.
- When the user asks for a clearer explanation, re-ask the same question number in plain
  language with a concrete walkthrough of what each choice means in practice before requesting
  the answer again.
- Use this format for every round:

  ```yaml
  ❓ **Q1** - **<question title>**: <question body with repository evidence>
  - **A.** <option> — <one-line consequence>
  - **B.** <option> — <one-line consequence>
  - **C.** Something else.

  ➡️ **<letter>**: <short reason>

  ---

  ❓ **Q2** - **<question title>**: <question body>
  - **A.** <option> — <one-line consequence>
  - **B.** <option> — <one-line consequence>

  ➡️ **<letter>**: <short reason>
  ```

- Wait for the user's answers before recomputing the next frontier.
- Maintain a decision ledger after every answer round. Reconcile each answer to its question,
  record accepted recommendations and explicit alternatives, call out contradictions, and carry
  only unanswered or newly unlocked choices into the next frontier. Do not silently interpret a
  partial answer as acceptance of every recommendation.
- When the client supplies response annotations, treat an annotation such as `ok`, `accepted` or
  an equivalent confirmation as acceptance of that selected question's recommendation. Treat an
  annotation naming an alternative as selection of that alternative. A later explicit annotation
  overrides an earlier unannotated selection of the same question. Repeated selections without a
  comment provide context but do not override an explicit annotated answer. Address every supplied
  annotation using the client-required inline annotation directive in the next response.
- Research repository facts directly; do not ask the user for facts that can be inspected.
- Verify every repository fact a question relies on before asking it. When later research,
  review or the user shows that an answered question rested on a wrong or incomplete fact,
  re-ask that same question number with the corrected evidence and options before changing the
  Contract; never silently reword the Spec to fit the corrected fact.
- Keep product, technical, design and validation decisions with the user unless repository
  authority already fixes them. Record decisions, dependencies and assumptions.
- Challenge contradictions and risks. When the frontier is empty, present the shared
  understanding, including the expected file tree described below, and request explicit
  confirmation before authoring or amending `spec.md`.
- The shared understanding must show one expected file tree per affected app/package and for
  the documentation/design artifacts. Verify existing paths against the current checkout,
  mark each entry `[create]`, `[modify]`, `[move]`, `[generate]` or `[remove]` with a short note
  on the change, and label proposed internal names as adjustable under the Rules. This tree
  becomes the Spec's Path map, so list every file the delivery will touch, tests included.

#### Source scope guard

The source Issue, `PRQ-*` selection, report or direct request fixes the Spec's scope. Research
and clarification often expose adjacent work: a related defect, a contradictory rule, an
unimplemented requirement or a broader redesign. Do not grow the Spec to absorb it by default.

- Classify each discovered item as **in source scope**, **required to deliver the source safely**
  (no source outcome can be met without it) or **adjacent**. Only the first two belong in the
  Spec without asking.
- For an adjacent item, ask one question that names the original source scope, explains why the
  item is outside it and offers at least: record it as an exclusion; track it in a separate Issue
  or Spec; or absorb it into this Spec. Recommend the exclusion or separate tracking unless the
  source outcome depends on the item.
- Do not change PRDs, Issues, design files or other authorities for adjacent work until the user
  explicitly chooses to absorb it in this conversation.
- When the user absorbs adjacent work, restate the resulting scope against the original source
  in the next shared understanding, and show the added FRs, authorities and artifacts separately,
  so scope drift stays visible before authoring.
- When the user later narrows the scope again, remove every absorbed artifact: Spec sections,
  design references, PRD, Issue and Doop frame changes. Record the withdrawn items only as
  exclusions and in the revision history.

#### Exhaustive questionnaire mode

When the user asks to decide, question or approve **every technical decision**, make the grilling
protocol exhaustive rather than collapsing several decisions into a generic architecture choice.
Research first, then continue dependency-ordered rounds until every consequential
implementation-shaping alternative is settled. Cover each applicable branch below:

- owning module, application, layer, declaration and composition boundary;
- technology, protocol, dependency and provider/client abstraction;
- API route, method, authentication, authorization lifetime, payload, serialization, validation,
  versioning and compatibility;
- source of truth, transaction/commit boundary, persistence model, migration generation,
  indexing, tenancy and historical-value behavior;
- synchronous/asynchronous flow, publication timing, delivery guarantee, idempotency,
  deduplication, ordering, concurrency, buffering, backpressure and capacity limits;
- connection/subscription lifecycle, retries, timeouts, heartbeat, reconnect, offline/hidden
  behavior, replay and cleanup;
- multi-process, multi-tab, multi-device or multi-tenant coordination and degraded fallbacks;
- UI state ownership, component/widget boundaries, interaction semantics, exact copy/timing,
  focus, keyboard, announcement, responsive behavior, stacking and design-reference gaps;
- error translation, user-visible failure behavior, observability, privacy and secret handling;
- automated test ownership, indirect versus direct boundaries, manual fixtures/services,
  viewports, screenshots and evidence targets.

Ask about exact operational values when they affect the Contract—for example duration, retry
schedule, heartbeat interval, connection cap, queue size, viewport or concurrency limit. Continue
from broad prerequisites to their dependent concrete choices: selecting SSE, for example, may
unlock route, authentication, payload, heartbeat, reconnection, authorization-lifetime,
backpressure and browser-ownership decisions.

Exhaustive does not mean asking the user to restate repository facts or approve conventions with
only one legal answer. Resolve those directly from authority and include them in the final shared
understanding. Do not ask about incidental implementation syntax or algorithms that cannot alter
observable behavior, architecture, ownership, operability, security, validation or the Builder's
contract.

Before declaring the frontier empty in exhaustive mode:

1. replay the decision ledger against every affected runtime boundary and Rule-selected layer;
2. inspect the chosen combination for newly exposed decisions and contradictions;
3. state any authority correction or design artifact required before authoring;
4. present one consolidated shared-understanding summary containing the resolved product,
   technical, design and validation decisions and the expected file tree for each affected
   app/package; and
5. request explicit confirmation. A typo-tolerant unambiguous confirmation such as `confirmed`
   or `comfirmed` passes this final gate.

Do not create or modify the Spec before that confirmation. After confirmation, apply approved
authority changes first, create the artifacts, run integrity checks and the applicable independent
Spec review. If authoring or review exposes a genuinely material unasked choice, return to the
questionnaire with the next question number; otherwise resolve repository-fixed compatibility
corrections directly and resume the same Reviewer.

| Area | Clarify when unresolved |
| --- | --- |
| Product | Actors, permissions, success/rejection behavior, states, scope and deferrals. |
| Technical | Ownership, technologies, dependencies, APIs, transactions, concurrency, failure semantics, integrations and runtime constraints. |
| Design | Authoritative frames/states, responsive behavior, missing references and allowed deviations. |
| Validation | Automated boundaries, manual flows, services, accounts/data, viewports and evidence. |

When screenshot analysis reveals a feature, state or behavior that is not explicit in the
request, PRD or existing authoritative documentation, ask a clarifying question before
writing the Spec. This includes inferred actions, permission boundaries, read-only versus
editable fields, session/device controls, deletion or destructive controls, status badges,
workflow transitions, empty/loading/error behavior, role-specific differences, and any
element whose presence suggests product behavior rather than decoration. Do not silently
promote an inferred screenshot detail into an FR, AC, API, route or implementation scope.

Each screenshot-derived clarification must include:

- the screenshot path and exact visible element/state that triggered the question;
- the current request/PRD statement, or an explicit note that no authoritative statement
  exists;
- the proposed interpretation and at least one materially different alternative;
- the recommended answer and the impact on product scope, permissions, technical boundaries
  and validation if accepted;
- whether the screenshot detail is required behavior, visual-only treatment, intentionally
  excluded scope or an unresolved ambiguity.

During initial Spec creation, if the user cannot resolve the question or has not answered,
stop and return the question with its evidence, recommendation, alternatives and impact; do
not write `spec.md` or encode the unresolved choice in a draft. The `draft` status is for an
existing Spec under active authoring/amendment, or for a user-explicitly accepted documented
assumption—not a reason to ask a material question after creating the artifact. If repository
authority already resolves the choice, cite that authority and record the interpretation
without asking the user to re-decide an established contract.

Resolve a choice from repository authority when one safe answer is already established.
Otherwise ask the user concise questions. For each material question, provide repository
evidence, a recommendation, alternatives and impact. Do not ask the user to decide facts
already fixed by authoritative documents or established code.

Write only after every material ambiguity is answered or the user explicitly accepts a
documented assumption. Before the first write, perform a final ambiguity scan across the
request, PRD, issue, screenshots, routes, permissions, validation states, API fields and
technical ownership; if any material choice remains, ask it now and end the turn.

#### Authority changes

When the Spec requires an authoritative document to change:

1. identify the current statement, evidence, proposed change and affected scope;
2. obtain explicit user approval for product behavior, global Rules, architecture,
   ownership or another normative change;
3. update the PRD, Rule, Architecture, Modules, Design or Tooling document first;
4. reread the updated authority and recompute the Rule Pack before writing the Spec.

Feature-specific behavior and choices belong in the Spec. Reusable conventions belong in
their authoritative document. If implementation exposes a missing or easily misapplied
reusable Rule, add a focused `## Antipatterns to Avoid` entry stating the prohibited
pattern, required alternative and validating proof. Record the authority change in the
Spec, reread the Rule and rebuild the Rule Pack.

### 4. Create the artifacts

Create `documentation/features/<domain>/<feature>/spec.md` using short kebab-case names.
For a distinct change to a concluded feature, use
`documentation/features/<domain>/<feature>/changes/<change-name>/spec.md`.
Record the Design Contract in `spec.md` when UI is design-backed. Evaluation starts
at implementation kickoff and owns actual results, findings, unfinished ACs and the short
continuation handoff. Do not create a Plan; `plan-spec` creates it once the Spec is `open`.

```yaml
---
title: <title>
status: draft
revision: 1
source:
  type: <prd|issue|report|direct-request>
  ref: <actual-url|path|codex-task>
scope:
  - <affected workspace or module boundary>
last_updated_at: YYYY-MM-DD
---
```

Use `draft` while authoring or materially amending the contract, `open` when implementation
ready, `in_progress` during implementation or conclusion, and `completed` only after final
PR CI and delivery closure. Findings do not add Spec statuses.

## Required Spec structure

Keep these five sections, scaling detail to risk and omitting irrelevant subsections.
State facts once and reference their IDs elsewhere. Specs own the expected contract;
the agent chooses execution order, decomposition, delegation and routine internal structure.

### 1. Context and scope

State the objective, actual source, compact/complete depth, current behavior, product gap,
included behavior, exclusions, accepted assumptions and resolved product decisions.
Map applicable PRQ IDs or source statements to `full`, `partial` or `deferred` coverage.
Partial delivery never weakens the PRD.

### 2. Behavior Contract

Define observable requirements as `FR-*`. Keep internal paths and algorithms out of them.
When the authoritative PRD/source defines `PRQ-*` requirements, map every FR to one or more
real `PRQ-*` identifiers; do not invent requirement IDs. If no PRQ taxonomy exists, map each FR
to the actual source statement or Issue acceptance instead. Show the mapping directly in the FR
table or an adjacent FR-to-PRQ/source traceability table.

For every applicable PRD `PRQ-*`, derive the FR and AC set from the complete requirement
contract:

- `Outcome` defines the user or business result the Spec must deliver;
- `Actors` define initiators, autonomous triggers and applicable authorization perspectives;
- `Consumes` and `Provides` define product capability or authoritative-fact boundaries and
  cross-requirement/module obligations, not implementation dependencies or delivery order;
- `Capabilities` define observable behavior, validation, limits, transitions, consistency,
  history and exceptions;
- `Experience` defines user-visible interaction, feedback, states, responsiveness and
  accessibility when present.

Do not reduce a requirement to only its Capabilities or Experience bullets. Synthesize FRs from
the six fields, then derive Spec-owned `AC-*` criteria that prove those FRs. Use PRD User
Journeys to identify end-to-end and alternate scenarios spanning one or more requirements and
to inform AC/MV coverage without copying journeys into a second requirement system. Do not
look for PRD Acceptance Criteria or User Stories; their absence is intentional.

Use a requirements table when there is more than one requirement:

| ID | PRQ/source coverage | Required behavior |
| --- | --- | --- |
| `FR-01` | `<real PRQ-* IDs or source anchor>` | `<observable behavior and applicable restrictions>` |

Map every requirement to acceptance evidence using this required table. Every AC must link to
one or more FRs, and every FR must link to one or more ACs; do not leave either direction
implicit:

| ID | FR coverage | Requirement | Given | When | Then | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-01` | `FR-01` | `<observable criterion>` | `<precondition>` | `<action>` | `<observable result>` | `<test boundary and/or MV-01>` |

Cover applicable success, rejection, authorization, tenant isolation, concurrency,
provider failure, session/hydration restoration, accessibility, performance and secret
boundaries. Every FR must have acceptance evidence. `MV-*` identifies a manual scenario;
it is not another requirement system.

Add **Cross-cutting restrictions** only when needed. Use a `Concern | Contract` table when
several restrictions apply.

#### Design Contract — conditional

For design-backed UI, the design source is the Doop canvas `Scoops`. Define the Design
Contract in `spec.md`: do not create a design handoff file or save design screenshots. Name
every frame by page and frame name as `documentation/rules/doop-rules.md` defines, and record
the required frames and states, exact viewports, responsive behavior, implementation
surfaces and allowed deviations. Record each frame's Doop `updatedAt` as provenance; a frame
that changes after the Spec is a Design Contract change.

Builders and the Visual Reviewer read the named frames, components and tokens through the
Doop MCP, read-only, and use the Playwright CLI for browser interaction and fresh runtime
captures. They never edit the canvas. The Spec creator reads the frames the same way and
uses `/design` when the canvas lacks a state the Spec needs. If a required detail is
missing from the frames, treat it as a Design Contract gap and resolve it before handing the
surface to implementation.

#### Mandatory frame analysis and coverage proposal

The Spec creator must visually inspect every referenced frame (`get_frame_screenshot`,
`get_frame` and `inspect_frame`) before writing the Design Contract. Frame names, dimensions,
exported HTML or a textual description are not substitutes for seeing the frame. Never infer
exact measurements from a screenshot; read the frame's actual properties and the existing
source, and never invent tokens. For each frame, record an implementation-facing inventory
covering:

- exact viewport and visible route/surface/state;
- page regions, containers, columns, cards, rows, controls, icons and status indicators;
- visible copy, labels, actions, read-only/disabled/selected/error/loading states;
- hierarchy, alignment, spacing relationships, dimensions, typography, color tokens,
  borders, radii, shadows and responsive implications;
- differences between the frame's values and existing component defaults, with
  repository-governed mappings and approved deviations clearly distinguished;
- elements intentionally absent, ambiguous, or likely to be confused with adjacent scope;
- the FR/AC criteria and implementation surface that the frame must validate.

Keep the inventory in a concise table in the Design Contract:

| Frame (page / name) | Route/surface/state | Viewport | Required visible inventory | Interaction/state coverage | Ambiguities or exclusions | Tokens/components | Validation target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `<page / frame name>` | `<route and state>` | `<width × height>` | `<elements and hierarchy>` | `<controls/states>` | `<explicit notes>` | `<mapped primitives>` | `<AC/MV/validation-artifact identifier>` |

After reviewing the frames, the Spec creator must decide whether additional frames are
necessary. Suggest them whenever the canvas leaves a material gap, including missing
loading, error, empty, success, disabled, dialog, dropdown, permission, role, tenant, mobile
or breakpoint states. Each suggestion must state:

- the proposed route/surface/state and role or fixture;
- the exact viewport;
- why the existing frames are insufficient;
- the FR/AC/MV criteria it would clarify;
- whether it is **required before implementation** or **recommended supplemental coverage**.

Required missing frames must be drawn with `/design` before the Spec becomes `open`, or the
user must explicitly accept a documented visual assumption. Recommended frames may be
deferred only when the Design Contract records the deferral, rationale and planned
validation state. Define responsive behavior when a required viewport has no frame. Every
frame and state needs a planned implementation comparison and evidence target.

### 3. Technical Contract

Organize this section by affected Scoops workspace, then its actual technical layers.
Omit unchanged workspaces and layers instead of adding “No changes” sections. Preserve an
unchanged dependency or integration guarantee briefly within the affected layer that consumes
it. Describe ownership, existing integration surfaces and proposed runtime/data flow.

Use the applicable workspace/layer structure:

| Workspace | Layer sections when affected |
| --- | --- |
| `packages/core` | Domain (Entities, Structures, Errors, Events); Use cases; Interfaces |
| `packages/validation` | Shared schemas and their consumers |
| `packages/email` | Templates/rendering only when changed |
| `apps/server` | REST; Database; Messaging; Provision |
| `apps/web` | UI; Routes; REST; Provision |

Errors and events belong under Domain. Business rules are implemented exclusively in owning
Core use-case classes; do not create a separate Business rules layer or put executable rules
in entities/structures. Keep a cross-layer flow and consequential decision table when useful.

Within each affected layer, provide source-backed detail proportional to risk:

- show an expected file tree where it clarifies the layer; every changed file also goes in the
  Path map described below;
- verify existing paths and label proposed files explicitly;
- document applicable physical database tables, fields, types, relations, tenant scope,
  constraints/indexes, changed versus preserved data, mappings and migration semantics;
- include illustrative Core TypeScript snippets where they clarify changed data contracts,
  use-case decisions or orchestration. Base them on actual repository types/signatures and
  mark partial snippets; do not invent entity classes, SDK APIs or implemented behavior;
- explain affected UI state, request/cache flow, permissions, error recovery and accessibility,
  rather than relying only on file trees or screenshots.

These are expected changes, not completed implementation. A reused interface may expose changed
underlying data types without requiring an artificial edit to its declaration. Do not manufacture
file changes just to fill a table.

#### Path map

Every Spec that changes repository files has a required `### Path map` in its Technical
Contract, one table per affected app or package, using the
[Spec template](../templates/sdd/spec.md) columns `Path | Change | Serves | Purpose`. It is
the machine-readable contract that [`plan-spec`](./plan-spec-prompt.md) derives Plan rows from
and that `pnpm check:spec-implementation` checks against Git:

- list every file the delivery creates, modifies, generates or removes, including tests,
  fixtures, `.rest` examples, migrations and documentation the delivery owns;
- write each path exact and repository-relative in backticks, with no placeholders or
  wildcards, and give each path one row;
- use only `Create`, `Modify`, `Generate` or `Remove` as plain text in `Change`. A move is a
  `Remove` row for the source plus a `Create` row for the destination;
- for generated files whose names the generator assigns, such as migration SQL and snapshots,
  run the generation command during authoring when it is safe and record the real names;
  otherwise list the stable generated files (for example the journal) and say in `Purpose`
  that the generator adds the new file, then add its row through a Path map correction once
  it exists;
- fill `Serves` with every `FR-*`/`AC-*` the path delivers; every row has at least one.

Proposed internal names stay adjustable under the Rules. When implementation renames, adds or
drops an internal file without changing the Contract, correct the Path map row in the same
revision, record it as a non-material correction in the revision history and re-run
`plan-spec` to reconcile the Plan. That correction needs no amendment or Spec Reviewer pass. Show approved provider-directory organization when applicable without turning
an unrelated existing provider layout into a mandatory refactor.

Include applicable contracts:

- public routes, methods, authentication/authorization, request/response schemas, status and
  error semantics, compatibility and affected consumers;
- shared exported interfaces, events and provider boundaries, producer/consumer obligations,
  serialization and side-effect timing;
- authoritative data, tenant scoping, transaction boundaries, relevant fields, indexes and
  constraints, migration generation/delivery, historical data and rollout risks;
- consequential concurrency, idempotency, retries, timeouts, lifecycle and degraded behavior;
- required UI states, browser/SSR boundaries, responsive and accessibility guarantees;
- generated artifacts, authoritative inputs and generation commands where affected.

Give exact details where compatibility or correctness depends on them. Public names,
payload fields and required migration/artifact locations may be contracts. New internal
paths, private signatures, widget trees and hook names remain agent decisions governed by
Rules, and task ownership and order belong to the Plan. Keep trees and the Path map to files the delivery actually
changes; do not inventory unchanged schemas or duplicate wiring. The exact name of a future
private file is not a material ambiguity: propose it in the Path map and correct it later if
needed.

Record only consequential choices with credible alternatives:

| Decision | Chosen approach | Alternative | Reason and accepted trade-off |
| --- | --- | --- | --- |
| `<decision>` | `<approach>` | `<real alternative>` | `<reason, cost or limitation>` |

Omit this table when authority fixes the approach. Unresolved material decisions return to
clarification rather than becoming defaults.

### 4. Verification Contract

Make every AC checkable through a concrete allowed automated boundary and/or executable
manual checker, prerequisites, observable assertion and evidence destination. Name existing
suites/files when known. New checkers may be specified by allowed ownership boundary and
scenario without inventing future filenames; the implementing agent adds actual tests.

| Acceptance | Checker and boundary | Expected assertion | Evidence target |
| --- | --- | --- | --- |
| `AC-01` | `<existing suite, permitted consumer boundary or MV-01>` | `<observable result and side effect>` | `evaluation.md` |

Cover applicable success, rejection, authorization/tenant boundaries, persistence/provider
effects, failures and UI recovery. Tests assert behavior rather than mirrored implementation.
Direct tests for `indirect` or `excluded` sources are forbidden; name the allowed consumer
boundary instead. Respect actual coverage policy and thresholds.

For changed business rules or correctness-critical logic in eligible Core use cases, require
targeted Stryker mutation checks. Define use-case scope, mapped ACs, the exact command and
semantic pass conditions, including how surviving, uncovered and equivalent mutants will be
assessed. Use Tooling's changed-file selection or explicit package-relative `--files`; require
an explicit scope when shared test/configuration changes make automatic selection insufficient.
Targets must be direct files matching `src/**/use-cases/*-use-case.ts`; supporting helpers,
entities, structures, events, errors, interfaces and shared code are consumed by tests but are
not mutation targets. Do not add Web or Server mutation obligations. Core CI separately runs
`--all` across four shards covering every eligible Core use case and publishes reports.
Core CI measures the PR candidate and target branch in the same run and compares
their merged reports, counting timeouts as detected and uncovered mutants as
undetected. It requires at least 70% for Analytics, Communication, Identity, MRP and
PDV, for each new eligible use-case source file in those modules and for each changed
file that was at or above 70%. A module or changed file already below 70% must not
drop, and every unchanged eligible use-case file in those modules must preserve or
improve its exact target-branch score, without rounding or an allowed decrease.
Billing's module and per-file thresholds are temporarily suspended until related
tests make its mutants scoreable. Missing, invalid or incomplete reports, missing
unchanged-file baselines and unscoreable included modules fail closed. A file that is
N/A on both revisions remains N/A; when only one revision has a score, the candidate
must meet 70%. CI execution success alone does not satisfy a Spec's
semantic acceptance conditions.
Keep expected scope and pass conditions here; actual results and justified dispositions belong
in Evaluation's `EV-*` evidence and `FND-*` findings. Mutation checks supplement behavior tests
and integration proof and must respect existing test-ownership boundaries.

For each `MV-*`, specify mapped ACs, services/health checks, accounts/data, starting route and
state, viewport, numbered actions and keyboard path, visible result, final URL and relevant
network/persisted effect, console/failed-request checks, evidence and cleanup. Keep mocked
transport distinct from real authenticated/server-backed proof.

| Command | Purpose and prerequisites |
| --- | --- |
| `<real command from Tooling or package scripts>` | `<affected boundary and services>` |

List applicable code/type/architecture/test-integrity, coverage, build and integration checks
for affected workspaces. Include REST-client route/example parity when HTTP routes change.
Use Playwright CLI for browser flows, narrow viewport and keyboard coverage, fresh screenshots
and comparison with every Doop frame in the Design Contract. Runtime captures belong in ignored
`test-results/` or CI artifacts; record paths/results in Evaluation.

Run applicable integration suites after the candidate is integrated. Correct failures and
rerun affected checks until passing; the Spec does not choreograph attempts. Require an
independent Visual Reviewer only when requested by the user or contract, after current
captures exist. Name references/states/viewports; the Orchestrator owns official EV evidence.

### 5. Documentation alignment and revision history

Record governing authorities and the selected Rule Pack with their scope. Record material
contract revisions, dates and reasons; omit implementation attempts and test results.

| Authority | Applies to | Alignment |
| --- | --- | --- |
| `<actual PRD, Rule, Architecture, Modules, Design or Tooling path>` | `<concern>` | `<confirmed or approved change>` |

| Revision | Date | Material change and reason |
| --- | --- | --- |
| `1` | `YYYY-MM-DD` | `<source decision>` |

## Independent Spec review

Before changing any draft Spec to `open`, activate one read-only
[Spec Reviewer](../agents/spec-reviewer-agent.md) for the whole contract. Repeat review for
material amendments. Supply the draft revision, Architecture/Modules, selected Rule Pack,
existing boundaries, public contracts, consequential decisions, test-integrity policy,
assumptions and exclusions.

The Reviewer audits Architecture, ownership, dependency direction, public boundaries,
generated artifacts and Rules, including permitted checker ownership. It does not require
invented internal paths, Plans, implementation results or runtime evidence. It does not assess
product completeness or design fidelity, edit files, choose behavior or decide Spec status.

Verify findings against authority, resolve verified blockers, and resume the same Reviewer
for affected corrections. Newly exposed material ambiguity returns to clarification.
The Orchestrator owns the opening decision; review is part of authoring, not an extra
user-facing approval stage.

## Integrity gate and handoff

Before setting the Spec to `open`, verify:

- source, metadata, status and revision agree;
- applicable PRQ Outcome, Actors, Consumes, Provides, Capabilities and Experience have FR/AC
  coverage, with User Journeys informing end-to-end and alternate scenarios;
- every FR has AC coverage and every AC has a concrete checker;
- material ambiguities and authority changes are resolved;
- public boundary/data/migration contracts and consequential decisions are precise, while
  routine internal structure remains agent-owned;
- the Doop frames in the Design Contract exist, were visually inspected, cover required
  states/viewports and map to acceptance checks; required missing design information is
  resolved;
- every Spec section, reference and authority change traces to the source scope or to a
  user-approved absorption recorded in the decision ledger;
- commands/prerequisites are real, checker ownership follows Rules, and mocked evidence
  cannot be mistaken for real integration proof;
- authority links, tables and artifact structure are valid;
- the Path map lists every expected changed file with an exact path, a valid `Change` and at
  least one existing `FR-*`/`AC-*` in `Serves`, and every `AC-*` is reachable through a row or
  stated as verified against existing behavior;
- the current draft passed independent compatibility review with verified blockers resolved.

Return the clickable Spec path, revision/status, outcome and exclusions, important decisions,
design/checker coverage and accepted risks. The next workflow is
[`plan-spec`](./plan-spec-prompt.md), then `implement-spec`. Write this
handoff following the user-facing communication rules below.

## User-facing communication

Progress updates, decision ledgers, review results and the final handoff are read by a person,
not parsed by a tool. Write them as fluid, readable prose:

- lead with the outcome in one sentence, then explain what changed and why in short, connected
  paragraphs;
- use lists or tables only for genuinely list-shaped content, such as options, decision ledgers,
  file trees, findings or ordered steps; do not stack terse fragments, arrows or semicolon chains;
- introduce internal identifiers (FR/AC IDs, node IDs, symbols) with a plain description of what
  they are, and avoid unexplained jargon;
- separate what is done, what is open and what the user must do next, and end with one clear
  call to action when one is needed (for example, running `/design` for a missing frame);
- keep grilling questions in the lettered format required by the grilling protocol; these rules
  govern the surrounding explanation, not the question structure.

## Material amendments

Before conclusion, amend the same Spec: set `draft`, increment revision, clarify material
choices, update approved authority first, refresh affected contracts/design/checkers and
mark affected evidence historical. Repeat authoring integrity and independent Spec review,
then return to `open` for autonomous implementation and integrated verification.
Evidence unaffected by the amendment remains reusable when its claims and prerequisites
remain current. A distinct change to a concluded feature uses a new change Spec.
