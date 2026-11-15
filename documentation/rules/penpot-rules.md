---
description: Page ownership, frame naming and component placement rules for the Scoops Penpot design file, plus the helper that keeps the Penpot MCP plugin connected.
---

# Penpot Design File Rules

This document defines page ownership, frame naming and component placement in
the `scoops` Penpot file. It complements [`design.md`](../design.md) (approved
references and tokens).

## Opening Penpot for the MCP plugin

The Penpot MCP plugin loses its connection when the browser puts the Penpot tab
to sleep. Open Penpot with the repository helper instead of a regular browser
window:

```bash
pnpm penpot
pnpm penpot <url>
```

`scripts/open-penpot.mjs` starts a dedicated Chrome instance with a `Scoops`
profile and background-throttling disabled, so its tabs never sleep. The profile
keeps its own Penpot login. When the profile is already open, the page opens in a
new window of it, and the script warns when the open window lacks the keep-awake
flags: close every window of that profile and run it again. The helper supports
Linux, macOS and WSL (where it starts the Windows Chrome).

## File pages

The `scoops` file has four pages, each with one role. Put every frame on the page
that owns it and read page IDs through the Penpot MCP (`execute_code`) instead of
hard-coding them.

| Page | Contains | Frame name |
| --- | --- | --- |
| 🖥️ Desktop | Complete desktop screens, 1440 wide (1440 × 900 by default) | `<Module> / <Page> / <Component> / <State or variant> / Desktop` |
| 📱 Mobile | The mobile version of the Desktop screens, 390 × 844 | `<Module> / <Page> / <Component> / <State or variant> / Mobile` |
| 🧩 Components | Main components and variant sets only | Boards named by domain, such as `Sales / Cart` and `Button` |
| 🎨 Design System | The visual reference of the tokens in `design.md` | `Scoops / Tokens · Dark & Light` |

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

- **Desktop and Mobile** contain screens only. Assemble them with instances of the
  components on the Components page and draw an element as a plain frame only when
  no component fits. Authentication screens are grouped in an
  `Identity · <Screen>` section on both pages.
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
  existing components (`Type`, `State`, `Tone`). Edit the main component here,
  never an instance on a screen. After editing it, export the screens that use it
  and check that the overrides survived, because editing a main component can
  reset an instance's visibility or text.
- **Design System** shows the tokens of `design.md`: colors, typography, spacing,
  radius, shadows and principles, organized in the token sets of the file. Update
  it in the same task whenever those sources change and bind the swatches to the
  tokens so it never drifts. It is reference material: do not place screens or
  main components on this page.
- Do not create new pages without asking the user. A screen without a matching
  page keeps belonging to Desktop or Mobile.
