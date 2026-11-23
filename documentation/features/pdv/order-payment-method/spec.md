---
title: Order payment method recording
status: in_progress
revision: 1
source:
  type: issue
  ref: https://github.com/rafinel/scoops/issues/73
scope:
  - packages/core (PDV orders)
  - packages/validation (PDV order schemas and orders route search)
  - apps/server (PDV orders REST and persistence)
  - apps/web (PDV New sale, Orders, Order detail and order print)
last_updated_at: 2026-11-22
---

# Order payment method recording

## 1. Context and scope

**Objective:** Operators record how the customer paid (`Pix`, credit card, debit card or cash) on
every new order. Operators and Managers can then see, filter and print the payment method of each
order. The method is a recorded label only.

**Source:** GitHub issue [rafinel/scoops#73](https://github.com/rafinel/scoops/issues/73), traced
to [`documentation/prds/pdv.md`](../../../prds/pdv.md) PRQ-05 (main) and PRQ-08, PRQ-09, PRQ-10,
PRQ-11, PRQ-12, PRQ-15 and PRQ-16, with Journeys E, K, N and P.

**Depth:** `complete`. The delivery crosses four workspaces, adds a persisted column and a
migration, changes a public REST body and query, and has several UI states.

**Baseline and gap:** No workspace has a payment-method concept today. The order entity, the
registration input, the `orders` table, the list filters, the cart, the confirmation dialog, the
history and the print carry no method. The registration body schema is strict, so it currently
rejects any `paymentMethod` field. The confirmation dialog shows only `Itens`, `Subtotal` and
`Total`, and a successful registration keeps the selected channel in the cart.

**Scope:**

- A required payment-method selector in the New sale cart, with a stated reason while no method
  is chosen.
- The method lifecycle in the cart, including reload restoration and clearing after success.
- The confirmation dialog summary rebuilt as the Doop frame draws it.
- Server-authoritative validation and atomic, immutable storage of the method.
- `Não informado` for orders registered before this change.
- A payment-method filter in order history.
- The method on the Order registered screen, the list line, the detail and both print formats.

**Exclusions:**

- **Payment features.** Payment processing, Pix QR codes, payment providers, card terminals and
  payment confirmation. Amount received, change, cash drawer and reconciliation. Split payment,
  extra or Manager-configurable methods, and surcharges or discounts by method.
- **Analytics.** Payment-method indicators in Analytics.
- **Mobile layout rework.** The mobile frames introduce a full-screen cart panel, the
  `Mobile Top Bar` component, a bottom-sheet confirmation, a `Filtros` button with filter chips,
  `Carregar mais pedidos` and a New sale summary bar. These are not built (decision D-01). The
  mobile frames are the reference for the payment-method elements only, placed in today's stacked
  mobile layout. There is no Mobile version of the Order registered screen.
- **Neighbouring gaps (D-07), recorded and not built:**
  - Order detail hides the channel section when the order has no channel, although PRQ-09 asks
    for `Sem canal`.
  - The New sale page declares its conflict dialogs inline, against the UI rule on nested
    components.
  - The register example in `apps/server/rest-client/pdv/orders.rest` shows `"channel": null`,
    although the API omits the field.
  - Existing cart icon buttons are 32 px, below the 44 px target.
  - `packages/core/src/pdv/domain/entities/order.ts` exports two types, against the
    one-type-per-file rule. The delivery extends them in place.
- **Frame-only details.** The canceled Order detail frame adds banner copy that the current app
  does not render. The cancel dialog does not show the method.

**Resolved decisions and accepted assumptions:**

| ID | Decision | Source |
| --- | --- | --- |
| D-01 | The mobile frames are used only for the payment-method elements, in the current stacked layout. | User, Q1 = A |
| D-02 | The confirmation dialog is rebuilt as frame `PDV / New sale / Dialog / Confirm order / Desktop` draws it: title, warning, channel, method, items, Combo rows, total and button labels. | User, Q2 = B |
| D-03 | Success clears items, channel and method. `Limpar pedido` clears items and method and keeps the channel. | User, Q3 = A |
| D-04 | The method is saved with the browser cart and restored after a reload. A cart saved before this change restores without a method. | User, Q4 = A |
| D-05 | Short labels (`Crédito`, `Débito`) appear only inside the selector. Every other surface uses `Cartão de crédito` and `Cartão de débito`. | User, Q5 = A |
| D-06 | The migration, server and web are released from the same merge. The web and server staging deployments run independently, so two short windows are accepted. A tab still running the previous web build gets the generic registration error from the new server until it reloads. A new web build that goes live before the new server release, including its migration, gets the same error from the previous server until that release finishes. In both windows the cart is kept and no order or stock change is written. | User, Q6 = A, Q6a = A |
| D-07 | The neighbouring gaps listed under Exclusions are recorded only. | User, Q7 = A |
| D-08 | "Next to the channel selector" means directly below it, as every frame and the `Payment Method Selector` component place it. | Doop frames |
| D-09 | While no method is selected, the cart shows the selector hint and the reason under `Registrar pedido`. The reason appears whenever no method is selected, whatever other blocker applies. | PRQ-05, frames |
| D-10 | In the confirmation dialog, no channel reads `Sem canal`, the Combo rows are omitted when no Combo applies, and the current pending (`Registrando…`) and loading texts stay. | Existing patterns, user confirmation |
| D-11 | The print frames label the row `Pagamento`. The screens use `Forma de pagamento`, except the Orders table column, which is `Pagamento`. | Doop frames |
| D-12 | Below the `sm` breakpoint (including the 390 px viewport) the selector options show text labels only, without their icons, so the four short labels fit without truncation. At `sm` and wider the icons show as drawn. | User, FND-05 |

| Source requirement | Coverage | Boundary |
| --- | --- | --- |
| PRQ-05 — Cart Assembly and Editing | partial | Payment-method capabilities and experience only. The other cart capabilities are already delivered and stay unchanged. |
| PRQ-08 — Order Confirmation and Registration | partial | Method in the summary, server rejection and atomic recording, clearing after success, and the summary rows of D-02. |
| PRQ-09 — Order Snapshot | partial | Payment-method snapshot, its immutability and `Não informado` for older orders. |
| PRQ-10 — Order History | partial | Payment-method filter, list line and detail. |
| PRQ-11 — Permissions, Navigation and Isolation | partial | Tenant isolation of the new filter and unchanged permissions. |
| PRQ-12 — Performance, Responsiveness and Accessibility | partial | Selector accessibility, 44×44 targets, keyboard use and a narrow viewport for the new elements. |
| PRQ-15 — Order Cancellation | partial | The method is preserved through cancellation and shown on canceled orders. |
| PRQ-16 — Order Printing | partial | The method or `Não informado` in the A4 and 80 mm prints. |

Partial coverage never weakens the PRD. The rest of each requirement is outside this delivery.

## 2. Behavior Contract

| ID | PRQ/source coverage | Required behavior |
| --- | --- | --- |
| FR-01 | PRQ-05, PRQ-12; Journey E | The New sale cart shows a required payment-method selector directly below the channel field. It is labelled `Forma de pagamento`, is marked `Obrigatório`, and offers `Pix`, `Crédito`, `Débito` and `Dinheiro`. A new or cleared cart has no option selected. It behaves as a single-choice group: it exposes the selected option to assistive technology, works by keyboard, and every option is at least 44×44 px on desktop and on a 390 px viewport. |
| FR-02 | PRQ-05; Journey K | While no method is selected, `Registrar pedido` is disabled. The cart shows the hint `Escolha como o cliente vai pagar para registrar o pedido.` and, under the button, the reason `Falta escolher a forma de pagamento.`, which is linked to the button for assistive technology. Choosing a method removes the hint and the reason, and enables the button when the cart is otherwise registrable. |
| FR-03 | PRQ-05, PRQ-06, PRQ-14 | Choosing or changing the method changes no price, channel adjustment, Combo saving or total. It starts no preview recalculation and no payment processing. |
| FR-04 | PRQ-05, PRQ-07, PRQ-08; Journeys K, N | The selected method is kept through item additions, edits, quantity changes and removals, channel changes, recalculation, the repriced, review and correction outcomes, failed registrations and a page reload. A successful registration clears the items, the channel and the method. `Limpar pedido` clears the items and the method and keeps the channel. |
| FR-05 | PRQ-08; Journey K | The confirmation dialog follows D-02 and D-10. It shows the title `Registrar pedido?`, the warning `A venda é registrada e o estoque é baixado. Não há reembolso nem estorno; só um gerente pode cancelar depois.`, and these rows in order: `Canal de venda` (name · signed percentage, or `Sem canal`), `Forma de pagamento` (icon and long label), `Itens` (`<n> itens · <n> unidades`), one row per applied Combo (`<Combo name>` → `Economia de <amount>`), and `Total`. Its actions are `Voltar ao carrinho` and `Registrar pedido`. |
| FR-06 | PRQ-08 | The server is authoritative. It rejects a registration whose method is missing or not one of the four values. A rejected request creates no order, consumes no order number and changes no stock. An accepted registration stores the method in the same atomic transaction as the order and its stock consumption. |
| FR-07 | PRQ-08 | Idempotent replay compares the method. Resending a registration with the same key and the same content replays the stored order. Resending it with the same key but a different method is a conflict and creates nothing. Changing the method in the cart starts a new registration request. |
| FR-08 | PRQ-09, PRQ-15 | The stored method is part of the order snapshot. It never changes after registration, including after cancellation. |
| FR-09 | PRQ-09, PRQ-10, PRQ-16 | Orders registered before this change have no method. No method is inferred or backfilled. They read `Não informado` in the list, the detail and the print. |
| FR-10 | PRQ-10, PRQ-11; Journey P | Order history has a payment-method filter, `Todas as formas de pagamento` by default, offering `Pix`, `Cartão de crédito`, `Cartão de débito`, `Dinheiro` and `Não informado`. It combines with search, period, channel and status. It is kept in the URL, resets the page to 1 when it changes, as the channel and status filters do, survives period changes, is reset by `Limpar filtros`, and is named in the filtered empty state. Results are limited to the current establishment. |
| FR-11 | PRQ-08, PRQ-09, PRQ-10, PRQ-15 | The method, or `Não informado`, appears with long labels and the frame icons: on the Order registered metadata (`Forma de pagamento`), in the Orders table column `Pagamento` and on the mobile order card, and in `Informações do pedido` on the detail of registered and canceled orders. |
| FR-12 | PRQ-16 | The A4 and 80 mm prints show a `Pagamento` row with the long label, or `Não informado`. |
| FR-13 | PRQ-11 | Permissions are unchanged. Operators and Managers can register orders with a method and filter by it. No establishment's orders are returned or filtered for another establishment. |

| ID | FR coverage | Requirement | Given | When | Then | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- |
| AC-01 | FR-01 | Empty selector | A new cart, or a cart after success or `Limpar pedido` | The cart renders | The selector sits below the channel field, labelled `Forma de pagamento` with `Obrigatório`, offering `Pix`, `Crédito`, `Débito` and `Dinheiro`, with no option checked | Web widget tests (selector, cart); MV-01 |
| AC-02 | FR-01 | Selector accessibility | The cart is visible on desktop or at 390 px | The user tabs into the selector and uses arrow keys or Space, or taps an option | Focus enters the group. Arrow keys move between options and select them. The checked option is exposed as checked. Every option measures at least 44×44 px | Selector widget test; Playwright `tests/pdv/new-sale-page.test.ts` keyboard case; MV-01, MV-02 |
| AC-03 | FR-02 | Blocked registration | A registrable cart with no method | The cart renders, then a method is chosen | First, `Registrar pedido` is disabled, the hint and `Falta escolher a forma de pagamento.` are visible, and the button references the reason through `aria-describedby`. After the choice, the hint and reason disappear and the button is enabled | Cart widget tests; Playwright new sale case; MV-01 |
| AC-04 | FR-02 | Reason with other blockers | An empty cart, or a cart whose preview is pending or invalid, with no method | The cart renders | The button is disabled and the missing-method reason is still shown | Cart widget tests |
| AC-05 | FR-03 | Label only | A previewed cart | The user picks and changes the method | No `POST /orders/preview` is sent because of the change. No preview body contains `paymentMethod`. Subtotal, channel adjustment, Combo savings and total are unchanged | New sale page hook test; Playwright request assertion; Core register test that the same preview token verifies for every method |
| AC-06 | FR-04 | Kept through edits and outcomes | A cart with a selected method | The user edits, removes or changes the quantity of a line, changes the channel, or registration returns repriced, review, correction, 5xx, 422 or a lost connection | The selected method is unchanged and visible after each outcome | New sale page hook and page tests |
| AC-07 | FR-04 | Reload restoration | A saved cart with a method, and a cart saved in the previous storage format | The page reloads | The first cart comes back with its method. The second comes back with its items and channel and no method | New sale page hook test; Playwright reload case |
| AC-08 | FR-04 | Clearing | A cart with items, a channel and a method | Registration succeeds; separately, the user selects `Limpar pedido` | After success, the next cart has no items, no channel and no method. After `Limpar pedido`, it has no items and no method, and the channel is kept | New sale page hook test; Playwright success case |
| AC-09 | FR-04, FR-07 | Request body and key | A registrable cart | The user registers, then changes the method after a failure and registers again | `POST /orders` carries the selected `paymentMethod`. The second request uses a new idempotency key | New sale page hook test; Playwright request assertion |
| AC-10 | FR-05 | Confirmation summary | A cart with a channel, a method and an applied Combo; and a cart with no channel and no Combo | The user opens the confirmation | The dialog shows the FR-05 title, warning, rows and actions. The second cart shows `Sem canal` and no Combo row | Dialog widget test; MV-01 compared with the confirm frame |
| AC-11 | FR-06 | Server rejection | An authenticated Operator and a valid preview | `POST /orders` is sent without `paymentMethod`, and again with `paymentMethod: "voucher"` | Both return 422. No order exists, the order sequence is unchanged, and no stock movement exists. The Core use case also rejects both inputs with `BadRequestError` before opening a database transaction | Server register controller test; Core register use-case test |
| AC-12 | FR-06, FR-08 | Atomic storage | A valid registration | It is registered with each of `pix`, `credit-card`, `debit-card` and `cash` | Each returns 201 with that `paymentMethod`, and `GET /orders/:orderId` returns the same value. When stock consumption fails inside the transaction, no order and no method are stored | Server register and get controller tests; Core register test (persisted `OrderCreate`, rollback) |
| AC-13 | FR-07 | Replay with method | A registered order and its idempotency key | The same request is resent; then it is resent with a different method | The first replay returns the stored order with 200. The second returns 409 and creates no order | Core register test; server register controller test |
| AC-14 | FR-08 | Preserved through cancellation | A registered order with a method | A Manager cancels it | The canceled order keeps the same `paymentMethod`, in the API and on the canceled detail | Server cancel controller test; Core cancel test; web detail test |
| AC-15 | FR-09 | Older orders | An order row whose `payment_method` is null | The order is listed, opened and printed | The API omits `paymentMethod`. The list, detail and print show `Não informado`. Migration `0031` adds a nullable column with no default and no data update | Server get and list controller tests; web list, detail and print tests; migration SQL review; MV-03 |
| AC-16 | FR-10, FR-13 | Server filter | Orders in two establishments with each method and with none | `GET /orders` is sent with `paymentMethod=<value>` or `paymentMethod=none`, combined with search, period, channel and status; and with `paymentMethod=voucher` | Only matching current-establishment orders return. `none` returns only orders without a method. The invalid value returns 422 | Server list controller test; Core list use-case test |
| AC-17 | FR-10 | History filter UI | The Orders page | The user picks each filter option, changes the period, opens a URL with an invalid value, and selects `Limpar filtros` | The URL carries `paymentMethod=<value>` or `none` with `page=1`, and the request sends it. The filter survives the period change. An invalid URL value falls back to all methods. `Limpar filtros` resets it. A filter with no results shows the copy naming the payment method | Orders filters and page tests; Playwright `tests/pdv/orders-page.test.tsx` |
| AC-18 | FR-11 | Read surfaces | A registered order per method, and a canceled order | The Order registered screen, the Orders table and mobile card, and the registered and canceled details render | Each shows the method with its long label and icon in the positions the frames draw | Order confirmation, list and detail widget tests; Playwright `tests/pdv/order-page.test.tsx`; MV-01, MV-03 |
| AC-19 | FR-12 | Print | A registered order, a canceled order and an older order | The A4 and 80 mm prints render | Each shows `Pagamento` with the long label or `Não informado`. `Cartão de crédito` fits the 80 mm width without being cut | Print document tests; MV-03 |
| AC-20 | FR-13 | Permissions unchanged | An Operator and a Manager | Each registers an order with a method and filters history by it | Both succeed. Cancellation stays Manager only | Server register, list and cancel controller tests (existing role cases kept) |

### Design Contract

**Design source:** Doop canvas `Scoops` (https://doop.design/c/ams11lLQ8a), PDV module page. The
issue calls the page `🍦 PDV`, while `documentation/rules/doop-rules.md` lists it as `🧾 PDV`.
Locate frames by name. All frames are still `draft` and none is `ready_for_dev`. `updatedAt` values
are UTC on 2026-11-22. A frame that changes after this revision is a Design Contract change.

| Frame (page / name) | Route/surface/state | Viewport | Required visible inventory | Interaction/state coverage | Ambiguities or exclusions | Tokens/components | Validation target |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PDV / `PDV / New sale / Desktop` (`Sjszt88Vy3`, 12:52:27) | `/sales/new`, cart with a method selected | 1481×1050 | Selector band below `Canal de venda` in the `Pedido atual` card. Header `Forma de pagamento` with `Obrigatório`. Four equal options in one row. `Registrar pedido` enabled | Selected option styling | "Next to" read as below (D-08) | `Payment Method Selector`; `--color-primary`, `--color-primary-soft`, `--color-border`, `--color-bg-card` | AC-01, AC-02, MV-01 |
| PDV / `PDV / New sale / Cart / No payment method / Desktop` (`GM5IILIuvV`, 13:28:33) | Cart, no method | 390×578 (cart panel) | Selector with no option selected. Hint with `info` icon. Disabled `Registrar pedido` (`--color-bg-muted`, `--color-text-tertiary`). Reason with `lock` icon under the button. Channel `Sem canal` | Disabled state, hint, reason | The button-to-reason link is not drawn and is required by AC-03 | `--color-text-secondary` 11/600 | AC-03, AC-04, MV-01 |
| PDV / `PDV / New sale / Dialog / Confirm order / Desktop` (`TqG_x6kiCi`, 12:40:49) | Confirmation dialog | 560×399 | `receipt-text` icon tile. Title, warning, rows `Canal de venda` · `Forma de pagamento` · `Itens` · Combo · `Total` (24/900). `Voltar ao carrinho` (outline), `Registrar pedido` (primary, `check`) | Open state | Only `Pix` drawn. No-channel, no-Combo, pending and loading states follow D-10 | `--color-success` for savings | AC-10, MV-01 |
| PDV / `PDV / New sale / Order registered` (`KIUqwy2Oub`, 12:54:02) | Success screen | 1481×1050 | Metadata `Data e hora`, `Canal de venda`, `Forma de pagamento` (icon and label), `Quantidade` | Static | The frame omits `Imprimir pedido`; the existing print action stays (PRQ-16). The name lacks `/ Desktop` | Existing metadata grid | AC-18, MV-01 |
| PDV / `PDV / Orders / Desktop` (`El_Tyf6DvY`, 12:30:17) | `/orders` | 1481×1050 | Filter `wallet` + `Todas as formas de pagamento` between channel and status filters. Column `Pagamento` between `Canal` and `Itens`, with 15 px icons: `qr-code` Pix, `credit-card` Cartão de crédito, `wallet-cards` Cartão de débito, `banknote` Dinheiro, `circle-minus` Não informado in `--color-text-tertiary` | Filter closed | The open filter list is not drawn (deferred frame F-01) | Existing `Select` | AC-16, AC-17, AC-18, MV-03 |
| PDV / `PDV / Orders / No results` (`korP9Bn-Fs`, 12:30:50) | `/orders` filtered, no results | 1481×1050 | Active filter `banknote` Dinheiro with primary outline. Copy `Não encontramos pedidos com a busca, o canal, a forma de pagamento, o status e o período selecionados.` and `Limpar filtros` | Filtered empty | The subtitle difference is pre-existing and cosmetic | Existing empty state | AC-17, MV-03 |
| PDV / `PDV / Order detail / Desktop` (`llb-po6tHB`, 12:52:54) | `/orders/$orderId`, registered | 1481×1050 | `Forma de pagamento` row between `Itens` and `Registrado por` in `Informações do pedido` | Static | `Não informado` not drawn (deferred frame F-02) | Existing summary card | AC-18, MV-03 |
| PDV / `PDV / Order detail / Cancelled` (`wakufK5945`, 12:53:21) | Detail, canceled | 1481×1050 | Same `Forma de pagamento` row | Static | Banner copy is excluded. The name lacks `/ Desktop` | Existing summary card | AC-14, AC-18, MV-03 |
| PDV / `PDV / Order detail / Print A4 / Registered` (`raIsKmnaK_`, 12:47:40) | A4 print | 794×1123 | Key-value row `Pagamento` → long label, plain text, between `Canal` and `Status` | Print | Label per D-11 | `order-print.css` | AC-19, MV-03 |
| PDV / `PDV / Order detail / Print A4 / Cancelled` (`tWdH18xMnC`, 12:47:39) | A4 print, canceled | 794×1123 | Same row | Print | none | `order-print.css` | AC-19, MV-03 |
| PDV / `PDV / Order detail / Print 80 mm / Registered` (`tFTTSt21DZ`, 12:47:41) | 80 mm print | 302×773 | Same row | Print | `Cartão de crédito` width not drawn (deferred frame F-03) | `order-print.css` | AC-19, MV-03 |
| PDV / `PDV / Order detail / Print 80 mm / Cancelled` (`e7c3235Awk`, 12:47:50) | 80 mm print, canceled | 302×955 | Same row | Print | none | `order-print.css` | AC-19, MV-03 |
| PDV / `PDV / New sale / Mobile` (`2TuePyiuhm`, 13:28:09) | New sale at 390 px | 390×844 | Reference only for the method in the cart | — | The summary bar and `Mobile Top Bar` are excluded (D-01) | — | MV-02 |
| PDV / `PDV / New sale / Cart / Mobile` (`JUXY5h0HUK`, 13:19:19) | Cart at 390 px | 390×844 | Selector below the channel field, four options in one row, each 44 px high | Selected | The full-screen panel is excluded; the selector renders in the stacked cart | `Payment Method Selector` | AC-02, MV-02 |
| PDV / `PDV / New sale / Cart / No payment method / Mobile` (`r3cktAWH_L`, 13:19:46) | Cart at 390 px, no method | 390×844 | Hint, disabled button and reason | Disabled | The pinned bottom total bar is excluded; the reason stays under the button | — | AC-03, MV-02 |
| PDV / `PDV / New sale / Dialog / Confirm order / Mobile` (`YwLqBX3gb5`, 13:29:32) | Confirmation at 390 px | 390×477 | Rows of FR-05, with a `store` icon before the channel | — | The bottom sheet and stacked buttons are excluded; the current dialog layout is kept | — | AC-10, MV-02 |
| PDV / `PDV / Orders / Mobile` (`k-Kx7Pojmh`, 13:29:33) | `/orders` at 390 px | 390×844 | Method with icon after the channel on each order card | — | The `Filtros` button, chips and `Carregar mais pedidos` are excluded; the current filter bar is kept | — | AC-18, MV-02 |
| PDV / `PDV / Order detail / Mobile` (`pXugJaeDFa`, 13:30:00) | Detail at 390 px | 390×856 | `Forma de pagamento` in `Informações do pedido` | — | The 2-column grid order is visual only; the desktop row order is kept | — | AC-18, MV-02 |
| PDV / component `Payment Method Selector` (`c41h098wf0`, 12:40:27) | Selector states `none`, `pix`, `credit`, `debit`, `cash` | — | 4 equal options, radius 10 px, gap `--spacing-6`, 12/700 text, 15 px Lucide icons `qr-code`, `credit-card`, `wallet-cards`, `banknote`. Selected: `--color-primary-soft` fill, 1.5 px `--color-primary` outline, primary text at 800. Hover outline `--color-text-tertiary`. Focus 2 px `--color-primary` outline, offset 2 | Single choice | The template sets `role="radiogroup"` but no `aria-checked` or roving focus. The implementation must provide them | Tokens above | AC-01, AC-02 |
| PDV / component `Mobile Top Bar` (`cduobvxcsj`, 13:27:02) | App chrome | 390×56 | — | — | Excluded (D-01) | — | none |

**Deferred recommended frames.** These are not drawn, and they are not required before
implementation:

| Frame | Gap | Planned runtime check |
| --- | --- | --- |
| F-01, the open Orders payment filter | The option list | The list follows FR-10; checked by AC-17 and MV-03 |
| F-02, `Não informado` in detail and print | Not drawn | Follows the Orders list style (`circle-minus`, tertiary text); checked by AC-15 and MV-03 |
| F-03, `Cartão de crédito` in the 80 mm print and confirmation | Only `Pix` drawn | Checked for wrapping without truncation in MV-03 |

**Required states and viewports:**

- Desktop at 1481×1050 and a narrow viewport at 390×844.
- Every new control keeps a visible focus and a logical tab order. In the Orders filter bar, the
  order is search, channel, payment method, status, then period.
- Colors map to the tokens above through the existing Tailwind theme variables of
  `documentation/design.md`, with no new hard-coded values.
- **Allowed deviations:** the D-01 mobile exclusions, the D-10 undrawn states, the D-12
  text-only selector options below `sm`, the existing `Imprimir pedido` action on Order registered,
  and the frame naming gaps.

## 3. Technical Contract

### packages/core

#### Domain

A new PDV structure holds the fixed value set. It follows the `as const` object pattern of
`OrderStatus` (`packages/core/src/pdv/domain/structures/order-status.ts`). It is distinct from
Billing's `PaymentMethodType`. The name is proposed and adjustable under the Core rules. The wire
and stored values are a public contract:

```ts
// packages/core/src/pdv/domain/structures/order-payment-method.ts (proposed)
export const OrderPaymentMethod = {
  Pix: 'pix',
  CreditCard: 'credit-card',
  DebitCard: 'debit-card',
  Cash: 'cash',
} as const

export type OrderPaymentMethod = (typeof OrderPaymentMethod)[keyof typeof OrderPaymentMethod]
```

The method is added to the existing structures and entity (partial snippets of the existing
declarations):

```ts
// entities/order.ts — absent means "not informed" (orders registered before this change)
export type Order = Entity & {
  // ...existing fields
  paymentMethod?: OrderPaymentMethod
}

// Every new order carries a method; the type enforces it at creation.
export type OrderCreate = Omit<Order, 'id' | 'sequenceNumber' | 'status' | 'cancellation' | 'createdAt' | 'paymentMethod'> & {
  paymentMethod: OrderPaymentMethod
}

// structures/order-registration-input.ts — the method is NOT added to OrderPreviewInput
export interface OrderRegistrationInput extends OrderPreviewInput {
  readonly idempotencyKey: string
  readonly previewToken: string
  readonly paymentMethod: OrderPaymentMethod
}

// structures/order-list-params.ts — undefined = all methods, null = not informed
readonly paymentMethod?: OrderPaymentMethod | null
```

`order.ts` already exports both `Order` and `OrderCreate`, against the one-type-per-file rule.
This delivery extends both in place and does not move them; the split is a recorded neighbouring
gap.

`OrderFaker` gets a valid default method. Tests create an older order by overriding it out. The
registered event `OrderRegisteredEvent` and its stock consumer are unchanged.

#### Use cases

- **`RegisterOrderUseCase`:**
  - Its private input validation rejects a missing method, or a value outside
    `OrderPaymentMethod`, with `BadRequestError`. The check runs before `database.run`, next to
    the existing `idempotencyKey` and `previewToken` checks. This rule belongs to one use case, so
    it stays a private method and is not added to `OrderPreviewInputValidationStrategy`.
  - `toOrderCreate` copies the method, so `ordersRepository.add` stores it inside the existing
    transaction, together with the sequence and `stockProvider.consume`.
  - `matchesReplay` also compares `order.paymentMethod` with the submitted method. A mismatch
    gives the existing `ConflictError` for a reused idempotency key (FR-07).
  - `toPreviewInput` and the preview-token verification stay method-free (FR-03).
- **`ListOrdersUseCase`:** forwards `paymentMethod`, including `null`, to `findMany` together with
  the actor's establishment. It does not validate the value itself; validation and the repository
  type own that.
- **Unchanged:** `GetOrderUseCase`, `CancelOrderUseCase` and `PreviewOrderUseCase`. The cancel
  contract passes only the cancellation value to `ordersRepository.cancel`, so the method cannot
  change (FR-08). Tests prove this.

#### Interfaces

The `OrdersRepository`, `PdvService` and `PdvDatabase` signatures are unchanged. Their parameter
types (`OrderCreate`, `OrderListParams`, `OrderRegistrationInput`) carry the new field.

### packages/validation

- **New primitive.** A shared primitive is derived from the Core structure:
  `z.enum(OrderPaymentMethod, { error: 'Selecione a forma de pagamento.' })`. It is exported from
  `src/index.ts`. It imports only from `@scoops/core/pdv/domain/structures`, as the dependency
  rule requires.
- **`registerOrderSchema`.** It stays a `strictObject` and adds a required `paymentMethod`. A
  missing or invalid method fails the schema, and `ZodValidationPipe` returns 422 with the generic
  `A requisição é inválida.`. The schema is syntactic. Core remains authoritative (FR-06).
- **`previewOrderSchema`.** Unchanged. The web must not send the method to preview.
- **`orderListQuerySchema`.** It adds an optional `paymentMethod` that accepts a method or the
  literal `none` and transforms `none` to `null`, mirroring `channelId`. The inferred
  `OrderListQuery` stays assignable to `OrderListParams`.
- **`ordersSearchSchema` (web route search).** It adds
  `paymentMethod: z.union([<primitive>, z.literal('none')]).optional().catch(undefined)`. The
  field must be added to the output object of its transform (`commonSearch`), or it is silently
  dropped.

The package has no test runner. Schema behavior is proven through the server controller tests and
the web route and widget tests.

### apps/server

#### REST

- **`POST /orders`:**
  - The body adds a required `paymentMethod` (`pix | credit-card | debit-card | cash`). Missing or
    invalid gives 422, with no write. The other status codes are unchanged: 201 registered, 200
    replay or repriced, 400 for an invalid preview token or inactive channel, and 409 for review,
    correction or a reused key with different content, including a different method.
  - The controller needs no code change. Its request type is derived from the Core use case, and
    its existing 422 response (`The registration body is malformed.`) already covers a missing or
    invalid method.
- **`GET /orders`.** It accepts `paymentMethod=<value>` or `paymentMethod=none`. An unknown value
  gives 422.
- **`GET /orders/:orderId`, list items and register results.** These return `paymentMethod` when
  the order has one and omit the field for an older order. `OrderResponseDto` documents the field
  as an optional enum.
- **`PATCH /orders/:orderId/cancel`.** Unchanged.
- **REST client.** `apps/server/rest-client/pdv/orders.rest` adds `paymentMethod` to every
  register, replay, reprice, review, correction and conflict body. It adds missing-method and
  invalid-method 422 examples, and list examples with a method and with `none`.

#### Database

- **New enum.** PostgreSQL enum `pdv_order_payment_method` with the values `pix`, `credit-card`,
  `debit-card` and `cash`. It is defined in a new model typed from the Core values, like
  `sales-channel-status-model.ts`.
- **New column.** Table `orders` gets `payment_method pdv_order_payment_method NULL`. It has no
  default and no check constraint that ties it to other columns. No index is added: the list is
  always tenant-scoped and paged, as the channel filter already is.
- **Migration.** `0031_order_payment_method` is generated with
  `pnpm --filter server db:migration:generate --name order_payment_method`. It must contain only
  `CREATE TYPE` and `ALTER TABLE "orders" ADD COLUMN "payment_method"`, with no `UPDATE` and no
  backfill. If the generator emits an unrelated diff, such as a drifted existing constraint, stop
  and record a finding instead of shipping it.
- **Repository and mapper.**
  - `addWithCreatedAt` writes the method in the same `INSERT` as the order, inside the existing
    serializable `DrizzlePdvDatabase.run` transaction.
  - `findMany` adds `eq(paymentMethod, value)` for a method and `isNull(paymentMethod)` for
    `null`, always together with the establishment predicate.
  - The mapper maps a null column to an absent `paymentMethod`, as it does for the channel.
  - The cancellation `UPDATE` keeps its column-scoped `.set()`, which does not include the method.
- **Fixtures, seeds and tests.**
  - The test fixture `PdvModuleFixture.registerPortionOrder` sends a method, `pix` by default,
    overridable.
  - Seed orders in `apps/server/src/shared/database/seed.ts` get methods.
  - Controller tests create an older order by registering it through
    `PdvModuleFixture.registerPortionOrder` and then calling a new typed fixture helper that sets
    `payment_method` to null through `orderModel`, like the existing `setOrderCreatedAt`. This
    direct row change is allowed only to stage legacy data.

### apps/web

#### UI

- **New sale state (`use-new-sale-page.ts`):**
  - The page hook owns `paymentMethod` state, which starts with no method.
  - The change handler sets it and calls `startNewRegistrationRequest()`, as the channel handler
    does. The method is not in the preview request or its memo dependencies.
  - `createRegistrationRequest` includes it.
  - The `canRegister` guard requires it.
  - Success clears items, channel and method. `handleClear` (`Limpar pedido`) clears items and
    method and keeps the channel.
  - Every other outcome keeps the method (FR-04).
- **Cart storage (`new-sale-cart-storage.ts`).** It moves to version 2 with an optional
  `paymentMethod`, validated against `OrderPaymentMethod`. A version 1 cart still restores, with
  no method. Restoration stays inside the existing mount effect, to avoid a hydration mismatch.
- **Selector.** A new `payment-method-selector` child widget under `new-sale-cart/` composes the
  shadcn radio group. It is extended with a card-style item at least 44×44 px, built on Base UI
  `Radio.Root`, so roving focus and the checked state come from the library. It must not use
  `Button role="radio"`.
  - The group is labelled `Forma de pagamento`.
  - The hint shows only while nothing is selected.
  - The cart renders the reason under `Registrar pedido` and links it with `aria-describedby`
    while no method is selected (FR-02).
- **Confirmation dialog (`order-registration-dialog`).** It receives the method and the channel
  snapshot, from the preview or from the active channels, and renders FR-05. It keeps
  `Registrando…` while pending and the loading text while the cart updates.
- **Labels.** One typed, exhaustive presentation constant
  (`ui/pdv/constants/payment-method-presentation.ts`, proposed name) maps each method to its short
  label, long label and icon, plus the `Não informado` presentation. Every surface reads from it
  (D-05).
- **Read surfaces:**
  - The Order registered metadata (4 items) and its grid.
  - The Orders table column and the mobile card cell.
  - `Informações do pedido` in `order-summary`.
  - The print metadata in `use-order-print-document.ts`, which covers A4 and 80 mm. If
    `Cartão de crédito` needs a wrapping rule at 80 mm, `order-print.css` is added to the Path map
    as a non-material correction, followed by `plan-spec` reconciliation.
- **Orders filter.**
  - `orders-filters` adds a `Select` between channel and status. Its trigger shows the `wallet`
    icon and the label.
  - `handlePeriodChange` keeps the field. `handleClearFilters` and both has-filters checks include
    it. The filtered empty copy names the payment method.
- **Icons.** `qr-code`, `wallet-cards`, `banknote`, `wallet`, `circle-minus` and `receipt-text` are
  registered in `IconName` and the Lucide map.
- **Rejection message.** A 422 on registration reaches the existing generic failure path and shows
  the server message. The client guard normally prevents it.

#### Routes

The `/orders` route already uses `ordersSearchSchema`. Its search type changes by inference, and
`routeTree.gen.ts` needs no regeneration. `/sales/new` is unchanged.

#### REST

`PdvService.listOrders` sets `paymentMethod` to the value, or to `none` when the filter is `null`,
and leaves it out when no filter is set. `registerOrder` posts the input unchanged. `mapOrder`
passes the field through.

### Path map

#### packages/core

| Path | Change | Serves | Purpose |
| --- | --- | --- | --- |
| `packages/core/src/pdv/domain/structures/order-payment-method.ts` | Create | FR-01, FR-06, AC-11, AC-12 | Fixed method value set and type |
| `packages/core/src/pdv/domain/structures/index.ts` | Modify | FR-06, AC-12 | Export the structure |
| `packages/core/src/pdv/domain/structures/order-registration-input.ts` | Modify | FR-06, AC-11 | Required method on the registration input only |
| `packages/core/src/pdv/domain/structures/order-list-params.ts` | Modify | FR-10, AC-16 | Method or `null` filter |
| `packages/core/src/pdv/domain/entities/order.ts` | Modify | FR-08, FR-09, AC-12, AC-15 | Optional on `Order`, required on `OrderCreate` |
| `packages/core/src/pdv/domain/entities/fakers/order-faker.ts` | Modify | FR-08, FR-09, AC-14, AC-15 | Default method and older-order override |
| `packages/core/src/pdv/use-cases/register-order-use-case.ts` | Modify | FR-03, FR-06, FR-07, AC-05, AC-11, AC-12, AC-13 | Guard, persistence and replay comparison |
| `packages/core/src/pdv/use-cases/list-orders-use-case.ts` | Modify | FR-10, AC-16 | Forward the filter with the tenant |
| `packages/core/src/pdv/use-cases/tests/register-order-use-case.test.ts` | Modify | FR-03, FR-06, FR-07, AC-05, AC-11, AC-12, AC-13 | Rejection without a transaction, each method persisted, replay, token independence |
| `packages/core/src/pdv/use-cases/tests/list-orders-use-case.test.ts` | Modify | FR-10, AC-16 | Method and `null` forwarding with other filters |
| `packages/core/src/pdv/use-cases/tests/get-order-use-case.test.ts` | Modify | FR-09, AC-15 | Older order returned without a method |
| `packages/core/src/pdv/use-cases/tests/cancel-order-use-case.test.ts` | Modify | FR-08, AC-14 | Cancellation leaves the method unchanged |

#### packages/validation

| Path | Change | Serves | Purpose |
| --- | --- | --- | --- |
| `packages/validation/src/pdv/order-payment-method-schema.ts` | Create | FR-06, FR-10, AC-11, AC-16 | Shared method primitive |
| `packages/validation/src/pdv/register-order-schema.ts` | Modify | FR-06, AC-11 | Required method in the strict body |
| `packages/validation/src/pdv/order-list-query-schema.ts` | Modify | FR-10, AC-16 | Method or `none` filter |
| `packages/validation/src/web/orders-search-schema.ts` | Modify | FR-10, AC-17 | URL filter kept by the transform |
| `packages/validation/src/index.ts` | Modify | FR-06, FR-10, AC-11, AC-16 | Export the primitive |

#### apps/server

| Path | Change | Serves | Purpose |
| --- | --- | --- | --- |
| `apps/server/src/pdv/database/drizzle/models/order-payment-method-model.ts` | Create | FR-06, AC-12 | `pdv_order_payment_method` enum |
| `apps/server/src/pdv/database/drizzle/models/order-model.ts` | Modify | FR-06, FR-09, AC-12, AC-15 | Nullable `payment_method` column |
| `apps/server/src/pdv/database/drizzle/models/index.ts` | Modify | FR-06, AC-12 | Export the enum model |
| `apps/server/src/pdv/database/drizzle/mappers/drizzle-order-mapper.ts` | Modify | FR-08, FR-09, AC-12, AC-15 | Null column to absent field |
| `apps/server/src/pdv/database/drizzle/repositories/drizzle-orders-repository.ts` | Modify | FR-06, FR-10, FR-13, AC-12, AC-16 | Insert the method; `eq`/`isNull` filter |
| `apps/server/src/shared/database/drizzle/migrations/0031_order_payment_method.sql` | Generate | FR-06, FR-09, AC-15 | Enum type and nullable column, no backfill; generated with `--name order_payment_method` |
| `apps/server/src/shared/database/drizzle/migrations/meta/0031_snapshot.json` | Generate | FR-06, AC-15 | Generated schema snapshot |
| `apps/server/src/shared/database/drizzle/migrations/meta/_journal.json` | Generate | FR-06, AC-15 | Generated journal entry 31 |
| `apps/server/src/pdv/fixtures/pdv-module-fixture.ts` | Modify | FR-06, FR-09, AC-12, AC-15 | Method in registration helpers; helper that stages an older order without a method |
| `apps/server/src/pdv/rest/dtos/order-response.dto.ts` | Modify | FR-08, FR-09, AC-12, AC-15 | Optional enum `paymentMethod` |
| `apps/server/src/pdv/rest/controllers/tests/register-order.controller.test.ts` | Modify | FR-06, FR-07, FR-13, AC-11, AC-12, AC-13, AC-20 | 422 with no writes, each method stored, replay conflict, roles |
| `apps/server/src/pdv/rest/controllers/tests/list-orders.controller.test.ts` | Modify | FR-09, FR-10, FR-13, AC-15, AC-16, AC-20 | Combined filters, `none`, 422, tenant isolation |
| `apps/server/src/pdv/rest/controllers/tests/get-order.controller.test.ts` | Modify | FR-08, FR-09, AC-12, AC-15 | Stored method and older order |
| `apps/server/src/pdv/rest/controllers/tests/cancel-order.controller.test.ts` | Modify | FR-08, FR-13, AC-14, AC-20 | Method kept after cancellation |
| `apps/server/src/pdv/rest/controllers/tests/preview-order.controller.test.ts` | Modify | FR-03, AC-05 | Its registration call sends a method; preview stays method-free |
| `apps/server/src/identity/rest/controllers/tests/search-global.controller.test.ts` | Modify | FR-06, AC-12 | `OrderCreate` builder gains a method |
| `apps/server/src/shared/database/seed.ts` | Modify | FR-06, AC-12 | Seed orders carry methods |
| `apps/server/rest-client/pdv/orders.rest` | Modify | FR-06, FR-10, AC-11, AC-16 | Body, 422 and filter examples |

#### apps/web

| Path | Change | Serves | Purpose |
| --- | --- | --- | --- |
| `apps/web/src/rest/services/pdv-service.ts` | Modify | FR-10, AC-17 | `paymentMethod` query param with `none` |
| `apps/web/src/ui/shadcn/radio-group.tsx` | Modify | FR-01, AC-02 | 44 px card-style radio item |
| `apps/web/src/ui/shared/widgets/components/icon/types/icon-name.ts` | Modify | FR-01, FR-05, FR-11, AC-01, AC-10, AC-18 | Register six icons |
| `apps/web/src/ui/shared/widgets/components/icon/lucide-icon/icons.ts` | Modify | FR-01, FR-05, FR-11, AC-01, AC-10, AC-18 | Map six icons |
| `apps/web/src/ui/pdv/constants/payment-method-presentation.ts` | Create | FR-01, FR-09, FR-11, FR-12, AC-01, AC-15, AC-18, AC-19 | Short and long labels, icons, `Não informado` |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/index.tsx` | Modify | FR-02, FR-05, AC-03, AC-10 | Wire method, handler and dialog props |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/use-new-sale-page.ts` | Modify | FR-03, FR-04, FR-07, AC-05, AC-06, AC-07, AC-08, AC-09 | State, lifecycle, request and key |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart-storage.ts` | Modify | FR-04, AC-07 | Storage version 2 with the method |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/index.tsx` | Modify | FR-01, FR-02, AC-01, AC-03, AC-04 | Selector placement, hint and linked reason |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/use-new-sale-cart.ts` | Modify | FR-02, AC-03, AC-04 | Reason and enablement derivation |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/payment-method-selector/index.tsx` | Create | FR-01, AC-01, AC-02 | Labelled single-choice selector |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/payment-method-selector/tests/payment-method-selector.test.tsx` | Create | FR-01, AC-01, AC-02 | Options, checked state and keyboard |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/tests/new-sale-cart.test.tsx` | Modify | FR-01, FR-02, AC-01, AC-03, AC-04 | Selector, hint, reason and disabled button |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/tests/use-new-sale-cart.test.ts` | Modify | FR-02, AC-03, AC-04 | Reason derivation |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/tests/new-sale-page.test.tsx` | Modify | FR-04, FR-05, AC-06, AC-10 | Page wiring and dialog props |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/tests/use-new-sale-page.test.ts` | Modify | FR-03, FR-04, FR-07, AC-05, AC-06, AC-07, AC-08, AC-09 | Lifecycle, preview exclusion, key rotation and storage |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-registration-dialog/index.tsx` | Modify | FR-05, AC-10 | Frame summary |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-registration-dialog/order-registration-summary/index.tsx` | Create | FR-05, AC-10 | Confirmation summary rows, split from the dialog |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-registration-dialog/tests/order-registration-dialog.test.tsx` | Modify | FR-05, AC-10 | Rows, no-channel, no-Combo and actions |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-confirmation/use-order-confirmation.ts` | Modify | FR-11, AC-18 | Method metadata item |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-confirmation/order-confirmation-metadata/index.tsx` | Modify | FR-11, AC-18 | Grid for four items |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-confirmation/tests/order-confirmation.test.tsx` | Modify | FR-11, AC-18 | Rendered method |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-confirmation/tests/use-order-confirmation.test.ts` | Modify | FR-11, AC-18 | Metadata derivation |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/use-orders-page.ts` | Modify | FR-10, AC-17 | Query mapping, has-filters and clear |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-filters/index.tsx` | Modify | FR-10, AC-17 | Payment-method `Select` |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-filters/use-orders-filters.ts` | Modify | FR-10, AC-17 | Change handler and period change |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-list/index.tsx` | Modify | FR-09, FR-11, AC-15, AC-18 | Table column and mobile card cell |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-filtered-empty-state/index.tsx` | Modify | FR-10, AC-17 | Copy naming the payment method |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/tests/orders-page.test.tsx` | Modify | FR-10, AC-17 | Filter states on the page |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/tests/use-orders-page.test.ts` | Modify | FR-10, AC-17 | Mapping, clear and has-filters |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-filters/tests/orders-filters.test.tsx` | Modify | FR-10, AC-17 | Options and labels |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-filters/tests/use-orders-filters.test.ts` | Modify | FR-10, AC-17 | Handler and period change |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-list/tests/orders-list.test.tsx` | Modify | FR-09, FR-11, AC-15, AC-18 | Method and `Não informado` |
| `apps/web/src/ui/pdv/widgets/pages/order-details-page/order-summary/index.tsx` | Modify | FR-08, FR-09, FR-11, AC-14, AC-15, AC-18 | `Forma de pagamento` row |
| `apps/web/src/ui/pdv/widgets/pages/order-details-page/tests/order-details-page.test.tsx` | Modify | FR-08, FR-09, FR-11, AC-14, AC-15, AC-18 | Registered, canceled and older orders |
| `apps/web/src/ui/pdv/widgets/components/order-print/order-print-document/use-order-print-document.ts` | Modify | FR-09, FR-12, AC-15, AC-19 | `Pagamento` print row |
| `apps/web/src/ui/pdv/widgets/components/order-print/order-print-document/tests/order-print-document.test.tsx` | Modify | FR-12, AC-19 | Rendered print row |
| `apps/web/src/ui/pdv/widgets/components/order-print/order-print-document/tests/use-order-print-document.test.ts` | Modify | FR-09, FR-12, AC-15, AC-19 | Metadata derivation |
| `apps/web/tests/pdv/new-sale-page.test.ts` | Modify | FR-01, FR-02, FR-03, FR-04, FR-07, AC-02, AC-03, AC-05, AC-07, AC-08, AC-09 | Choose a method before registering; body, keyboard, reload and preview assertions |
| `apps/web/tests/pdv/orders-page.test.tsx` | Modify | FR-10, AC-17 | URL and query mapping for each option and `none` |
| `apps/web/tests/pdv/order-page.test.tsx` | Modify | FR-09, FR-11, FR-12, AC-15, AC-18, AC-19 | Detail and print with a method, canceled and older orders |

### Cross-layer flow and decisions

The flow, in order:

1. **Select and register.** The Operator selects a method in the cart. The web keeps it in the
   page state and the browser cart, never in preview. On confirmation, the web posts
   `OrderRegistrationInput` with `paymentMethod`.
2. **Server checks.** The server validates the body syntactically (422 on failure). The Core
   `RegisterOrderUseCase` rechecks the method, then registers inside one serializable
   transaction: sequence, order row with `payment_method`, line and Combo snapshots, and the MRP
   stock consumption.
3. **Reading back.** Reads map the stored value, or its absence, into `Order.paymentMethod`. The
   web renders it through one presentation constant.
4. **History filter.** History filters travel from the URL search through `PdvService.listOrders`
   to `orderListQuerySchema`, then `ListOrdersUseCase`, then `findMany`, always scoped by the
   actor's establishment.

| Decision | Chosen approach | Alternative | Reason and accepted trade-off |
| --- | --- | --- | --- |
| Rejection layers | Strict schema (422) plus a Core guard (`BadRequestError`) | Core guard only, returning 400 | The schema matches every malformed-body case. The guard keeps Core authoritative for non-HTTP callers. The HTTP response is generic and gives no detail. |
| Preview independence | The method is only on `OrderRegistrationInput` | Add it to `OrderPreviewInput` | A method change must not invalidate the price token or trigger repricing. |
| Replay comparison | Compare the method in `matchesReplay`; the web rotates the key on change | Ignore the method on replay | Prevents returning a stored order that differs from the request. Mirrors the channel. |
| Stored type | PostgreSQL enum typed from Core | Text column with a check constraint | This is the dominant PDV pattern and gives typed row inference. Adding a value later needs a migration. |
| Older orders | Nullable column, absent field, no backfill | A default or inferred value | PRQ-09 forbids inference. The API omits the field, as it does for no channel. |
| "Not informed" filter | `none` mapped to `null` | A separate boolean parameter | Mirrors the channel filter in the URL, the query and Core. |
| Release coupling | Migration, server and web ship from one merge (D-06) | An optional method for one release | PRQ-08 forbids accepting orders without a method. Whichever application deploys first, registrations fail with the generic error until both releases finish: an old web tab against the new server until it reloads, and a new web build against the previous server until the server release and migration complete. Carts are kept and nothing is written. Recorded as the migration strategy required by `documentation/architecture.md` §11. |

## 4. Verification Contract

| Acceptance | Checker and permitted boundary | Expected assertion | Evidence target |
| --- | --- | --- | --- |
| AC-01 | Web widget tests: `payment-method-selector.test.tsx`, `new-sale-cart.test.tsx`; MV-01 | Radio group named `Forma de pagamento` with 4 radios, none checked, rendered after the channel field | `evaluation.md` |
| AC-02 | `payment-method-selector.test.tsx` (checked state, arrow keys); Playwright `tests/pdv/new-sale-page.test.ts` keyboard case; MV-01 and MV-02 (bounding boxes ≥ 44×44) | Keyboard selection works and the checked option is exposed | `evaluation.md` |
| AC-03 | `new-sale-cart.test.tsx`, `use-new-sale-cart.test.ts`; Playwright new sale case | Disabled button with `aria-describedby` pointing to the visible reason; enabled after a choice | `evaluation.md` |
| AC-04 | `new-sale-cart.test.tsx`, `use-new-sale-cart.test.ts` | Reason shown with an empty or pending cart and no method | `evaluation.md` |
| AC-05 | `use-new-sale-page.test.ts`; Playwright preview request assertion; Core `register-order-use-case.test.ts` | No preview call or `paymentMethod` key from a method change; totals equal; token verifies for each method | `evaluation.md` |
| AC-06 | `use-new-sale-page.test.ts`, `new-sale-page.test.tsx` | Method unchanged after each listed edit and outcome | `evaluation.md` |
| AC-07 | `use-new-sale-page.test.ts`; Playwright reload case | Version 2 cart restores its method; version 1 cart restores without one | `evaluation.md` |
| AC-08 | `use-new-sale-page.test.ts`; Playwright success case | Success clears items, channel and method; `Limpar pedido` keeps the channel | `evaluation.md` |
| AC-09 | `use-new-sale-page.test.ts`; Playwright `postDataJSON` on `POST /orders` | Body has the method; a new key after a method change | `evaluation.md` |
| AC-10 | `order-registration-dialog.test.tsx`; MV-01 visual comparison | FR-05 rows and actions; `Sem canal`; no Combo row without Combo | `evaluation.md` |
| AC-11 | Server `register-order.controller.test.ts` (real database); Core `register-order-use-case.test.ts` | 422 for missing and invalid; no order, unchanged sequence, no stock movement; Core `BadRequestError` with `database.run` not called | `evaluation.md` |
| AC-12 | Server `register-order.controller.test.ts`, `get-order.controller.test.ts`; Core `register-order-use-case.test.ts` | Each value stored and returned; persisted `OrderCreate` has the method; the existing rollback test still leaves no order | `evaluation.md` |
| AC-13 | Core `register-order-use-case.test.ts`; server `register-order.controller.test.ts` | Same content replays with 200; a different method gives 409 with no new order | `evaluation.md` |
| AC-14 | Server `cancel-order.controller.test.ts`; Core `cancel-order-use-case.test.ts`; web `order-details-page.test.tsx` | Method equal before and after cancellation | `evaluation.md` |
| AC-15 | Server `get-order.controller.test.ts`, `list-orders.controller.test.ts` (older row staged through the fixture helper); web list, detail and print tests; review of the `0031` SQL | Field omitted; `Não informado` rendered; SQL has no default or `UPDATE` | `evaluation.md` |
| AC-16 | Server `list-orders.controller.test.ts`; Core `list-orders-use-case.test.ts` | Each method and `none` combined with the other filters; other establishment excluded; invalid value gives 422 | `evaluation.md` |
| AC-17 | `use-orders-page.test.ts`, `use-orders-filters.test.ts`, `orders-filters.test.tsx`, `orders-page.test.tsx`; Playwright `tests/pdv/orders-page.test.tsx` | URL and query carry the value; page resets to 1 on change; kept on period change; reset on clear; invalid URL value becomes all; empty copy | `evaluation.md` |
| AC-18 | `use-order-confirmation.test.ts`, `order-confirmation.test.tsx`, `orders-list.test.tsx`, `order-details-page.test.tsx`; Playwright `tests/pdv/order-page.test.tsx`; MV-01, MV-03 | Long label and icon on each surface | `evaluation.md` |
| AC-19 | `use-order-print-document.test.ts`, `order-print-document.test.tsx`; MV-03 | `Pagamento` row with the label or `Não informado`; no truncation at 80 mm | `evaluation.md` |
| AC-20 | Server register, list and cancel controller tests (existing Operator and Manager cases kept and extended) | Both roles register and filter; Operator cancellation stays forbidden | `evaluation.md` |

**Test boundaries.**

- Web REST services and query or action hooks are covered through consuming widgets, pages and
  Playwright tests, not dedicated service tests.
- Validation schemas are covered through server controller tests and web route and widget tests.
- Playwright tests with mocked transport (`tests/fixtures/pdv-module-fixture.ts`) prove the web
  contract only. Real persistence is proven by the server controller tests and by MV-01 and MV-03
  against the running server.

**Targeted mutation checks (Core).**

- **Scope:** `src/pdv/use-cases/register-order-use-case.ts` (AC-05, AC-11, AC-12, AC-13) and
  `src/pdv/use-cases/list-orders-use-case.ts` (AC-16).
- **Command:**
  `pnpm --filter @scoops/core test:mutation --files src/pdv/use-cases/register-order-use-case.ts src/pdv/use-cases/list-orders-use-case.ts`
- **Pass conditions:**
  - Each file scores at least 70%.
  - No surviving mutant sits in the new method guard, the `toOrderCreate` method copy, the
    `matchesReplay` method comparison or the list forwarding of `paymentMethod`.
  - Any other surviving, uncovered or equivalent mutant in changed lines is assessed in
    Evaluation, with a test added or a justified equivalence.
- **CI:** Core CI separately runs `--all` across four shards and enforces the module and
  per-file thresholds against the target branch.

| Command | Purpose and prerequisites |
| --- | --- |
| `pnpm --filter @scoops/core test` | Core use-case tests |
| `pnpm --filter @scoops/core test:mutation --files src/pdv/use-cases/register-order-use-case.ts src/pdv/use-cases/list-orders-use-case.ts` | Targeted mutation checks |
| `pnpm --filter server db:migration:generate --name order_payment_method` | Generate migration `0031`, after the model change |
| `pnpm --filter server test` | Server controller tests against the test database (Docker PostgreSQL running) |
| `pnpm --filter web test` | Web widget and hook tests |
| `pnpm --filter web test:integration` | Playwright suites under `apps/web/tests` |
| `pnpm check:types`, `pnpm check:code`, `pnpm check:architecture` | Static, type and dependency checks for all four workspaces |
| `pnpm check:test-integrity`, `pnpm test:coverage` | Test-integrity policy and preserved coverage floors |
| `pnpm check:spec-implementation -- documentation/features/pdv/order-payment-method/spec.md --require-plan` | Path map and Plan against Git, before `ready` |

REST-client parity: every register and list outcome in this Contract has an example in
`apps/server/rest-client/pdv/orders.rest`. Parity is recorded separately and does not prove HTTP
integration.

### MV-01 — Register orders with each method on desktop

- **Acceptance:** AC-01, AC-02, AC-03, AC-08, AC-10, AC-18.
- **Prerequisites:**
  - Services: `docker compose ps` healthy, the server on `http://localhost:3336`, and the web on
    `http://localhost:4000`.
  - Accounts: the seeded Operator account, with `pnpm --filter web test:auth:setup` state, and a
    sellable product with stock.
  - Data: an active channel, and a Combo that can apply.
- **Viewport and frames:** 1481×1050. Compare with `PDV / New sale / Desktop`,
  `PDV / New sale / Cart / No payment method / Desktop`,
  `PDV / New sale / Dialog / Confirm order / Desktop` and `PDV / New sale / Order registered`.

1. Open `/sales/new`, add a product and pick the channel. Confirm `Registrar pedido` is disabled,
   and that the hint and `Falta escolher a forma de pagamento.` are visible.
2. Tab into `Forma de pagamento`, use the arrow keys to reach `Crédito` and select it. Confirm the
   reason disappears.
3. Select `Registrar pedido`, then compare the dialog rows with the frame.
4. Confirm. Check `Pedido #<n> registrado com sucesso`, and `Forma de pagamento` reading
   `Cartão de crédito`.
5. Select `Iniciar nova venda`. Check that there are no items, no channel and no method.
6. Repeat with `Pix`, `Débito` and `Dinheiro`. Run one with no channel and no Combo.

**Expected proof:**

- The `POST /orders` body has the chosen `paymentMethod`, and the response is 201.
- `GET /orders/:orderId` returns the same value.
- Focus is visible at every step.
- There are no console errors or failed requests.

**Capture and comparison:** Fresh Playwright CLI screenshots go under
`apps/web/.playwright-cli/screenshots/` for each frame state. Record the paths and the comparison
result in Evaluation.

**Cleanup:** Stop the server and web processes started for the run.

### MV-02 — Payment-method elements on a narrow viewport

- **Acceptance:** AC-02, AC-03, AC-10, AC-18.
- **Prerequisites:** As in MV-01.
- **Viewport and frames:** 390×844. Compare only the payment-method elements with
  `PDV / New sale / Cart / Mobile`, `PDV / New sale / Cart / No payment method / Mobile`,
  `PDV / New sale / Dialog / Confirm order / Mobile`, `PDV / Orders / Mobile` and
  `PDV / Order detail / Mobile`.

1. Open `/sales/new` and scroll to the stacked cart. Measure each option at ≥ 44×44 px. Select one
   by tap, and another by keyboard.
2. Check the no-method reason and the disabled button.
3. Register an order, then open `/orders` and the order detail. Check that the card and the detail
   show the method without cutting content.

**Expected proof:** No horizontal page scroll. Visible focus. No console errors.

**Capture and comparison:** Fresh screenshots of each state. The D-01 layout differences are
allowed deviations.

**Cleanup:** As in MV-01.

### MV-03 — History filter, older order, cancellation and print

- **Acceptance:** AC-14, AC-15, AC-17, AC-18, AC-19.
- **Prerequisites:**
  - Services and accounts: as in MV-01, with the Manager account for cancellation.
  - Data: orders from MV-01. Turn one seeded order into an older order on the local database with
    `UPDATE orders SET payment_method = NULL WHERE id = '<order id>'`, and record the id.
- **Viewport and frames:** 1481×1050. Compare with `PDV / Orders / Desktop`,
  `PDV / Orders / No results`, `PDV / Order detail / Desktop`, `PDV / Order detail / Cancelled`
  and the four print frames.

1. Open `/orders`. Filter by each method and by `Não informado`. Combine with a channel, a status,
   search and a custom period. Check the URL `paymentMethod` value and the `GET /orders` query.
2. Pick a combination with no results. Check the copy, then `Limpar filtros`.
3. Open the older order and check `Não informado` in the detail. Print, and check the A4 and 80 mm
   print previews.
4. As the Manager, cancel a `Cartão de crédito` order. Check that the canceled detail and both
   prints still read `Cartão de crédito` without truncation at 80 mm.

**Expected proof:**

- The filtered lists contain only matching orders.
- The method after cancellation is unchanged in the `GET /orders/:orderId` response.
- There are no console errors.

**Capture and comparison:** Fresh screenshots of the list, the no-results state, the details and
the print previews, compared with the named frames and the deferred frames F-01 to F-03.

**Cleanup:** Restore the older order's method only if the local data needs it. Stop the processes
started for the run.

## 5. Documentation alignment and revision history

| Authority | Applies to | Alignment |
| --- | --- | --- |
| [`documentation/prds/pdv.md`](../../../prds/pdv.md) | PRQ-05, 08, 09, 10, 11, 12, 15, 16; Journeys E, K, N, P | Confirmed. The PRD is unchanged. Its English labels map to the pt-BR labels of D-05. |
| [`documentation/modules.md`](../../../modules.md) | PDV owns orders and their payment label; Billing's payment concepts stay separate | Confirmed |
| [`documentation/architecture.md`](../../../architecture.md) §11, §13 | API compatibility with deployed web versions; migrations before dependent code | Coordinated release with both deployment-order windows accepted, recorded as the migration strategy (D-06) |
| [`documentation/design.md`](../../../design.md) | Tokens and components for the selector and read surfaces | Confirmed |
| [`documentation/tooling.md`](../../../tooling.md) | Commands, migration generation, Core mutation testing | Confirmed |
| [`documentation/rules/doop-rules.md`](../../../rules/doop-rules.md) | Frame names and pages | Confirmed. The PDV page name differs between the rule (`🧾 PDV`) and the issue (`🍦 PDV`); not changed by this delivery. |
| [`code-conventions-rules.md`](../../../rules/code-conventions-rules.md), [`core-package-rules.md`](../../../rules/core-package-rules.md), [`use-case-testing-rules.md`](../../../rules/use-case-testing-rules.md) | `packages/core` structure, use cases and tests | Rule Pack |
| [`validation-package-rules.md`](../../../rules/validation-package-rules.md) | `packages/validation` schemas | Rule Pack |
| [`rest-layer-rules.md`](../../../rules/rest-layer-rules.md), [`database-layer-rules.md`](../../../rules/database-layer-rules.md), [`controllers-testing-rules.md`](../../../rules/controllers-testing-rules.md), [`server-app-layer-rules.md`](../../../rules/server-app-layer-rules.md) | `apps/server` REST, persistence, migration and tests | Rule Pack |
| [`ui-layer-rules.md`](../../../rules/ui-layer-rules.md), [`web-app-routing-rules.md`](../../../rules/web-app-routing-rules.md), [`widget-testing-rules.md`](../../../rules/widget-testing-rules.md) | `apps/web` widgets, route search and tests | Rule Pack |
| [`doop-rules.md`](../../../rules/doop-rules.md) | Design Contract | Rule Pack |

| Revision | Date | Material change and reason |
| --- | --- | --- |
| 1 | 2026-11-22 | Initial contract from issue #73 with decisions D-01 to D-11. Independent Spec review findings resolved before opening: both deployment-order windows accepted (Q6a), unchanged controller row removed, page reset on filter change, typed legacy-staging fixture helper, recorded `order.ts` gap and conditional print stylesheet correction. Recorded during implementation, without a revision change: D-12 allows text-only selector options below `sm`, as a clarification of an allowed deviation already built. |
