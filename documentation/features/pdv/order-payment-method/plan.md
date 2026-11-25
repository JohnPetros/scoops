---
title: Order payment method recording — plan
spec: ./spec.md
spec_revision: 1
evaluation: ./evaluation.md
status: completed
updated_at: 2026-11-25
---

# Plan — Order payment method recording

<!-- Created by plan-spec from the Spec's Path map. Keep headings and the first cells of
each row exactly as below: pnpm check:spec-implementation reads Tasks by position (Task,
Outcome, Builder, Depends on, Status, Notes) and Progress rows by position (Path, Change,
Task, FR/AC, Status, Notes). Statuses: pending, in_progress, completed. Builder: Direct,
unassigned or a kebab-case <responsibility>-builder name. -->

## Tasks

| Task | Outcome | Builder | Depends on | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| T1 | Core: payment-method value set, order and input types, register guard, replay comparison, list filter forwarding and use-case tests | core-pdv-builder | none | completed | none |
| T2 | Validation: shared method primitive, strict register body, list query and web route search filter | validation-pdv-builder | T1 | completed | none |
| T3 | Server: enum and nullable column, migration 0031, repository and mapper, response DTO, fixtures, seed, REST client and controller tests | server-pdv-builder | T1, T2 | completed | none |
| T4 | Web New sale: selector, hint and reason, cart state and storage v2, confirmation dialog, Order registered method, shared presentation constant, icons and Playwright new sale case | web-new-sale-builder | T1, T2 | completed | none |
| T5 | Web read surfaces: Orders filter, list column and card, detail, both prints, list service param and Playwright orders and order cases | web-orders-builder | T1, T2, T4 | completed | none |

## Progress


### packages/core

| Path | Change | Task | FR/AC | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `packages/core/src/pdv/domain/structures/order-payment-method.ts` | Create | T1 | FR-01, FR-06, AC-11, AC-12 | completed | none |
| `packages/core/src/pdv/domain/structures/index.ts` | Modify | T1 | FR-06, AC-12 | completed | none |
| `packages/core/src/pdv/domain/structures/order-registration-input.ts` | Modify | T1 | FR-06, AC-11 | completed | none |
| `packages/core/src/pdv/domain/structures/order-list-params.ts` | Modify | T1 | FR-10, AC-16 | completed | none |
| `packages/core/src/pdv/domain/entities/order.ts` | Modify | T1 | FR-08, FR-09, AC-12, AC-15 | completed | none |
| `packages/core/src/pdv/domain/entities/fakers/order-faker.ts` | Modify | T1 | FR-08, FR-09, AC-14, AC-15 | completed | none |
| `packages/core/src/pdv/use-cases/register-order-use-case.ts` | Modify | T1 | FR-03, FR-06, FR-07, AC-05, AC-11, AC-12, AC-13 | completed | none |
| `packages/core/src/pdv/use-cases/list-orders-use-case.ts` | Modify | T1 | FR-10, AC-16 | completed | none |
| `packages/core/src/pdv/use-cases/tests/register-order-use-case.test.ts` | Modify | T1 | FR-03, FR-06, FR-07, AC-05, AC-11, AC-12, AC-13 | completed | none |
| `packages/core/src/pdv/use-cases/tests/list-orders-use-case.test.ts` | Modify | T1 | FR-10, AC-16 | completed | none |
| `packages/core/src/pdv/use-cases/tests/get-order-use-case.test.ts` | Modify | T1 | FR-09, AC-15 | completed | none |
| `packages/core/src/pdv/use-cases/tests/cancel-order-use-case.test.ts` | Modify | T1 | FR-08, AC-14 | completed | none |

### packages/validation

| Path | Change | Task | FR/AC | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `packages/validation/src/pdv/order-payment-method-schema.ts` | Create | T2 | FR-06, FR-10, AC-11, AC-16 | completed | none |
| `packages/validation/src/pdv/register-order-schema.ts` | Modify | T2 | FR-06, AC-11 | completed | none |
| `packages/validation/src/pdv/order-list-query-schema.ts` | Modify | T2 | FR-10, AC-16 | completed | none |
| `packages/validation/src/web/orders-search-schema.ts` | Modify | T2 | FR-10, AC-17 | completed | none |
| `packages/validation/src/index.ts` | Modify | T2 | FR-06, FR-10, AC-11, AC-16 | completed | none |

### apps/server

| Path | Change | Task | FR/AC | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `apps/server/src/pdv/database/drizzle/models/order-payment-method-model.ts` | Create | T3 | FR-06, AC-12 | completed | none |
| `apps/server/src/pdv/database/drizzle/models/order-model.ts` | Modify | T3 | FR-06, FR-09, AC-12, AC-15 | completed | none |
| `apps/server/src/pdv/database/drizzle/models/index.ts` | Modify | T3 | FR-06, AC-12 | completed | none |
| `apps/server/src/pdv/database/drizzle/mappers/drizzle-order-mapper.ts` | Modify | T3 | FR-08, FR-09, AC-12, AC-15 | completed | none |
| `apps/server/src/pdv/database/drizzle/repositories/drizzle-orders-repository.ts` | Modify | T3 | FR-06, FR-10, FR-13, AC-12, AC-16 | completed | none |
| `apps/server/src/shared/database/drizzle/migrations/0031_order_payment_method.sql` | Generate | T3 | FR-06, FR-09, AC-15 | completed | none |
| `apps/server/src/shared/database/drizzle/migrations/meta/0031_snapshot.json` | Generate | T3 | FR-06, AC-15 | completed | none |
| `apps/server/src/shared/database/drizzle/migrations/meta/_journal.json` | Generate | T3 | FR-06, AC-15 | completed | none |
| `apps/server/src/pdv/fixtures/pdv-module-fixture.ts` | Modify | T3 | FR-06, FR-09, AC-12, AC-15 | completed | none |
| `apps/server/src/pdv/rest/dtos/order-response.dto.ts` | Modify | T3 | FR-08, FR-09, AC-12, AC-15 | completed | none |
| `apps/server/src/pdv/rest/controllers/tests/register-order.controller.test.ts` | Modify | T3 | FR-06, FR-07, FR-13, AC-11, AC-12, AC-13, AC-20 | completed | none |
| `apps/server/src/pdv/rest/controllers/tests/list-orders.controller.test.ts` | Modify | T3 | FR-09, FR-10, FR-13, AC-15, AC-16, AC-20 | completed | none |
| `apps/server/src/pdv/rest/controllers/tests/get-order.controller.test.ts` | Modify | T3 | FR-08, FR-09, AC-12, AC-15 | completed | none |
| `apps/server/src/pdv/rest/controllers/tests/cancel-order.controller.test.ts` | Modify | T3 | FR-08, FR-13, AC-14, AC-20 | completed | none |
| `apps/server/src/pdv/rest/controllers/tests/preview-order.controller.test.ts` | Modify | T3 | FR-03, AC-05 | completed | none |
| `apps/server/src/identity/rest/controllers/tests/search-global.controller.test.ts` | Modify | T3 | FR-06, AC-12 | completed | none |
| `apps/server/src/shared/database/seed.ts` | Modify | T3 | FR-06, AC-12 | completed | none |
| `apps/server/rest-client/pdv/orders.rest` | Modify | T3 | FR-06, FR-10, AC-11, AC-16 | completed | none |

### apps/web

| Path | Change | Task | FR/AC | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| `apps/web/src/rest/services/pdv-service.ts` | Modify | T5 | FR-10, AC-17 | completed | none |
| `apps/web/src/ui/shadcn/radio-group.tsx` | Modify | T4 | FR-01, AC-02 | completed | none |
| `apps/web/src/ui/shared/widgets/components/icon/types/icon-name.ts` | Modify | T4 | FR-01, FR-05, FR-11, AC-01, AC-10, AC-18 | completed | none |
| `apps/web/src/ui/shared/widgets/components/icon/lucide-icon/icons.ts` | Modify | T4 | FR-01, FR-05, FR-11, AC-01, AC-10, AC-18 | completed | none |
| `apps/web/src/ui/pdv/constants/payment-method-presentation.ts` | Create | T4 | FR-01, FR-09, FR-11, FR-12, AC-01, AC-15, AC-18, AC-19 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/index.tsx` | Modify | T4 | FR-02, FR-05, AC-03, AC-10 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/use-new-sale-page.ts` | Modify | T4 | FR-03, FR-04, FR-07, AC-05, AC-06, AC-07, AC-08, AC-09 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart-storage.ts` | Modify | T4 | FR-04, AC-07 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/index.tsx` | Modify | T4 | FR-01, FR-02, AC-01, AC-03, AC-04 | completed | none |
| `apps/web/src/ui/shared/hooks/use-format-percentage.ts` | Create | T4 | FR-05, AC-10 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/use-new-sale-cart.ts` | Modify | T4 | FR-02, AC-03, AC-04 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/payment-method-selector/index.tsx` | Create | T4 | FR-01, AC-01, AC-02 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/payment-method-selector/tests/payment-method-selector.test.tsx` | Create | T4 | FR-01, AC-01, AC-02 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/tests/new-sale-cart.test.tsx` | Modify | T4 | FR-01, FR-02, AC-01, AC-03, AC-04 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/new-sale-cart/tests/use-new-sale-cart.test.ts` | Modify | T4 | FR-02, AC-03, AC-04 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/tests/new-sale-page.test.tsx` | Modify | T4 | FR-04, FR-05, AC-06, AC-10 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/tests/use-new-sale-page.test.ts` | Modify | T4 | FR-03, FR-04, FR-07, AC-05, AC-06, AC-07, AC-08, AC-09 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-registration-dialog/index.tsx` | Modify | T4 | FR-05, AC-10 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-registration-dialog/order-registration-summary/index.tsx` | Create | T4 | FR-05, AC-10 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-registration-dialog/order-registration-summary/use-order-registration-summary.ts` | Create | T4 | FR-05, AC-10 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-registration-dialog/order-registration-summary/tests/use-order-registration-summary.test.ts` | Create | T4 | FR-05, AC-10 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-registration-dialog/tests/order-registration-dialog.test.tsx` | Modify | T4 | FR-05, AC-10 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-confirmation/use-order-confirmation.ts` | Modify | T4 | FR-11, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-confirmation/order-confirmation-metadata/index.tsx` | Modify | T4 | FR-11, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-confirmation/tests/order-confirmation.test.tsx` | Modify | T4 | FR-11, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/new-sale-page/order-confirmation/tests/use-order-confirmation.test.ts` | Modify | T4 | FR-11, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/use-orders-page.ts` | Modify | T5 | FR-10, AC-17 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-filters/index.tsx` | Modify | T5 | FR-10, AC-17 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-filters/use-orders-filters.ts` | Modify | T5 | FR-10, AC-17 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-list/index.tsx` | Modify | T5 | FR-09, FR-11, AC-15, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-list/payment-method-cell/index.tsx` | Create | T5 | FR-09, FR-11, AC-15, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-list/payment-method-cell/use-payment-method-cell.ts` | Create | T5 | FR-09, FR-11, AC-15, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-filtered-empty-state/index.tsx` | Modify | T5 | FR-10, AC-17 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/tests/orders-page.test.tsx` | Modify | T5 | FR-10, AC-17 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/tests/use-orders-page.test.ts` | Modify | T5 | FR-10, AC-17 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-filters/tests/orders-filters.test.tsx` | Modify | T5 | FR-10, AC-17 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-filters/tests/use-orders-filters.test.ts` | Modify | T5 | FR-10, AC-17 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/orders-page/orders-list/tests/orders-list.test.tsx` | Modify | T5 | FR-09, FR-11, AC-15, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/order-details-page/order-summary/index.tsx` | Modify | T5 | FR-08, FR-09, FR-11, AC-14, AC-15, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/order-details-page/order-summary/payment-method-row/index.tsx` | Create | T5 | FR-08, FR-09, FR-11, AC-14, AC-15, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/order-details-page/order-summary/payment-method-row/use-payment-method-row.ts` | Create | T5 | FR-08, FR-09, FR-11, AC-14, AC-15, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/pages/order-details-page/tests/order-details-page.test.tsx` | Modify | T5 | FR-08, FR-09, FR-11, AC-14, AC-15, AC-18 | completed | none |
| `apps/web/src/ui/pdv/widgets/components/order-print/order-print-document/use-order-print-document.ts` | Modify | T5 | FR-09, FR-12, AC-15, AC-19 | completed | none |
| `apps/web/src/ui/pdv/widgets/components/order-print/order-print-document/tests/order-print-document.test.tsx` | Modify | T5 | FR-12, AC-19 | completed | none |
| `apps/web/src/ui/pdv/widgets/components/order-print/order-print-document/tests/use-order-print-document.test.ts` | Modify | T5 | FR-09, FR-12, AC-15, AC-19 | completed | none |
| `apps/web/tests/pdv/new-sale-page.test.ts` | Modify | T4 | FR-01, FR-02, FR-03, FR-04, FR-07, AC-02, AC-03, AC-05, AC-07, AC-08, AC-09 | completed | none |
| `apps/web/tests/pdv/orders-page.test.tsx` | Modify | T5 | FR-10, AC-17 | completed | none |
| `apps/web/tests/pdv/order-page.test.tsx` | Modify | T5 | FR-09, FR-11, FR-12, AC-15, AC-18, AC-19 | completed | none |

## Criteria without a contracted path

- None
