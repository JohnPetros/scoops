---
description: Draw or change the Doop frames a Scoops module PRD needs, check them with check:design, have the Design Reviewer review them, fix what it finds and report the review.
---

# Prompt: Design

Draw or change the frames of the Doop canvas `Scoops` that a module PRD needs, and finish
only when they are checked and independently reviewed. The main task runs this workflow
and owns the frames and the decisions; the Design Reviewer only advises. To review frames
without changing them, use `review-design` (`/review-design`).

```text
Module PRD (+ PRQ-*/Journeys in scope)
→ research and interview
→ draw or change the frames in Doop
→ check:design (no new errors on the touched frames)
→ Design Reviewer → fixes → review of the affected frames again
→ report to the user
```

## Input

- The module PRD (`documentation/prds/<module>.md`) and the `PRQ-*` requirements and
  journeys in scope, or a change request for existing frames with the PRD it belongs to.
- The pages to work on (`🖥️ Desktop`, `📱 Mobile`, `🧩 Components`).

Without a PRD, ask for one or for the user's explicit decision to proceed without it;
then the review covers only the critique, `design.md` and `check:design`.

## Authorities

Read before the first edit:

- `AGENTS.md`, section "Doop MCP": only the Doop MCP, locate pages and frames by name, use the canvas components and
  tokens, verify with `get_frame_screenshot`, and draw dialogs as standalone frames.
- `documentation/rules/doop-rules.md`: pages, frame names, sections and component
  placement.
- `documentation/design.md`: the visual language, tokens, type, radius and spacing.
- The PRD in full, including the requirements, the experience rules and the journeys.

Invoke these skills; do not paraphrase them from memory:

- The Doop guide: `get_guide` with `doop-instructions` once, and with `components` before the
  first component change: the review checkpoints, token, component and layout patterns used to
  build the frames.
- `impeccable`, for the visual direction: run its Setup once, then load its
  `reference/craft-floor.md` immediately before drawing. Use its `critique` only through
  the Design Reviewer below; do not run it yourself, so the review stays independent.

Confirm with `get_canvas` that the connected canvas is `Scoops`, and read the existing
frames of the module before drawing, so new frames reuse their patterns.

## Interview

Follow `documentation/prompts/interview-prompt.md` for every product or visual decision
the authorities do not settle, before drawing what depends on it. Report a PRD gap or conflict
to the user instead of designing around it; change the PRD only with the user's approval,
as `AGENTS.md` requires for a product-behavior change.

## Drawing

- Name each frame as `documentation/rules/doop-rules.md` defines
  (`<Module> / <Page> / <Component> / <State or variant> / <Desktop|Mobile>`): the viewport
  is always the last segment, and the component and state segments are omitted when they
  do not apply. Rename a frame that still uses the previous pattern only when the task
  changes it. The name is the contract that Specs and reviewers use.
- Place the frames of a page on top of its `Section / <Module> / <Page>` background
  frame and keep sections apart: a new or grown section must not overlap another one.
- Draw every state the PRD names and the ones it implies: empty, loading, error, locked,
  first use, maximum, long text, and the Manager versus Operator view when they differ.
  Draw the desktop and mobile versions of each screen.
- Bind colors, radius and spacing to tokens and reuse library components; change a
  library component only when the user asks.
- Use realistic PT-BR copy in the PRD's vocabulary and illustrative data that is
  consistent across frames.
- Keep calls small, inspect by name after a timeout before redoing work, and capture the
  touched frames (or their sections, for tall frames) with `get_frame_screenshot` to verify them.

## Automated check

Save the snapshot first. `check:design` cannot reach Doop itself; it reads `.design-snapshot/`
(git-ignored) and renders it with Playwright (see `documentation/tooling.md`):

1. For each touched frame and each frame that groups it, call `get_frame` with
   `expand_components: true` and write its `html` to `.design-snapshot/<frameId>.html`.
2. Write `.design-snapshot/frames.json` from the same responses:
   `{"canvasId": "ams11lLQ8a", "pages": {"<pageId>": "<page name>"}, "frames": [{"id", "name",
   "pageId", "x", "y", "width", "height", "updatedAt"}]}`.
3. Write `.design-snapshot/tokens.json` with the `get_tokens` output (format `json`, all
   types).

Save the frames again after every fix: a stale snapshot hides the fix and gives stale results.

Run `check:design` for every touched frame:

```bash
pnpm run check:design --frame "<frame name>"
```

Fix every new error. Fix new warnings or record why they stay. Do not update the design
baseline to hide a finding of the frames you drew; existing debt outside them stays in the
baseline.

## Independent review

Before activating the Reviewer, check the coverage yourself against the PRD: every state and
requirement in scope has a frame. The Reviewer critiques the design only and does not read
the PRD.

1. Save a full report for the frames outside the repository:
   `pnpm run check:design --frame "<name>" --all --json > <scratch path>`.
2. Activate one read-only `design-reviewer-agent` with the exact page and frame names and
   the report paths. Do not pass your own conclusions or the PRD.
3. Verify each finding against the frames before acting on it. Fix every verified P0 and P1
   finding. Fix P2 and P3 findings or decide with the user, and report each decision. A
   finding that comes from the PRD, not from the design, goes to the user: change the PRD
   only with the user's approval.
4. After fixes, run `check:design` again and resume the same Reviewer only for the
   affected frames. Repeat until no P0 or P1 finding remains. If a finding is still open
   after two rounds on the same frame, stop and ask the user.

The Reviewer's report is advice, not evidence: its verdict does not replace your check of
each finding.

## Completion

Finish only when every touched frame has no new `check:design` error and no P0 or P1
finding is open. Report to the user the frames drawn or changed, the review verdict, the
decisions taken and anything left for them to decide.
