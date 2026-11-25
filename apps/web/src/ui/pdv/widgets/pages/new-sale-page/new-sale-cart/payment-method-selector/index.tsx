import type { OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'

import {
  PAYMENT_METHOD_PRESENTATION,
  PAYMENT_METHODS,
} from '@/ui/pdv/constants/payment-method-presentation'
import { RadioGroup, RadioGroupCardItem } from '@/ui/shadcn/radio-group'
import { Icon } from '@/ui/shared/widgets/components/icon'

export type PaymentMethodSelectorProps = {
  paymentMethod?: OrderPaymentMethod
  onPaymentMethodChange: (paymentMethod: OrderPaymentMethod) => void
}

const LABEL_ID = 'new-sale-payment-method-label'
const HINT_ID = 'new-sale-payment-method-hint'

export const PaymentMethodSelector = ({
  paymentMethod,
  onPaymentMethodChange,
}: PaymentMethodSelectorProps) => (
  <div className='flex flex-col gap-1.5'>
    <div className='flex items-center justify-between gap-3'>
      <span className='text-sm font-bold' id={LABEL_ID}>
        Forma de pagamento
      </span>
      <span className='text-xs text-muted-foreground'>Obrigatório</span>
    </div>
    <RadioGroup
      aria-describedby={paymentMethod ? undefined : HINT_ID}
      aria-labelledby={LABEL_ID}
      className='flex gap-1'
      onValueChange={(nextValue) => {
        const nextMethod = PAYMENT_METHODS.find((method) => method === nextValue)
        if (nextMethod) onPaymentMethodChange(nextMethod)
      }}
      required
      value={paymentMethod ?? null}
    >
      {PAYMENT_METHODS.map((method) => (
        <RadioGroupCardItem key={method} value={method}>
          <Icon
            className='size-[15px] shrink-0 max-sm:hidden'
            name={PAYMENT_METHOD_PRESENTATION[method].icon}
          />
          <span className='min-w-0 truncate'>
            {PAYMENT_METHOD_PRESENTATION[method].shortLabel}
          </span>
        </RadioGroupCardItem>
      ))}
    </RadioGroup>
    {paymentMethod ? null : (
      <p
        className='flex items-start gap-1.5 text-[11px] leading-[15px] font-semibold text-muted-foreground'
        id={HINT_ID}
      >
        <Icon className='mt-px size-[13px] shrink-0' name='info' />
        Escolha como o cliente vai pagar para registrar o pedido.
      </p>
    )}
  </div>
)
