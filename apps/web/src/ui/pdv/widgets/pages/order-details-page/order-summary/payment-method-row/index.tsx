import { Icon } from '@/ui/shared/widgets/components/icon'

import { type PaymentMethodRowProps, usePaymentMethodRow } from './use-payment-method-row'

export type { PaymentMethodRowProps }

export const PaymentMethodRow = (props: PaymentMethodRowProps) => {
  const { icon, iconClassName, label, valueClassName } = usePaymentMethodRow(props)

  return (
    <div>
      <p className='text-xs text-muted-foreground'>Forma de pagamento</p>
      <p className={valueClassName}>
        <Icon className={iconClassName} name={icon} />
        {label}
      </p>
    </div>
  )
}
