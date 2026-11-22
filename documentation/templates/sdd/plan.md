---
title: <feature title> — plan
spec: ./spec.md
spec_revision: <revision>
evaluation: ./evaluation.md
status: in_progress
updated_at: YYYY-MM-DD
---

# Plan — <feature title>

<!-- Created by plan-spec from the Spec's Path map. Keep headings and the first cells of
each row exactly as below: pnpm check:spec-implementation reads Tasks by position (Task,
Outcome, Builder, Depends on, Status, Notes) and Progress rows by position (Path, Change,
Task, FR/AC, Status, Notes). Statuses: pending, in_progress, completed. Builder: Direct,
unassigned or a kebab-case <responsibility>-builder name. -->

## Tasks

| Task | Outcome | Builder | Depends on | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| T1 | <cohesive outcome, one line> | core-<module>-builder | none | pending | none |
| T2 | <cohesive outcome, one line> | web-<module>-builder | T1 | pending | none |

## Progress

### <app or package, same grouping as the Spec Path map>

| Path | Change | Task | FR/AC | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `packages/core/src/...` | Modify | T1 | FR-01, AC-01 | pending | none |

## Criteria without a contracted path

- None | `AC-04` — <why no path is contracted>
