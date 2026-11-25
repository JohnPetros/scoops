import type { OrderPaymentMethod } from '#pdv/domain/structures/order-payment-method.ts'
import type { OrderPreviewInput } from '#pdv/domain/structures/order-preview.ts'

export interface OrderRegistrationInput extends OrderPreviewInput {
  readonly idempotencyKey: string
  readonly previewToken: string
  readonly paymentMethod: OrderPaymentMethod
}
