---
description: Pull-request review criterion for Scoops, shared by automated reviewers and human reviewers.
---

# Pull-Request Review Criterion

This document defines what a Scoops pull-request review reports and what it ignores.
It applies to automated and human reviewers alike.

A reviewer reads this file at the PR **base** commit and treats it as trusted instruction.
A PR that changes this criterion is therefore reviewed by the previous version.

## A finding has a concrete impact

Report a finding only when the change causes, or clearly risks, one of these:

- **Defect:** incorrect behavior, crash, data loss or corruption, broken contract
  between producer and consumer, wrong error handling.
- **Security:** missing authentication or authorization, cross-establishment data
  exposure, leaked secret, unsafe handling of untrusted input.
- **Regression:** existing behavior removed or weakened without being in scope,
  unsafe migration or schema change, deleted file still referenced, invented API.
- **Missing test:** changed behavior without a test at the boundary the Rules require,
  or a test that was removed or weakened.
- **Rule violation:** a breach of `AGENTS.md`, `documentation/rules/` or another
  repository authority. A Rule violation is never a nitpick.
- **Performance:** N+1 queries, unbounded queries or lists, missing index for a new
  access pattern, expensive work on a hot path or on every render.

Each finding names the changed line it refers to, states the impact in one or two
sentences, and says what would fix it.

## Nitpicks are ignored

Do not report:

- style, formatting or import order (automated formatting owns them);
- naming preferences, unless a Rule fixes the name;
- personal preference between equivalent approaches;
- comments, wording or typos that do not change behavior or user-facing copy;
- speculative refactors or "consider also" suggestions without a concrete impact;
- problems in lines the PR did not change.

When unsure whether something is a nitpick, ask: "what breaks, leaks, slows down or
violates a Rule if this is merged?" If there is no answer, do not report it.

## Severity

| Severity | Meaning | Examples |
| --- | --- | --- |
| P1 | Must be fixed before merge. Merging causes a defect, security exposure, data loss or a broken deploy. | Missing authorization check, wrong establishment filter, migration that drops data, crash on a common path. |
| P2 | Should be fixed before merge. Real impact, but limited in scope or likelihood. | Missing test for changed behavior, Rule violation, unhandled error on an uncommon path, N+1 query. |
| P3 | Low impact. Fix in this PR or a follow-up. | Minor inefficiency, small edge case with a safe fallback, incomplete error message. |

Choose the lowest severity that honestly describes the impact. A P3 is still a real
problem, not a nitpick.

## Duplicates and scope

- Do not repeat a finding already raised in an existing review comment on the same
  path and line, even if it is still unresolved.
- Review only the lines changed in the reviewed range. Other code may be read for
  context.
- Product scope is not reviewed: whether the feature matches the PRD belongs to the
  Spec and its owners.

## Language

Findings and summaries are written in English, the language of Scoops pull requests.
