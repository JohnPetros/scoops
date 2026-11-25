import type { Order } from '@scoops/core/pdv/domain/entities'

import { getPaymentMethodPresentation } from '@/ui/pdv/constants/payment-method-presentation'

export type PaymentMethodRowProps = { paymentMethod: Order['paymentMethod'] }

export function usePaymentMethodRow({ paymentMethod }: PaymentMethodRowProps) {
  const { icon, label } = getPaymentMethodPresentation(paymentMethod)
  const isInformed = Boolean(paymentMethod)

  return {
    icon,
    iconClassName: isInformed
      ? 'size-[15px] shrink-0 text-primary'
      : 'size-[15px] shrink-0',
    label,
    valueClassName: isInformed
      ? 'mt-1 flex items-center gap-2 font-semibold'
      : 'mt-1 flex items-center gap-2 font-semibold text-text-tertiary',
  }
}
