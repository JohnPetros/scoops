---
name: plan-spec
description: Create or reconcile the plan.md progress tracker of an SDD delivery from the Spec's Path map, after the Spec is open and before implement-spec starts.
---

# Plan a Spec

`plan.md` is the single source of **implementation progress** for a delivery. It groups the
work into **tasks**, each one a Builder assignment with its status, Builder and dependencies,
and it has one Progress row per row of the Spec's Path map, linked to its task and to the
`FR-*`/`AC-*` it serves. It does not redefine behavior, paths, schemas or decisions
(`spec.md` owns the Contract), and it records no evidence, findings or handoff
(`evaluation.md` owns them). Follow [`documentation/sdd.md`](../sdd.md).

```text
create-spec (Spec open) → plan-spec → implement-spec
```

Run this prompt after the Spec Reviewer has no unresolved blocking finding and the Spec is
`open`. Run it again after a Contract amendment increments the Spec revision, or after a
Path map correction, to reconcile the Plan. `implement-spec` does not start without a
`plan.md` that passes `--plan-only` for the current Spec revision.

## Location

```text
documentation/features/<domain>/<feature>/plan.md
```

For a later change: `documentation/features/<domain>/<feature>/changes/<change-name>/plan.md`,
next to its `spec.md`.

## Preconditions

Read `AGENTS.md`, `documentation/sdd.md`, the Plan template
[`plan.md`](../templates/sdd/plan.md) and the exact Spec revision. Stop and report the
blocker instead of creating the Plan when:

- the Spec is not `open` (or `in_progress`, when reconciling after an amendment or
  correction);
- the Technical Contract has no Path map, or a row is ambiguous: a path that is not exact,
  contains placeholders or wildcards, or a `Change` other than `Create`, `Modify`,
  `Generate` or `Remove`;
- a path cannot be linked to any `FR-*`/`AC-*` from its `Serves` cell or the Spec's
  Behavior, Technical and Verification Contracts. This is a Contract gap and goes back to
  `create-spec`.

There is no grilling gate. The rows are derived from the Spec, so no material decision is
left to ask. If deriving them exposes a material ambiguity, stop and route it to
`create-spec` instead of deciding it here.

## Derivation

1. Read every table of the Path map. Create one Progress row per map row, in the same order
   and grouping, with the same path text and the same `Change` (plain text, no backticks).
2. Link each row to every `FR-*`/`AC-*` it serves, comma-separated, starting from its
   `Serves` cell. Use only IDs that exist in the Spec. Every row has at least one ID.
3. Reach every `AC-*` through at least one row. A criterion that is verified only against
   existing behavior and has no contracted path goes under
   `Criteria without a contracted path`, with the reason.
4. Group the rows into tasks. A task is one cohesive outcome with disjoint ownership (one
   layer, workspace or flow that a single Builder can deliver), not a file and not a
   ceremonial step. Number tasks `T1`, `T2`… in execution order, and give every row exactly
   one task.
5. Assign each task's Builder:
   - `Direct` when the Orchestrator implements it in its own context;
   - a kebab-case name ending in `-builder` that describes the responsibility, such as
     `core-mrp-builder` or `web-checkout-builder`, for a [Builder](../agents/builder-agent.md)
     subagent, as `AGENTS.md` requires;
   - `unassigned` when `implement-spec` decides it at kickoff.
   A correction Builder such as `fnd-07-fix-builder` is assigned later, only by
   `implement-spec`. A cohesive delivery is a single `Direct` task or several `Direct` tasks
   in order.
6. Fill `Depends on` with the tasks whose output this task consumes (`none` otherwise).
   Derive dependencies only from the Technical Contract, the runtime flow and the layer
   boundaries, never from the PRD Product Dependency Graph. Dependencies must not form a
   cycle. Tasks with no dependency between them can run in parallel.
7. Initialize every task and every row as `pending` with the note `none`.
8. Do not add phases, waves, estimates or acceptance text. `Depends on` is the only
   ordering: phases would be a second schedule, and acceptance text a second Contract.

Repeating `Path` and `Change` from the Spec is deliberate. A progress row needs a stable key
that the checker can reconcile with the Spec and with Git. The Spec stays the only owner of
the Contract: the `Purpose` cell and the Spec's prose are never copied, and `--plan-only` and
`--require-plan` report drift in both directions, so the copy cannot diverge silently.

## Template

Use [`documentation/templates/sdd/plan.md`](../templates/sdd/plan.md). The first two cells
of each Progress row are fixed (`Path`, then `Change`), and the checker reads the remaining
cells by position: `Task`, `FR/AC`, `Status`, `Notes`. Task rows are also read by position:
`Task`, `Outcome`, `Builder`, `Depends on`, `Status`, `Notes`.

`status` is `in_progress` from creation and `completed` when the delivery concludes.
`spec_revision` equals the `revision` of the Spec the rows were derived from.

## Maintaining progress

Only the Orchestrator edits `plan.md`. Builders and Reviewers report; the Orchestrator
updates the rows at each significant checkpoint, not at every file edit.

| Status | Meaning |
| --- | --- |
| `pending` | no work has started on the path |
| `in_progress` | work started, was reopened by a finding or is blocked |
| `completed` | the contracted change is in the integrated candidate and matches the Spec |

- A failure or blocker does not create a new status: the row stays `in_progress` and
  `Notes` links the `FND-*` finding.
- A task's status follows its rows: `pending` while every row is `pending`, `completed`
  only when every row is `completed`, `in_progress` otherwise. A task that has started
  needs an assigned Builder.
- Reassigning a task (for example, resuming it as `Direct` or as `fnd-<n>-fix-builder`
  after a finding, or because its Builder's session ended) updates `Builder` and records the
  reason in the task's `Notes`.
- A finding that invalidates delivered work reopens the affected rows to `in_progress`.
- An `AC-*` counts as implemented when every row that links it is `completed`. Whether it is
  *proven* is recorded only in Evaluation.
- Mark a row `completed` only after inspecting the integrated diff for that path. Evidence,
  command output and verdicts stay in `evaluation.md`.

## Reconciliation after an amendment or Path map correction

When a Contract amendment increments the Spec revision, or a routine Path map correction
renames or adds an internal file within the Contract, run this prompt again on the same
`plan.md`:

- drop rows for paths the Spec removed from the map;
- add rows for new paths as `pending`, in an existing task or a new one;
- drop tasks left without rows, and update `Depends on` accordingly;
- update `Change` and `FR/AC` when the Spec changed them, and reopen to `in_progress` any
  `completed` row whose contracted change moved;
- keep the status of unaffected rows;
- set `spec_revision` to the current Spec revision.

## Verification before saving

Run `pnpm check:spec-implementation -- <spec-path> --plan-only`. It validates the Plan
against the Spec without requiring the contracted paths to be delivered yet:

- every Spec path has exactly one row with the same `Change`, and no row has a path missing
  from the Spec;
- every linked ID exists in the Spec, statuses are valid and `spec_revision` matches;
- task IDs are unique, Builders are valid, dependencies exist and have no cycle, every row
  belongs to exactly one declared task, every task has at least one row, and task statuses
  agree with their rows.

Fix every error before saving. Later, `implement-spec` and `conclude-spec` run the same
checker with `--require-plan`, which also requires every row to be `completed` and to match
Git and the filesystem.

## Rules

- Do not edit `spec.md`, `evaluation.md`, the PRD, Rules or Architecture. A Path map gap goes
  back to `create-spec`.
- Do not invent paths, IDs or rows that are not in the Spec's Path map.
- Do not split a task by file or merge independent ownerships into one task.
- Do not mark any row beyond `pending` when creating the Plan.
- Do not copy the Spec's `Purpose` cells or contract prose; the Spec is the only place for
  them.
- Keep headings and keys exactly as in the template.

## Report

Return the link to `plan.md`, the Spec revision, the tasks with their Builder and
dependencies, the number of rows per `Change`, any criteria without a contracted path and the
result of `--plan-only`.

End with the next step: `implement-spec`, once `--plan-only` passes. If it fails, state the
errors and that `implement-spec` must not start until they are fixed.
