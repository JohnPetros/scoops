import type { OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'
import { pgEnum } from 'drizzle-orm/pg-core'

export const orderPaymentMethodModel = pgEnum('pdv_order_payment_method', [
  'pix',
  'credit-card',
  'debit-card',
  'cash',
] as [OrderPaymentMethod, ...OrderPaymentMethod[]])
