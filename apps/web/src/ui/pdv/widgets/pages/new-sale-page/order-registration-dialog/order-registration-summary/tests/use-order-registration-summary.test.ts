import type { SalesChannel } from '@scoops/core/pdv/domain/entities'
import type { Cart } from '@scoops/core/pdv/domain/structures'
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useOrderRegistrationSummary } from '../use-order-registration-summary'

const cart = {
  lines: [{ quantity: 1 }, { quantity: 2 }],
  discounts: [],
  total: 2336,
} as unknown as Cart

const channel = { name: 'Delivery próprio', percentage: 12.5 } as SalesChannel

describe('useOrderRegistrationSummary', () => {
  it('labels the channel with its signed percentage', () => {
    const { result } = renderHook(() => useOrderRegistrationSummary({ cart, channel }))

    expect(result.current.channelLabel).toBe('Delivery próprio · +12,5%')
  })

  it('distinguishes an unresolved channel from no channel', () => {
    const unresolved = renderHook(() =>
      useOrderRegistrationSummary({ cart, isChannelUnresolved: true }),
    )
    const none = renderHook(() => useOrderRegistrationSummary({ cart }))

    expect(unresolved.result.current.channelLabel).toBe('Canal indisponível')
    expect(none.result.current.channelLabel).toBe('Sem canal')
  })

  it('counts items and units with their plural forms', () => {
    const many = renderHook(() => useOrderRegistrationSummary({ cart }))
    const single = renderHook(() =>
      useOrderRegistrationSummary({
        cart: { ...cart, lines: [{ quantity: 1 }] } as unknown as Cart,
      }),
    )

    expect(many.result.current.itemsLabel).toBe('2 itens')
    expect(many.result.current.unitsLabel).toBe('3 unidades')
    expect(single.result.current.itemsLabel).toBe('1 item')
    expect(single.result.current.unitsLabel).toBe('1 unidade')
  })

  it('presents the selected payment method', () => {
    const { result } = renderHook(() =>
      useOrderRegistrationSummary({ cart, paymentMethod: 'cash' }),
    )

    expect(result.current.paymentMethodPresentation.label).toBe('Dinheiro')
  })
})
