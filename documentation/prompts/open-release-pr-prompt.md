---
description: Open a release pull request from a release/vX.Y.Z snapshot of main to production via gh, with SemVer, affected PRDs and release-ready notes.
---

# Prompt: Open a Release PR

**Goal:** Standardize release Pull Requests from `release/vX.Y.Z` to
`production`, always cut from an exact snapshot of `main`. The PR identifies the
changes and the PRDs included in the version, records the `head SHA` that staging
already runs, and provides the notes the GitHub Release uses after the merge.
Use only the GitHub CLI (`gh`) for GitHub interactions. This task does not
create a Spec.

## Branches and automation

- `main` receives regular PRs. Every push to `main` deploys staging through
  `server-app-cd.yml` and `web-app-cd.yml`.
- `production` holds the published version. It changes only by merging release
  PRs.
- `release/vX.Y.Z` is a snapshot of `origin/main`, created at the exact SHA
  and never given extra commits.
- After a release PR merges, `.github/workflows/create-release.yml` checks that
  the merged tree equals the release branch tree, creates the annotated tag
  `vX.Y.Z` on the merge commit, publishes the GitHub Release from the PR body,
  comments the links on the PR and deploys Server, then Web, to production.

This prompt does not deploy, tag or publish anything itself.

## Input

- Optional target version in `vX.Y.Z` format. Without one, infer the next
  Semantic Version from the changes since the latest release.

## Mandatory rules

- Do not commit pending local changes.
- Create the release branch from the exact SHA of `origin/main` and keep that SHA
  as the `head SHA` throughout.
- Do not open more than one release PR for the same `head SHA`.
- Do not create the branch, create the PR or edit it before presenting the
  complete title and body and receiving explicit approval for that exact draft.
- Take PRD associations only from each included PR's `## PRD and Spec
  traceability` section. Do not derive them from changed paths, issues or Specs.
- Do not invent PRDs, requirements, CI results or validations.
- Do not include secrets, credentials or internal URLs.
- The merge decision stays human.

## Workflow

### 1. Check the repository state

1. Run `git status --short` and stop if there are local changes.
2. Fetch `main`, `production` and tags.
3. Record the SHA of `origin/main` as `head SHA` and of `origin/production` as
   `base SHA`.
4. Stop when `main` has nothing that `production` lacks, when either branch is
   missing, when they diverge in a way a merge cannot resolve, or when a release
   PR already exists for the same `head SHA`.

### 2. Identify the included PRs

List the commits in `origin/main` and not in `origin/production`. Map each one
to the merged PR that introduced it, when GitHub has that association. Produce a
deduplicated list with number, URL, title and related issues. List commits with
no PR separately by SHA and message; they belong to the release but have no PRD
classification.

### 3. Identify the affected PRDs

For each included PR, read `## PRD and Spec traceability`:

- When it names a PRD under `documentation/prds/`, record the PRD file and the
  `PRQ-*` identifiers it delivers, noting whether each is fully or partially
  delivered as the PR states.
- When it says the PR has no PRD (for example `None` or `Not applicable`),
  record the PR under PRs without PRD.
- When the section is missing or ambiguous, stop and ask the user to classify
  the PR and update its body before continuing.

Deduplicate by PRD file and record which PRs touched each one.

### 4. Determine the version

Inspect the latest GitHub Release, its tag and every later change. Choose the
largest applicable increment: major for incompatible changes, minor for
backward-compatible features, patch for fixes, performance, refactoring,
documentation, tests, build, CI or maintenance. Use `v0.1.0` for the first
release unless told otherwise. Stop when the tag or release already exists, when
a requested version is not greater than the latest one, or when the changes need
a larger increment than requested.

### 5. Record existing validations

Read the actual results of the CI runs of the included PRs and of the staging
deploy runs for the `head SHA`. Do not rerun CI. Never report a missing or
pending check as passing. If staging does not yet run the `head SHA`, say so.

### 6. Present the draft for approval

Present the title, the complete body exactly as it will be published, and a
summary of the version, `base SHA`, `head SHA`, included PRs, affected PRDs and
pending checks. Ask for explicit approval and wait. If the user requests
changes, present the full revised draft and ask again.

### 7. Create the branch and the PR

Only after approval:

```bash
gh api --method POST "repos/JohnPetros/scoops/git/refs" \
  -f ref="refs/heads/release/vX.Y.Z" \
  -f sha="$head_sha"

gh pr create \
  --base production \
  --head release/vX.Y.Z \
  --title "Release vX.Y.Z" \
  --body-file <temporary-file>
```

If the branch already exists, stop unless it points to the `head SHA`. The title
must be exactly `Release vX.Y.Z`; `create-release.yml` reads the version from it
and rejects any other form.

## Body

The body becomes the GitHub Release notes. Do not use a top-level `#` heading,
speculative claims or empty sections.

```markdown
## Goal

Explain the purpose and delivered result of the version.

## Version

- Version: `vX.Y.Z`
- Base SHA: `<production SHA>`
- Head SHA: `<main SHA>`

## Main changes

### Web
- Relevant frontend changes.

### Server
- Relevant API, persistence and job changes.

### Core and packages
- Relevant shared-domain and package changes.

### Infrastructure
- Relevant Docker, Coolify, CI/CD or tooling changes.

## Fixes

- Fixes included in the version, or `No specific fixes in this version.`

## Included PRs

- #123 — PR title.

## Affected PRDs

| PRD | Requirements | Source PRs |
| --- | --- | --- |
| [`documentation/prds/pdv.md`](documentation/prds/pdv.md) | PRQ-05 (partial), PRQ-08 | #123 |

## PRs without PRD

- #124 — PR title.

## Migrations and deployment

- Database migrations, environment variables, execution order or deployment care.

## Breaking changes

- Incompatibilities and required adaptation, or `No breaking changes identified.`

## Validation

- CI and staging results actually observed, with pending checks named as pending.

## Related issues

resolve #456
```

Omit `## Affected PRDs` only when no included PR has a PRD, `## PRs without PRD`
when every PR has one, and `## Related issues` when no issue is known. Use only
the `resolve` keyword for issues.

## Return

After creating the PR, return its URL and number, the version, the base and head
SHAs, the included PRs, the affected PRDs, the PRs without PRD and the checks
still pending. Do not call the release published until the PR is merged and
`create-release.yml` has created the tag and the GitHub Release and finished the
production deploys.
