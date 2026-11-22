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

The `Scoops` canvas has one page for each business module, a shared page, and two pages
for the design reference and the presentation. A page is a small board: it holds the
frames of one module, so it loads fast. Put every frame on the page that owns it and read
page IDs through the Doop MCP (`get_canvas`) instead of hard-coding them. Every Doop MCP
call takes an `agent_name`.

| Page | Contains | Frame name |
| --- | --- | --- |
| 🎨 Design System | The visual reference of the tokens in `design.md` and approved visual proposals | `Design System / <Name>` |
| 🧩 Shared | The components that more than one module uses (layout, navigation, forms, filters, pagination) | A component name, such as `Sidebar` and `Button Primary` |
| 🔐 Identity, 💳 Billing, 🧾 PDV, 🍦 MRP, 📈 Analytics, 🔔 Communication | The screens of that module, their states, dialogs and mobile versions, and the components only that module uses | `<Module> / <Page> / <Component> / <State or variant> / <Desktop\|Mobile>` for screens, a component name for components |
| 📊 Presentation | Presentation slides about the product | `Presentation / <Deck> / Slide <n>` |

A module page has no tab for the viewport: the Desktop and Mobile versions of a screen sit
next to each other in the same section.

## Frames and sections

A Doop frame is an HTML artboard. Frames cannot nest and the canvas has no section
object, so the rules below replace both. Drawing or changing frames follows the `design`
workflow and reviewing them the `review-design` workflow
(`documentation/prompts/design-prompt.md`, `documentation/prompts/review-design-prompt.md`).

- Draw every frame with HTML that uses the tokens of the `scoops-design-system`
  guideline (`var(--color-*)`, `var(--font-body)`) and never a raw hex value that a
  token already covers.
- Use Lucide icons through the `doop.design/icons/iconify/lucide` URLs.
- A **section** is a background frame named `Section / <Module> / <Page>` (for a tab of
  a detail page, `Section / <Module> / <Page> / <Tab>`). Each screen has one section, and
  it holds every frame of that screen: the Desktop version, its states, its dialogs and
  its Mobile versions. The section is sized to cover them, with the frames placed on top
  of it. Moving a section does not move its frames, so move them together.
- Each module page ends with a `Section / <Module> / Components` section that holds the
  components only that module uses. The `🧩 Shared` page has a single
  `Section / Shared / Components` section. A component used by two or more modules
  belongs on `🧩 Shared`.
- A section header shows the module, the screen and a count such as
  `5 screens · 3 dialogs · 2 mobile`. Keep the header and the section size in step with its
  frames when a task adds, moves or removes one.
- Lay a section out in rows: the screens and their states first (Desktop first, then the
  Mobile versions), the dialogs in the row below, `48 px` of padding at the sides and
  `144 px` above the first row for the header.
- Keep the sections of a page one under the other with at least `160 px` between them, so
  they never overlap.

## Screen frame names

The name of a screen frame has up to five segments, in
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

- **Module pages** contain screens and the module's own components. Assemble a screen
  with `<doop-use>` instances of the components (the module's own and the shared ones) and
  draw an element as plain HTML only when no component fits. Authentication screens
  belong to the `🔐 Identity` page.
- **Mobile version.** When a screen already has a Mobile version, update it in the
  same task that changes the Desktop version, keep the names paired and keep both in the
  same section. Do not create a Mobile version for states that `design.md` excludes; they
  follow the same components and layout rules. On Mobile screens, use the 44 px control
  height (`control-height`) as the touch target.
- **Dialogs** are drawn as independent frames sized to the dialog itself (for
  example `PDV / Sales / Dialog / Empty cart / Desktop`), never as a full screen
  with a backdrop. They sit in the section of the screen that opens them.
- **Components** are the reusable elements of a module or of the `🧩 Shared` page, and
  each one is shown once, in the components section of its page: never place a screen or
  a loose example there. Extract an element to a component when it repeats, with the same
  purpose, three or more times across screens, and move it to `🧩 Shared` when a second
  module starts using it. Use `/` for hierarchy (`Sales / Cart`), and name variant
  properties and values consistently with the existing components (`Type`, `State`,
  `Tone`). Edit the component there (`update_component`), never an instance on a screen.
  After editing it, check the screens that use it and confirm the instance overrides
  survived, because editing a component can reset an instance's visibility or text.
- **Design System** shows the tokens of `design.md`: colors, typography, spacing,
  radius, shadows and principles, organized in the token sets of the canvas.
  Update it in the same task whenever those sources change and keep the tokens in
  the canvas (`create_tokens`) in step with `design.md` so it never drifts. It is
  reference material: do not place screens or components on this page.
- **Presentation** holds slides only. Rendered previews of product screens in a
  slide point at the Doop frame, so they follow that frame when it changes.
- Do not create new pages without asking the user. A new module gets its own page when
  it is added to [`modules.md`](../modules.md).
