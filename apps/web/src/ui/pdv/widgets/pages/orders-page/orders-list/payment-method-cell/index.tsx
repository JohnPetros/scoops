import { Icon } from '@/ui/shared/widgets/components/icon'

import {
  type PaymentMethodCellProps,
  usePaymentMethodCell,
} from './use-payment-method-cell'

export type { PaymentMethodCellProps }

export const PaymentMethodCell = (props: PaymentMethodCellProps) => {
  const { containerClassName, icon, iconClassName, label } = usePaymentMethodCell(props)

  return (
    <span className={containerClassName}>
      <Icon className={iconClassName} name={icon} />
      {label}
    </span>
  )
}
