import type { Order } from '@scoops/core/pdv/domain/entities'

import { getPaymentMethodPresentation } from '@/ui/pdv/constants/payment-method-presentation'

export type PaymentMethodCellProps = { paymentMethod: Order['paymentMethod'] }

export function usePaymentMethodCell({ paymentMethod }: PaymentMethodCellProps) {
  const { icon, label } = getPaymentMethodPresentation(paymentMethod)
  const isInformed = Boolean(paymentMethod)

  return {
    containerClassName: isInformed
      ? 'flex items-center gap-2'
      : 'flex items-center gap-2 text-text-tertiary',
    icon,
    iconClassName: isInformed
      ? 'size-[15px] shrink-0 text-primary'
      : 'size-[15px] shrink-0',
    label,
  }
}
