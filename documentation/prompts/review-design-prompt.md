---
description: Critique the design choices of existing Scoops Doop frames the way the impeccable critique does, with the Design Reviewer and check:design, and report the verified findings without changing the design.
---

# Prompt: Review Design

Critique the design choices of frames of the Doop canvas `Scoops` that already exist,
the way the `impeccable` critique does (`.agents/skills/impeccable/reference/critique.md`),
without drawing or changing anything. Use it for frames drawn outside the `design`
workflow or whenever the user wants an independent look at a screen. It judges the design,
not the product: it does not read the PRD or check requirements. To change frames, use the
`design` workflow (`/design`), which runs the same review at its end.

The critique has two isolated assessments, as in impeccable: the Design Reviewer is
Assessment A (design review) and `check:design` is Assessment B, which replaces the
detector because Doop frames cannot be scanned from source. The main task synthesizes them.

```text
Frames
→ check:design (Assessment B, saved but not read yet)
→ Design Reviewer (Assessment A, formed first)
→ synthesis in the impeccable critique structure
→ targeted questions
```

## Input

The frames to review, by page and name. For a screen or a module without a list, find its
frames by their section and frame names and confirm the list with the user before
reviewing.

## Rules

- Do not change the frames or the design baseline. This workflow only reads; fixes go
  through `/design`.
- Use only the Doop MCP for the canvas, and confirm with `get_canvas` that it is
  `Scoops`. Locate frames by name; do not switch pages that another session may be using
  without asking.
- Do not run `impeccable critique` yourself and do not form your own critique before the
  Reviewer reports: Assessment A must finish before the `check:design` findings enter your
  context, so they do not anchor it.
- Do not persist a snapshot in `.impeccable/critique/`; the chat report is the deliverable.

## Steps

1. **Check.** Save the Doop snapshot of the frames to review (`get_frame` with
   `expand_components: true` → `.design-snapshot/<frameId>.html`, plus `frames.json` and
   `tokens.json`; see the section "Automated check" of `documentation/prompts/design-prompt.md`).
   For each frame, save a full report outside the repository:
   `pnpm run check:design --frame "<name>" --all --json > <scratch path>`. Do not read the
   report yet.
2. **Review.** Activate one read-only `design-reviewer-agent` with the exact page and frame
   names and the report paths. Do not pass your own conclusions or earlier findings.
3. **Verify.** Check each finding against the frames, and read the `check:design` report
   only now. Discard the findings that do not hold, and say why.
4. **Report.** Write the full critique in the chat, following the structure of
   `reference/critique.md`: the header (`Method: Design Reviewer (A) + check:design (B)`),
   the Design Health Score table, the Design Specificity Verdict, the Overall Impression,
   What's Working, the Priority Issues tagged P0 to P3 (what, why it matters, fix), the
   Persona Red Flags, the Minor Observations and the Questions to Consider. Weave in where
   `check:design` agrees with the review, where it caught something the review missed and
   where it is a false positive. Do not concatenate the two assessments.
5. **Ask.** Last, after the report, ask 2 to 4 targeted questions about the actual
   findings (priority, design intent, scope), following
   `documentation/prompts/interview-prompt.md`. With fewer than 3 Priority Issues, write
   `Questions skipped: <N> priority issues` instead.

## Completion

Finish when the full critique is in the chat and the questions, or the skip line, close it.
Name the frames that need `/design` and report the next step.
