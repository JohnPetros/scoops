---
name: implement-spec
description: Implement an open or resumed Spec autonomously, integrate the candidate, verify its contracts, and correct findings until the evidence is ready.
---

# Implement a Spec

Use this single implementation entry point in the current chat:

```text
plan-spec → implementation → integrated verification
                                    ↓
                           corrections until passing
                                    ↓
                               conclude-spec
```

The Spec defines behavior, boundaries, consequential decisions and proofs, including the Path
map. [`plan-spec`](./plan-spec-prompt.md) has already turned that map into the colocated
`plan.md`, following the [Plan rules](../sdd.md#plan). This prompt executes the Plan's tasks
and defines the proof workflow; the agent still chooses internal order within `Depends on`,
delegation and isolation. The Plan tracks tasks, Builders and per-path progress; Evaluation
records evidence and findings. Plan status is progress, never proof.

## Read and establish scope

Read `documentation/sdd.md`, the current Spec, Modules, Architecture,
`documentation/rules.md`, every selected Rule, and `documentation/tooling.md`.
Read applicable PRDs and Design documentation for the affected behavior. When resuming,
read the colocated Plan, Evaluation and its continuation handoff before editing.

Confirm that the Spec is `open` initially or `in_progress` when resuming, its revision is
current, and no material Contract ambiguity remains. Preserve source and Issue traceability.
PRD `PRQ-*` requirements define product intent; their Product Dependency Graph and User
Journeys do not determine implementation order. Do not invent PRD Acceptance Criteria.

Before the first feature edit:

1. set an `open` Spec to `in_progress` and retain its current revision;
2. create or reconcile `evaluation.md` from
   [`evaluation.md`](../templates/sdd/evaluation.md), preserving historical results;
3. inspect current source and the shared worktree; identify scope boundaries, existing
   findings, required services, accounts, fixtures and the Doop frames in the Design Contract;
4. require `plan.md` for the current Spec revision and run
   `pnpm check:spec-implementation -- <exact-spec-path> --plan-only`. When the Plan is missing
   or the check fails, run `plan-spec` first; do not start implementation on a failing Plan.
   Only a delivery whose Evaluation declares `plan: none` proceeds without one. Assign every
   `unassigned` task a Builder. When resuming, reassign tasks whose Builder no longer exists
   and record the reason in the task's Notes;
5. when browser work applies, run `pnpm --filter web check:playwright` using the documented
   command, correct failures, and record the result before affected implementation;
6. record a concise current result and known blockers in Evaluation.

Freeze the Contract, not the agent's internal implementation choices. Exact public APIs,
required migration artifacts and other explicitly contracted decisions remain authoritative;
ordinary internal file layout and sequencing are chosen within repository Rules. A Plan
archived under `history/legacy-execution.md` is context only and does not control execution
or readiness; a new Plan covers only the work that remains.

## Organize and implement

Execute tasks in `Depends on` order. The agent may implement a task directly, assign it to a
[Builder](../agents/builder-agent.md) subagent, or run tasks with no dependency between them in
parallel in isolated git worktrees when their paths do not overlap, then merge and re-verify.
Give each Builder its task IDs and the paths of its rows, and name it after its responsibility
as `AGENTS.md` requires.

Only the Orchestrator edits the Plan, following the maintenance rules in `plan-spec`. Update
rows and task status at significant checkpoints, not at every edit. Mark a row `completed`
only after inspecting the integrated diff for that path. A blocker keeps the row
`in_progress` with its `FND-*` in Notes. When implementation needs a file the Path map does
not list, or names one differently, make the non-material Path map correction in the Spec,
then re-run `plan-spec` to reconcile the Plan; a change to the Contract itself goes through
amendment.

Whoever delegates still integrates: inspect delegated diffs together, because a subagent's
report alone does not establish acceptance.

Run focused checks during development. Use the repository's commands and test-ownership
policy; do not add direct tests to indirect boundaries or weaken tests, coverage thresholds,
complexity baselines or checkers to pass. Run applicable complexity checks at a coherent
composition boundary before expensive checks that a structural correction would invalidate.
Reserve the complete Web integration suite (`pnpm --filter web test:integration`) for final
validation of the integrated candidate. Do not run it during implementation or intermediate
corrections; use focused tests and targeted browser scenarios while making changes. At final
validation, run the complete suite once, then repeat it only when a subsequent correction
affects its claims or an unresolved risk justifies another full run. Keep repeated full builds
and other complete integration suites for the integrated candidate unless an earlier failure,
runtime dependency or Contract requirement justifies them.

For changed HTTP route groups, update the matching
`apps/server/rest-client/<module>/<route-group>.rest` file in the same scope. Verify one
labeled request per controller operation with current method, parameters, headers, body and
reusable non-secret variables. Record route/example parity; it does not prove HTTP behavior.

For changed business rules or correctness-critical logic in eligible Core use cases, execute
the Spec's targeted Stryker checks using `pnpm --filter @scoops/core test:mutation` and the appropriate Tooling
scope options. Targets must be direct files matching `src/**/use-cases/*-use-case.ts`;
supporting Core code remains consumed by tests but is not mutated. Use explicit eligible
package-relative `--files` when automatic selection cannot cover the affected claims.
Inspect HTML/JSON reports and correct actionable survivors or uncovered
logic with behavior-focused tests at allowed boundaries. Record actual scope, command, report
paths, results and evidence-based equivalent/survivor dispositions in `EV-*`/`FND-*` rows.
Dry runs, empty selections and execution errors are not passing mutation proof; successful
execution alone does not satisfy the Spec's semantic pass conditions. No global score
threshold or Web/Server mutation obligation is implied by the Spec's semantic acceptance.
Core CI separately runs the full eligible Core use-case scope with `--all` across four
balanced shards for both the PR target branch and candidate in the same workflow run. Its
gate requires at least 70% per included module (Analytics, Communication, Identity, MRP
and PDV), at least 70% for each changed/new eligible file in those modules, and no exact
score drop for unchanged eligible files. Billing's module and per-file thresholds are
temporarily suspended. It does not replace local assessment of the contracted scope.
After corrections, rerun only invalidated mutation checks and preserve unaffected evidence.

Evaluation `ready` authorizes conclusion, not delivery closure; `conclude-spec` owns closure.

## Design-backed UI

Read `documentation/design.md`, applicable UI Rules and every Doop frame named in the Spec's
Design Contract, read-only through the Doop MCP (`get_frame`, `inspect_frame`,
`get_frame_screenshot`). A legacy saved bundle under an older Spec's `design/` folder is
historical; the Doop frame of the same name is the reference. Never edit the canvas here.
Missing required design details are Contract gaps; route them for amendment before affected
work rather than inferring behavior from screenshots.

Use the Playwright CLI for all browser interaction and validation. Exercise relevant behavior,
keyboard paths, focus and a narrow viewport, inspect console and failed requests, and verify
the URL, network or persistence result needed by the criterion. For real-service flows,
follow the documented Docker/service health and account preflight; seed only explicitly when
required and authorized, never implicitly from Playwright. Mocked transport does not prove
real authorization, persistence or external-service behavior.

After each visual implementation or correction checkpoint, capture and inspect fresh runtime
screenshots against the assigned references at their exact state and viewport. Record each
comparison and material difference with an `EV-*` row. Include loading, empty, error,
responsive and other states when contracted. Capture under ignored `test-results/` or as CI
artifacts; do not create feature evidence folders or dedicated visual-reference tests.
Stop application processes started for validation and leave shared Docker services running.

## Integrate and verify

Once all source and shared/generated artifacts form one coherent candidate:

1. compare the integrated diff with `FR-*`, `AC-*`, boundaries, exclusions and consequential
   technical decisions; inspect migrations, generated artifacts and REST-client parity;
2. run each applicable complete integration suite once on the integrated candidate, together
   with contracted code, architecture, type, coverage and build checks. Affected Core, Server
   and Web workspaces must meet their configured coverage floors;
3. execute required `MV-*` scenarios with their actual environment and fixtures. Record
   expected and observed results; inspect console, network and persisted state where relevant;
4. record current evidence and criterion coverage in Evaluation;
5. activate exactly one independent read-only
   [`Implementation Reviewer`](../agents/implementation-reviewer-agent.md) for the complete
   candidate. For a design-backed UI candidate, also activate one
   [`Visual Reviewer`](../agents/visual-reviewer-agent.md) with fresh captures and the Doop
   frames to compare them with. Reviews may run in parallel with verification once their needed inputs exist;
6. verify findings, apply in-Contract corrections automatically, and rerun failed and affected
   checks until every required proof passes.

Run `pnpm check:spec-implementation -- <exact-spec-path> --require-plan` on the integrated
candidate. It checks every Path map row against Git and disk, and requires every Plan row to be
`completed` and consistent with the Spec. Record its result in Evaluation and rerun it when the
contracted path state changes. It checks structure, not behavior. A legacy Spec without a Path
map and with `plan: none` uses its contracted checkers and a scoped diff inspection instead.

Reviewers inspect the Spec, integrated diff and current evidence. They do not automatically
replay browser/manual scenarios or repeat complete suites. Reuse valid evidence; request a
narrow additional check only for a concrete unresolved risk, missing proof or discrepancy.
After a correction, resume the same reviewer only over affected findings and changed surfaces.

## Evidence and corrections

Use the canonical [Evaluation template](../templates/sdd/evaluation.md) and stable `EV-*`,
`MV-*`, `FND-*` and `CI-*` identifiers. Preserve Spec `FR-*`/`AC-*` IDs and historical failed
attempts. Visual rows use `EV-*` with `Type = visual`, never a separate identifier namespace.
Update actual progress and evidence at coherent implementation, validation and correction
checkpoints; do not mirror every edit as a task ledger. Keep one row per criterion, executed
check, manual scenario and required visual reference/state.

Record exact commands/scenarios, observed results, artifacts and findings. Describe executed
check outcomes as passed, failed or blocked; retain pending, stale and not_applicable as
evidence lifecycle states, and explain blockers in the result and linked finding. Mark evidence
`stale` only when a change affects what it proves; retain valid unaffected evidence across
corrections, review and conclusion. A revision change requires an impact assessment rather
than blindly reusing or invalidating every result. Do not claim readiness from stale evidence.
Record branch, diff or checkpoint provenance when useful to establish which candidate a proof
covers; a commit identifier may also serve that purpose. Provenance is not an additional
status gate. The PR CI table records the exact head SHA checked by GitHub.

Fix implementation, test, browser, build, migration and visual defects inside the Contract
without asking permission. Record the finding, invalidate affected evidence, make the smallest
scoped correction, rerun failed/affected checks and continue. Full regression is repeated only
when the change affects its claims or an unresolved risk justifies it. After three materially
identical failures, ask the user only when resolution requires a decision unavailable in the
repository or environment; otherwise change the approach and continue safely.

A required unavailable service, account, fixture, observation capability or external approval
blocks readiness. Record the exact gap and keep Evaluation `in_progress`; do useful independent
work where safe, but never substitute mocks or partial results for the required proof. Pause
only dependent work and ask for a decision/access only when it cannot be obtained within the
current authority. Correctable failures remain correction work, not permission requests.

If a discrepancy changes product intent, scope, design intent, architecture or another
contracted decision, pause affected work and return the Spec to `draft` through `create-spec`.
Update higher authorities first when required, increment the revision and refresh affected
references and evidence. The Spec
Reviewer belongs to `create-spec` and is not an implementation reviewer or recurring gate.
If a declared test conflicts with test-integrity Rules, amend the invalid contract before
editing that test; never weaken the checker.

For accepted findings, capture a reusable lesson only when warranted. If an existing Rule is
clear, fix the code. Route missing/ambiguous reusable guidance through its authority workflow;
feature-local behavior belongs in the Spec. Record the documentation disposition without
requiring a new Rule for every defect.

## Readiness and continuation

Keep Evaluation `in_progress` while required criteria, checks or verified blocking findings
remain open. Set it to `ready` when all required evidence is current, both applicable reviews
are reconciled, no blocking finding remains and `--require-plan` passes. Corrections found by
verification or review reopen the affected Plan rows and tasks. Proceed to `conclude-spec`
when publication authority exists; do not mark the Spec completed here.

Before interruption or handoff, update the Plan's rows and task statuses, and leave
a small continuation record in Evaluation: branch/candidate provenance, current progress,
interrupted or uncommitted paths, unfinished criteria, active blockers, latest checker
IDs/results, affected stale evidence and the next useful action. Keep task breakdown in the
Plan rather than duplicating it in the handoff. Preserve unrelated user changes.
Conclusion and later review reuse valid evidence and reopen only affected proofs.
