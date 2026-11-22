---
description: Critique the design choices of existing Scoops Doop frames the way the impeccable critique does, with the Design Reviewer, and report the verified findings without changing the design.
---

# Prompt: Review Design

Critique the design choices of frames of the Doop canvas `Scoops` that already exist,
the way the `impeccable` critique does (`.agents/skills/impeccable/reference/critique.md`),
without drawing or changing anything. Use it for frames drawn outside the `design`
workflow or whenever the user wants an independent look at a screen. It judges the design,
not the product: it does not read the PRD or check requirements. To change frames, use the
`design` workflow (`/design`), which runs the same review at its end.

The critique is the design assessment (Assessment A) of impeccable, done by the Design
Reviewer. The detector assessment (Assessment B) does not apply, because Doop frames cannot
be scanned from source. The main task verifies and presents the result.

```text
Frames
→ Design Reviewer (Assessment A)
→ verification of each finding
→ report in the impeccable critique structure
→ targeted questions
```

## Input

The frames to review, by page and name. For a screen or a module without a list, find its
frames by their section and frame names and confirm the list with the user before
reviewing.

## Rules

- Do not change the frames. This workflow only reads; fixes go through `/design`.
- Use only the Doop MCP for the canvas, and confirm with `get_canvas` that it is
  `Scoops`. Locate frames by name; do not switch pages that another session may be using
  without asking.
- Do not run `impeccable critique` yourself and do not form your own critique before the
  Reviewer reports, so the review stays independent.
- Do not persist a snapshot in `.impeccable/critique/`; the chat report is the deliverable.

## Steps

1. **Review.** Activate one read-only `design-reviewer-agent` with the exact page and frame
   names. Do not pass your own conclusions or earlier findings.
2. **Verify.** Check each finding against the frames. Discard the findings that do not
   hold, and say why.
3. **Report.** Write the full critique in the chat, following the structure of
   `reference/critique.md`: the header (`Method: Design Reviewer (A)`), the Design Health
   Score table, the Design Specificity Verdict, the Overall Impression, What's Working, the
   Priority Issues tagged P0 to P3 (what, why it matters, fix), the Persona Red Flags, the
   Minor Observations and the Questions to Consider.
4. **Ask.** Last, after the report, ask 2 to 4 targeted questions about the actual
   findings (priority, design intent, scope), following
   `documentation/prompts/interview-prompt.md`. With fewer than 3 Priority Issues, write
   `Questions skipped: <N> priority issues` instead.

## Completion

Finish when the full critique is in the chat and the questions, or the skip line, close it.
Name the frames that need `/design` and report the next step.
