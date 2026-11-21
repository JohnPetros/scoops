---
description: Page ownership, frame naming and component placement rules for the Scoops Doop canvas, plus the helper that opens the canvas in a dedicated Chrome profile.
---

# Doop Design File Rules

This document defines page ownership, frame naming and component placement in
the `Scoops` Doop canvas (`https://doop.design/c/ams11lLQ8a`). It complements
[`design.md`](../design.md) (approved references and tokens).

## Opening Doop

Open the canvas with the repository helper instead of a regular browser window:

```bash
pnpm doop
pnpm doop <url>
```

`scripts/open-doop.mjs` starts a dedicated Chrome instance with a `Scoops`
profile and background-throttling disabled, so its tabs never sleep. The profile
keeps its own Doop login. When the profile is already open, the page opens in a
new window of it, and the script warns when the open window lacks the keep-awake
flags: close every window of that profile and run it again. The helper supports
Linux, macOS and WSL (where it starts the Windows Chrome).

## Canvas pages

The `Scoops` canvas has five pages, each with one role. Put every frame on the page
that owns it and read page IDs through the Doop MCP (`get_canvas`) instead of
hard-coding them. Every Doop MCP call takes an `agent_name`.

| Page | Contains | Frame name |
| --- | --- | --- |
| 🖥️ Desktop | Complete desktop screens, 1440 wide (1440 × 900 by default), their states and their dialogs | `<Module> / <Page> / <Component> / <State or variant> / Desktop` |
| 📱 Mobile | The mobile version of the Desktop screens, 390 × 844 | `<Module> / <Page> / <Component> / <State or variant> / Mobile` |
| 🧩 Components | Doop components only | Components named by domain, such as `Sales / Cart` and `Button` |
| 🎨 Design System | The visual reference of the tokens in `design.md` and approved visual proposals | `Design System / <Name>` |
| 📊 Presentation | Presentation slides about the product | `Presentation / <Deck> / Slide <n>` |

## Frames and sections

A Doop frame is an HTML artboard. Frames cannot nest and the canvas has no section
object, so the rules below replace both. Drawing or changing frames follows the `design`
workflow and reviewing them the `review-design` workflow
(`documentation/prompts/design-prompt.md`, `documentation/prompts/review-design-prompt.md`).

- Draw every frame with HTML that uses the tokens of the `scoops-design-system`
  guideline (`var(--color-*)`, `var(--font-body)`) and never a raw hex value that a
  token already covers.
- Use Lucide icons through the `doop.design/icons/iconify/lucide` URLs.
- A **section** is a background frame named `Section / <Module> / <Page>`, sized to
  cover the frames of that page, with the frames placed on top of it. Moving a
  section does not move its frames, so move them together. Keep the section's
  title and counts in step with its frames when a task adds or removes one.

## Screen frame names

The name of a frame on the Desktop and Mobile pages has up to five segments, in
this order, separated by ` / `:

1. **Module:** the business module name from [`modules.md`](../modules.md)
   (`Identity`, `Billing`, `MRP`, `PDV`, `Analytics`, `Communication`).
2. **Page:** the application page (`Sign-in`, `Inventory`).
3. **Component:** the part of the page the frame draws, when it is not the whole
   page (`Dialog`).
4. **State or variant:** the drawn state, when it is not the default (`loading`,
   `failed to load`).
5. **Viewport:** `Desktop` or `Mobile`, always the last segment.

- Module, page and viewport are required. Omit the component and the state when
  they do not apply: `PDV / Sales / Desktop` is the whole page in its default
  state and `PDV / Sales / loading / Mobile` is its loading state.
- The Desktop and Mobile versions of the same frame differ only in the last
  segment.
- Do not rename frames a task does not touch; rename a legacy frame to this
  pattern when a task changes it, together with its references in Specs, PRDs and
  review records.

## Rules per page

- **Desktop and Mobile** contain screens only. Assemble them with `<doop-use>`
  instances of the components on the Components page and draw an element as plain
  HTML only when no component fits. Authentication screens are grouped in an
  `Identity` section on both pages.
- **Mobile version.** When a screen already has a Mobile version, update it in the
  same task that changes the Desktop version and keep the names paired. Do not
  create a Mobile version for states that `design.md` excludes; they follow the
  same components and layout rules. On Mobile screens, use the 44 px control
  height (`control-height`) as the touch target.
- **Dialogs** are drawn as independent frames sized to the dialog itself (for
  example `PDV / Sales / Dialog / Empty cart / Desktop`), never as a full screen
  with a backdrop.
- **Components** holds reusable elements and nothing else: never place a screen or
  a loose example on it. Extract an element to this page when it repeats, with the
  same purpose, three or more times across screens. Use `/` for hierarchy
  (`Sales / Cart`), and name variant properties and values consistently with the
  existing components (`Type`, `State`, `Tone`). Edit the component here
  (`update_component`), never an instance on a screen. After editing it, check
  the screens that use it and confirm the instance overrides survived, because
  editing a component can reset an instance's visibility or text.
- **Design System** shows the tokens of `design.md`: colors, typography, spacing,
  radius, shadows and principles, organized in the token sets of the canvas.
  Update it in the same task whenever those sources change and keep the tokens in
  the canvas (`create_tokens`) in step with `design.md` so it never drifts. It is
  reference material: do not place screens or components on this page.
- **Presentation** holds slides only. Rendered previews of product screens in a
  slide point at the Doop frame, so they follow that frame when it changes.
- Do not create new pages without asking the user. A screen without a matching
  page keeps belonging to Desktop or Mobile.
