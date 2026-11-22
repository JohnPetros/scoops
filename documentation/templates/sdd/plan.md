---
feature: "<domain>/<feature>"
spec: ./spec.md
spec_revision: 1
evaluation: ./evaluation.md
status: in_progress
updated_at: YYYY-MM-DD
---

# Plan

Implementation plan for Spec revision `<revision>`.

<!-- The Plan records how the Orchestrator broke the work down and where each piece stands.
It references FR-*/AC-* and Spec sections instead of restating them, and it never decides
acceptance: a task marked done is not proof, and only Evaluation evidence makes an AC pass.
Revise phases and tasks freely as the work teaches you; record each material change in the
History table. Plan statuses: in_progress, completed; only conclusion sets completed.
Phase and task statuses: pending, in_progress, done, blocked, superseded. Replace
placeholders and omit unused examples. -->

## Current state

- **Current phase:** `<P* ID and name, or completed>`
- **Active Builders:** `<instance names and their task IDs, or none>`
- **Blocked tasks:** `<task IDs with the FND-* or missing input, or none>`
- **Next action:** `<one concrete action>`

## Phases

| ID | Phase | Goal | Depends on | Status |
| --- | --- | --- | --- | --- |
| `P1` | `<name>` | `<observable result the phase leaves behind>` | — | `pending` |

## Tasks

<!-- One row per bounded, assignable piece of work. Scope names the owned workspace or
boundary, not an exhaustive file list. Builder is the subagent instance name, the
worktree name or Orchestrator. When a task is reassigned after a session ends, update the
Builder and note it in History. -->

| ID | Phase | Task | Covers | Scope | Builder | Depends on | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `P1-T1` | `P1` | `<observable outcome>` | `<FR-*/AC-*>` | `<workspace or boundary>` | `<builder name>` | — | `pending` |

## History

| Date/Time | Change |
| --- | --- |
| `YYYY-MM-DD HH:MM` | `Plan created for Spec revision <revision>.` |
