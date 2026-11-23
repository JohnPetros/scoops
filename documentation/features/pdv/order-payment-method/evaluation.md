---
feature: "pdv/order-payment-method"
spec: ./spec.md
spec_revision: 1
plan: ./plan.md
status: ready
updated_at: 2026-11-22
---

# Evaluation

Evaluation of Spec revision `1` against the current implementation.

Current result: `All 76 Plan rows completed, --require-plan passes. MV-01 to MV-03 passed on the real Server, PostgreSQL and web, except the Combo case (FND-04). Implementation and Visual reviews are done and their verified findings are fixed (FND-06, 08 to 12). FND-04 is an explicit user waiver, FND-05 is decided (D-12), FND-01 is unrelated. Ready locally for conclusion.`

## Acceptance matrix

| Criterion | Evidence | Status |
| --- | --- | --- |
| AC-01 | Web widget tests (selector, cart); MV-01, MV-02; EV-11 | passed |
| AC-02 | Selector widget test; Playwright new-sale keyboard case; MV-01, MV-02; EV-12 (focus ring after FND-06) | passed |
| AC-03 | Cart widget tests; Playwright new-sale case; MV-01, MV-02; EV-11 | passed |
| AC-04 | Cart widget and hook tests | passed |
| AC-05 | Page hook test; Playwright request assertions; Core register test; server preview controller test; MV-01 (no preview from a method change) | passed |
| AC-06 | Page hook and page tests (edits and every outcome) | passed |
| AC-07 | Page hook test; Playwright reload cases (v2 and v1). Edge FND-13 accepted | passed |
| AC-08 | Page hook test; Playwright success case; MV-01 steps 5-6. `Limpar pedido` by hook test only | passed |
| AC-09 | Page hook test; Playwright `postDataJSON`; MV-01 real request bodies | passed |
| AC-10 | Dialog widget test; MV-01, MV-02; EV-13. Combo case: real-service run not possible (FND-04), explicit user waiver, proven by widget and mocked Playwright tests only | passed with waiver (FND-04) |
| AC-11 | Server register controller test (real database); Core register test; Core mutation EV-07 | passed |
| AC-12 | Server register and get controller tests; Core register test; MV-01 (psql and GET) | passed |
| AC-13 | Core register test; server register controller test | passed |
| AC-14 | Server cancel controller test; Core cancel test; web detail test; MV-03 step 4 (#52); EV-16 | passed |
| AC-15 | Server get and list controller tests; web list, detail, print tests; SQL review of 0031; MV-03 (#48); EV-16, EV-17 | passed |
| AC-16 | Server list controller test (foreign legacy order, combinations); Core list test; Core mutation EV-07 | passed |
| AC-17 | Orders filters and page tests; Playwright orders-page; MV-03; EV-15 | passed |
| AC-18 | Confirmation, list, detail widget tests; Playwright order-page; MV-01, MV-02, MV-03; EV-14 to EV-16 | passed |
| AC-19 | Print document tests; MV-03 (print-media emulation, not a real print dialog); EV-17 | passed |
| AC-20 | Server register, list and cancel controller tests (Operator and Manager cases) | passed |

## Automated and runtime evidence

| ID | Layer | Command or scenario | Result | Status |
| --- | --- | --- | --- | --- |
| EV-01 | Plan | `pnpm check:spec-implementation -- <spec> --plan-only` | 75 rows, 5 tasks, passed (before the summary-widget Path map correction) | passed |
| EV-02 | Static | `pnpm check:types` (validation, server, web, core) | No type errors | passed |
| EV-03 | Static | `pnpm check:code`, `pnpm check:architecture`, `pnpm check:test-integrity` | Biome 0 errors (19 warnings, none new errors); no dependency violations; test integrity PASSED (30 changed test files) | passed |
| EV-04 | Core | `pnpm --filter @scoops/core test` | 389 files, 2027 tests passed | passed |
| EV-05 | Web unit | `pnpm --filter web test` | 253 files, 1087 tests passed | passed |
| EV-06 | Server | `pnpm --filter server test` (testcontainers PostgreSQL) | 100 of 103 files pass, including all PDV controller tests and search-global. 3 files (6 tests) fail: Inngest/Mailpit email-job tests with `EmailDeliveryUnavailableError`; no Mailpit service is running (`docker compose ps` empty) | passed for PDV; 3 unrelated files fail (FND-01) |
| EV-07 | Core mutation | `pnpm --filter @scoops/core test:mutation --files src/pdv/use-cases/register-order-use-case.ts src/pdv/use-cases/list-orders-use-case.ts` | register 71.43%, list 80.00%. 0 survivors or uncovered mutants on changed lines after the guard-message assertion (first run left one: the guard message) | passed |
| EV-08 | Path map | `pnpm check:spec-implementation -- <spec> --require-plan` | 76 rows completed, 5 tasks completed (run before reviews; rerun at closure) | passed |
| EV-10 | Policy | Complete Web Playwright suite and workspace coverage runs | Not run locally by decision: the repository now scopes local checks to changed code (`tooling.md` Local check scope). PR CI runs both and enforces the coverage floors | not_applicable |
| EV-18 | Web fidelity fixes | `vitest run src/ui/pdv` 57 files, 202 tests; `tsc --noEmit`; Playwright `new-sale-page`, `orders-page`, `order-page` 62 passed (default port 4001, targeted files only); biome no errors | passed |
| EV-19 | Core/Server proof fixes | Core register test 60 passed; server `list-orders` and `register-order` controller tests 26 passed; mutation 70.78% / 80.00%, 0 survivors on changed lines | passed |
| EV-09 | Web Playwright (mocked transport) | `new-sale-page.test.ts` 28 passed; `orders-page.test.tsx` + `order-page.test.tsx` 34 passed (builder runs) | Covers AC-02, 03, 05, 07, 08, 09, 17, 18, 19 web contract | passed |

## Manual evidence

| ID | Scenario | Criteria | Expected | Observed | Status |
| --- | --- | --- | --- | --- | --- |
| MV-01 | Register orders with each method on desktop (1481x1050, seeded Operator, real Server and PostgreSQL) | AC-01, 02, 03, 08, 10, 18 | Disabled button with hint and linked reason; keyboard selection; dialog rows per frame; registered screen shows the long label; cart cleared after success | All observed. Orders #54 credit-card, #55 pix, #56 debit-card, #57 cash returned 201 with the same `paymentMethod`; `GET /orders/:id` and `psql` agree; no preview carried a method; dialog showed `Sem canal` and no Combo row for the no-channel run; no console or network errors after login. Registered heading reads `Pedido registrado` with `#0054`, not the literal MV step wording. The Combo case could not run: `Calda de chocolate` is disabled in the seed catalog, so no Combo applied (see FND-04) | passed, Combo part blocked |
| MV-02 | Payment-method elements at 390x844 (Operator) | AC-02, 03, 10, 18 | Options at least 44x44, tap and keyboard, reason, no horizontal scroll | Options measure 76.5x44; tap and arrow keys work; reason and disabled button correct; order #58 (cash) shows the method on the registered screen, the card and the detail; no horizontal scroll; `Dinheiro` label not truncated with Manrope loaded; option icons hidden below `sm` (FND-05) | passed |
| MV-03 | History filter, older order, cancellation and print (Manager) | AC-14, 15, 17, 18, 19 | Filters, no-results copy, `Não informado`, cancel keeps method, 80 mm fit | Each method and `none` filter right in URL and request, combine with channel, status, search and custom period, survive a period change, reset on `Limpar filtros`; invalid `voucher` URL falls back to all. Seeded order #48 set to NULL shows `Não informado` in list, detail and both prints, API omits the field. Order #52 canceled (200) keeps `credit-card` in API, database, detail and prints. `Cartão de crédito` is 100/100 px at 80 mm, no wrap. Five-control filter bar fits at 1481px. Prints verified through print-media emulation, not a real print dialog | passed |

## Visual evidence

Visual evidence uses `EV-*` identifiers with `Type = visual`.

| ID | Type | Surface and state | Viewport | Reference | Implementation | Differences | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EV-11 | visual | New sale cart with method / no method | 1481x1050, 390x844 | `Sjszt88Vy3`, `GM5IILIuvV`, `JUXY5h0HUK`, `r3cktAWH_L` | `apps/web/.playwright-cli/screenshots/mv/mv01-00..03`, `mv02-01..02`, `fix-b-disabled-register-*` | Selector, hint, lock reason match. Disabled button fixed to muted bg and tertiary text (FND-08). Icons hidden below `sm` (D-12, allowed); `plus` icon on the cart button; no channel/payment dividers; no `circle-minus` before `Sem canal` | passed_with_authorized_difference |
| EV-12 | visual | Selector keyboard focus | 1481x1050, 390x844 | Component `c41h098wf0` (2px primary outline, offset 2) | `mv/fix-a-selector-focus-1481.png`, `fix-a-selector-focus-390.png` | Solid 2px primary outline after FND-06 fix | passed |
| EV-13 | visual | Confirmation dialog | 1481x1050 (MV-01), 390x844 | `TqG_x6kiCi`, `YwLqBX3gb5` | `mv/mv01-04`, `mv02-03`, `fix-c-confirm-dialog-channel-390.png` | Rows, order, copy match; `store` icon on mobile only; bottom sheet excluded (D-01); Combo row not drawn in a real run (FND-04) | passed_with_authorized_difference |
| EV-14 | visual | Order registered | 1481x1050 | `KIUqwy2Oub` | `mv/mv01-05`, `order-registered-desktop.png` | Four metadata items match; existing `Imprimir pedido` kept | passed |
| EV-15 | visual | Orders list, filter bar, active filter, no results | 1481x1050, 390x844 | `El_Tyf6DvY`, `korP9Bn-Fs`, `k-Kx7Pojmh` | `mv/mv03-02`, `mv03-04`, `mv02-05`, `fix-d-orders-payment-filter-1481.png` | Column, filter position, active payment filter outline and icon match. Frame outlines every active filter; only payment is outlined. Mobile card keeps its 2x2 grid with a `Pagamento` cell | passed_with_authorized_difference |
| EV-16 | visual | Order detail registered, canceled, older | 1481x1050, 390x844 | `llb-po6tHB`, `wakufK5945`, `pXugJaeDFa` | `mv/mv03-06`, `mv03-08`, `mv03-09`, `fix-e-canceled-detail-1481.png`, `mv02-06` | Row between `Itens` and `Registrado por`; `Não informado` follows F-02. Canceled frame `wakufK5945` not captured side by side; banner copy excluded by the Spec | passed |
| EV-17 | visual | Prints A4 and 80 mm, registered, canceled, older | 794x1123, 302x773 | `raIsKmnaK_`, `tWdH18xMnC`, `tFTTSt21DZ`, `e7c3235Awk` | `mv/mv03-print-*`, `fix-e-print-canceled-a4.png`, `fix-e-print-canceled-80mm.png` | `Pagamento` row position and label match; `Cartão de crédito` 100/100 px at 80 mm (F-03 closed). Frame-only extras (`CANCELADO` stamp, struck total, `Motivo`, date and percent formats) are outside the Spec | passed |

## Rule and documentation compliance

| Authority | Reference | Result | Notes |
| --- | --- | --- | --- |
| Spec Path map and Plan | `pnpm check:spec-implementation -- <spec> --require-plan` | passed | 76 rows completed. One non-material Path map addition (`order-registration-summary/index.tsx`) recorded in the Spec |
| Rule Pack (Core, Validation, REST, Database, UI, routing, tests, Doop) | Spec section 5; Implementation Reviewer read of the diff | passed | No weakened or removed assertions; new files follow conventions; migration 0031 has only `CREATE TYPE` and `ADD COLUMN`, no backfill; snapshot diff shows no drift |
| REST client parity | `apps/server/rest-client/pdv/orders.rest` | passed | Every register, replay, reprice, review, correction and conflict body carries `paymentMethod`; missing, invalid, `none` and method-filter examples exist; 422 bodies corrected to the runtime text. The older `Malformed registration body` example still shows `Invalid request` (pre-existing, not changed) |
| Local check scope policy | `AGENTS.md`, `documentation/tooling.md`, `documentation/prompts/implement-spec-prompt.md` | passed | Edited at the user's request during this work (local checks run only for changed code; the complete Web Playwright suite runs only in CI). Outside the Path map; included in the same PR because conclude-spec delivers all shareable local changes |
| Excluded local data | `apps/web/.playwright-cli/` captures, `.env.local` | excluded | Environment-specific local artifacts; not committed |

## Delivery disposition

| PRQ | Disposition | Mapped FR / AC | Notes |
| --- | --- | --- | --- |
| PRQ-05 — Cart Assembly and Editing (payment-method part) | fully delivered | FR-01 to FR-04, FR-06; AC-01 to AC-09 | FND-13 accepted edge |
| PRQ-08 — Order Confirmation and Registration (payment-method part) | fully delivered | FR-05 to FR-08; AC-10 to AC-13 | AC-10 Combo case by waiver (FND-04), proven by widget and mocked Playwright only |
| PRQ-09 — Order Snapshot (payment-method part) | fully delivered | AC-12, AC-14, AC-15 | |
| PRQ-10 — Order History (payment-method part) | fully delivered | AC-16, AC-17, AC-18 | |
| PRQ-11 — Permissions, Navigation and Isolation (payment-method part) | fully delivered | AC-16, AC-20 | |
| PRQ-12 — Performance, Responsiveness and Accessibility (new elements) | fully delivered | AC-02, AC-03 | D-12 allowed deviation |
| PRQ-15, PRQ-16 | fully delivered for the Spec scope | AC-19 and print and filter parity | |

## Findings

| ID | Classification | Source | Affected evidence | Status | Resolution |
| --- | --- | --- | --- | --- | --- |
| FND-01 | Environment failure, unrelated to PDV | `pnpm --filter server test`: 3 email-job files fail with `EmailDeliveryUnavailableError`. Still 6 tests failing after starting the compose Mailpit (the files use their own Docker Mailpit and Inngest setup) | EV-06 | accepted_non_blocking | Not caused by PDV code (jobs outside this delivery); not compared against `main`; PR CI will report it |
| FND-02 | Path map correction | T4 added `order-registration-summary/index.tsx`, not in the Path map | EV-08 | resolved | Added to Spec Path map (non-material) and Plan T4 |
| FND-04 | Environment, not a feature defect; waived | MV-01: `Calda de chocolate` disabled in the Açaí tropical dialog despite stock 25, so no Combo could apply | MV-01, AC-10 (Combo case) | accepted_non_blocking | Explicit user waiver: the Combo row is proven only by `order-registration-dialog.test.tsx` and mocked Playwright, not by a real-service run. Not reported as passed real-service proof. Seed or catalog cause not investigated |
| FND-05 | Deviation from frames, decided | Option icons are hidden below `sm` (`payment-method-selector/index.tsx`), mobile frames `JUXY5h0HUK` and `r3cktAWH_L` draw them. Not in the Spec's allowed deviations | MV-02, AC-02 | accepted_non_blocking | User decided to allow hiding the icons below `sm`; recorded as D-12 and an allowed deviation in the Spec |
| FND-06 | Defect, fixed | Selector keyboard focus ring never showed: `outline-none` set the outline style to none, so `focus-visible:outline-2` had no effect (Design Contract asks 2px primary outline, offset 2) | MV-02, AC-02 | resolved | Added `focus-visible:outline-solid` in `radio-group.tsx`; verified in the real app (`:focus-visible` solid 2px, offset 2px); web widget tests for shadcn and new-sale-cart pass |
| FND-07 | Environment, pre-existing | `pnpm --filter web test:auth:setup` fails at `tests/auth.setup.ts:52`: storage state now has two product-telemetry localStorage entries | MV setup | accepted_non_blocking | Sessions were created by signing in through the Playwright CLI instead. Unrelated to this delivery |
| FND-08 | Design Contract gap, fixed | Visual Reviewer: disabled `Registrar pedido` kept `shadow-primary` and a faded primary look; frames use `--color-bg-muted` + `--color-text-tertiary` | EV-11, AC-03 | resolved | Scoped to the cart button; computed bg and color match the tokens, no shadow |
| FND-09 | Design Contract gap, fixed | Visual Reviewer: active payment filter had no primary outline and a static `wallet` icon (frame `korP9Bn-Fs`) | EV-15, AC-17 | resolved | Primary outline and the selected method's icon; idle state unchanged |
| FND-10 | Gap, fixed | Implementation Reviewer: confirmation dialog read `Sem canal` when a restored `channelId` could not be resolved while the order would register with it | AC-10 | resolved | Dialog shows `Canal indisponível`, a linked alert reason and blocks `Registrar pedido`; copy is the builder's wording, to confirm. Covered by widget and hook tests only, not reproduced in the real app |
| FND-11 | Proof gap, fixed | Implementation Reviewer: Core test for a method-free repriced token never reached its assertion | EV-04, EV-07, AC-05 | resolved | Rewritten with real stale facts and a repriced result; mutation rerun 70.78% and 80.00%, 0 survivors on changed lines |
| FND-12 | Proof gap, fixed | Server list test could not show tenant scoping of `paymentMethod=none`; stock movement not asserted | AC-16, AC-11 | resolved | Foreign legacy order, channel and period combinations, and an empty stock ledger assertion added |
| FND-13 | Ambiguity, accepted | A method chosen while the cart has no items is not saved, so a reload after removing the last line loses it. FR-04 mentions removals and reload, D-04 and AC-07 cover only a saved cart with items | AC-06, AC-07 | accepted_non_blocking | Matches D-04 and the tested behavior; confirm if the Spec should say so |
| FND-14 | Visual, low, accepted | Missing channel and payment dividers in the cart; no `circle-minus` before `Sem canal`; mobile order card keeps its 2x2 grid; frames outline every active filter | EV-11, EV-15 | accepted_non_blocking | Not in the Spec's inventory as required; confirm if wanted |
| FND-03 | Test gap | Mutation survivor on the guard error message (`register-order-use-case.ts:785`) | EV-07 | resolved | Test now asserts the message; rerun shows 0 survivors on changed lines |

## Lessons learned

| Finding | Authority path | Disposition | Reason |
| --- | --- | --- | --- |
| Complete Web Playwright suite ran locally for ~23 min | `documentation/tooling.md`, `AGENTS.md`, `implement-spec-prompt.md` | Updated | Local checks now scope to changed code; CI owns full suites |
| FND-06 Tailwind v4 `outline-none` needs `outline-solid` for a focus ring | Design / UI Rule Pack | No change | Component-local fix in `radio-group.tsx`; not a global rule |
| FND-09 unlayered `* { border-color }` overrides layered border utilities | Design / UI Rule Pack | No change | Pre-existing global CSS quirk; the outline workaround is feature-local |

## PR CI quality gate

| ID | Workflow | Head SHA | Result | Run |
| --- | --- | --- | --- | --- |

## Continuation handoff

- **Branch/candidate:** `feat/payment-method`, working tree
- **Progress:** Spec in_progress, all Plan tasks completed; MV and both reviews done, fixes applied
- **Interrupted/uncommitted paths:** none
- **Unfinished criteria:** none (AC-10 Combo case accepted with a waiver, FND-04)
- **Blockers and stale evidence:** none. Waivers and accepted findings: FND-01, 04, 13, 14. Complete Web Playwright suite and workspace coverage are left to PR CI (EV-10)
- **Latest checkers:** EV-01 passed
- **Next useful action:** run conclude-spec when publication is authorized; commit all changes (including the policy docs), open the PR, and wait for PR CI on the head SHA

## History

| Date/Time | Event |
| --- | --- |
| 2026-11-22 | Implementation started |
| 2026-11-22 | MV-01..03 run on the real stack; Implementation and Visual reviews done; fixes applied; FND-04 waived by the user; Evaluation set ready locally |
