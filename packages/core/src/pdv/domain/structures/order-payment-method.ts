export const OrderPaymentMethod = {
  Pix: 'pix',
  CreditCard: 'credit-card',
  DebitCard: 'debit-card',
  Cash: 'cash',
} as const

export type OrderPaymentMethod =
  (typeof OrderPaymentMethod)[keyof typeof OrderPaymentMethod]
