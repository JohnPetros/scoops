import { OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'

import type { IconName } from '@/ui/shared/widgets/components/icon/types'

export type PaymentMethodPresentation = {
  icon: IconName
  label: string
  shortLabel: string
}

export const PAYMENT_METHOD_PRESENTATION: Record<
  OrderPaymentMethod,
  PaymentMethodPresentation
> = {
  [OrderPaymentMethod.Pix]: { icon: 'qr-code', label: 'Pix', shortLabel: 'Pix' },
  [OrderPaymentMethod.CreditCard]: {
    icon: 'credit-card',
    label: 'Cartão de crédito',
    shortLabel: 'Crédito',
  },
  [OrderPaymentMethod.DebitCard]: {
    icon: 'wallet-cards',
    label: 'Cartão de débito',
    shortLabel: 'Débito',
  },
  [OrderPaymentMethod.Cash]: {
    icon: 'banknote',
    label: 'Dinheiro',
    shortLabel: 'Dinheiro',
  },
}

export const PAYMENT_METHOD_NOT_INFORMED_PRESENTATION: PaymentMethodPresentation = {
  icon: 'circle-minus',
  label: 'Não informado',
  shortLabel: 'Não informado',
}

export const PAYMENT_METHODS: readonly OrderPaymentMethod[] = [
  OrderPaymentMethod.Pix,
  OrderPaymentMethod.CreditCard,
  OrderPaymentMethod.DebitCard,
  OrderPaymentMethod.Cash,
]

export function getPaymentMethodPresentation(
  paymentMethod: OrderPaymentMethod | undefined,
): PaymentMethodPresentation {
  return paymentMethod
    ? PAYMENT_METHOD_PRESENTATION[paymentMethod]
    : PAYMENT_METHOD_NOT_INFORMED_PRESENTATION
}
