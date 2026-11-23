import type { SalesChannel } from '@scoops/core/pdv/domain/entities'
import type { Cart, OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'

import { getPaymentMethodPresentation } from '@/ui/pdv/constants/payment-method-presentation'
import { useFormatCurrency } from '@/ui/shared/hooks/use-format-currency'
import { Icon } from '@/ui/shared/widgets/components/icon'

export type OrderRegistrationSummaryProps = {
  cart: Cart
  channel?: SalesChannel
  isChannelUnresolved?: boolean
  paymentMethod?: OrderPaymentMethod
}

const PERCENTAGE_FORMATTER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const ROW_CLASS_NAME =
  'flex items-center justify-between gap-4 border-b border-border-soft py-2'
const LABEL_CLASS_NAME = 'text-xs whitespace-nowrap font-semibold text-muted-foreground'

export const OrderRegistrationSummary = ({
  cart,
  channel,
  isChannelUnresolved = false,
  paymentMethod,
}: OrderRegistrationSummaryProps) => {
  const formatCurrency = useFormatCurrency()
  const paymentMethodPresentation = getPaymentMethodPresentation(paymentMethod)
  const itemsCount = cart.lines.length
  const unitsCount = cart.lines.reduce((total, line) => total + line.quantity, 0)

  return (
    <dl className='rounded-xl border border-border-soft bg-muted px-4 py-0.5'>
      <div className={ROW_CLASS_NAME}>
        <dt className={LABEL_CLASS_NAME}>Canal de venda</dt>
        <dd className='flex items-center gap-1.5 text-sm font-bold'>
          {channel ? (
            <>
              <Icon className='size-3.5 text-primary sm:hidden' name='store' />
              {`${channel.name} · ${channel.percentage > 0 ? '+' : ''}${PERCENTAGE_FORMATTER.format(channel.percentage)}%`}
            </>
          ) : isChannelUnresolved ? (
            'Canal indisponível'
          ) : (
            'Sem canal'
          )}
        </dd>
      </div>
      <div className={ROW_CLASS_NAME}>
        <dt className={LABEL_CLASS_NAME}>Forma de pagamento</dt>
        <dd className='flex items-center gap-1.5 text-sm font-bold'>
          <Icon className='size-3.5 text-primary' name={paymentMethodPresentation.icon} />
          {paymentMethodPresentation.label}
        </dd>
      </div>
      <div className={ROW_CLASS_NAME}>
        <dt className={LABEL_CLASS_NAME}>Itens</dt>
        <dd className='text-sm font-bold'>
          {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} · {unitsCount}{' '}
          {unitsCount === 1 ? 'unidade' : 'unidades'}
        </dd>
      </div>
      {cart.discounts.map((discount) => (
        <div className={ROW_CLASS_NAME} key={discount.discountId}>
          <dt className={LABEL_CLASS_NAME}>{discount.name}</dt>
          <dd className='text-sm font-extrabold text-success'>
            Economia de {formatCurrency(discount.savings)}
          </dd>
        </div>
      ))}
      <div className='flex items-center justify-between gap-4 py-2'>
        <dt className='text-sm font-extrabold'>Total</dt>
        <dd className='text-2xl font-black'>{formatCurrency(cart.total)}</dd>
      </div>
    </dl>
  )
}
