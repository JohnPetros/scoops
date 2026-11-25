import type { SalesChannel } from '@scoops/core/pdv/domain/entities'
import type { Cart, OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'

import { getPaymentMethodPresentation } from '@/ui/pdv/constants/payment-method-presentation'
import { useFormatCurrency } from '@/ui/shared/hooks/use-format-currency'
import { useFormatPercentage } from '@/ui/shared/hooks/use-format-percentage'

export type OrderRegistrationSummaryProps = {
  cart: Cart
  channel?: SalesChannel
  isChannelUnresolved?: boolean
  paymentMethod?: OrderPaymentMethod
}

export function useOrderRegistrationSummary({
  cart,
  channel,
  isChannelUnresolved = false,
  paymentMethod,
}: OrderRegistrationSummaryProps) {
  const formatCurrency = useFormatCurrency()
  const formatPercentage = useFormatPercentage()
  const paymentMethodPresentation = getPaymentMethodPresentation(paymentMethod)
  const itemsCount = cart.lines.length
  const unitsCount = cart.lines.reduce((total, line) => total + line.quantity, 0)

  function getChannelLabel() {
    if (channel) {
      const sign = channel.percentage > 0 ? '+' : ''
      return `${channel.name} · ${sign}${formatPercentage(channel.percentage)}%`
    }
    return isChannelUnresolved ? 'Canal indisponível' : 'Sem canal'
  }

  return {
    channelLabel: getChannelLabel(),
    formatCurrency,
    itemsLabel: `${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}`,
    paymentMethodPresentation,
    unitsLabel: `${unitsCount} ${unitsCount === 1 ? 'unidade' : 'unidades'}`,
  }
}
