import { OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useNewSaleCart } from '../use-new-sale-cart'

describe('useNewSaleCart', () => {
  it('guards registration and confirms clearing the local cart', () => {
    const onClear = vi.fn()
    const onRegister = vi.fn()
    const props = {
      canRegister: false,
      channels: [],
      isPreviewPending: false,
      lineInputs: [
        {
          accompanimentIds: [],
          kind: 'resale' as const,
          productId: 'product-1',
          quantity: 1,
        },
      ],
      products: [],
      onChannelChange: vi.fn(),
      onClear,
      onEditLine: vi.fn(),
      onPaymentMethodChange: vi.fn(),
      onQuantityChange: vi.fn(),
      onRegister,
      onRemoveLine: vi.fn(),
      previewCart: undefined,
    }
    const { result } = renderHook(() => useNewSaleCart(props))

    act(() => result.current.handleRegister())
    act(() => result.current.handleOpenClearConfirmation())
    expect(onRegister).not.toHaveBeenCalled()
    expect(result.current.isClearConfirmationOpen).toBe(true)
    act(() => result.current.handleConfirmClear())

    expect(onClear).toHaveBeenCalledOnce()
    expect(result.current.isClearConfirmationOpen).toBe(false)
  })

  it('derives the missing-method reason and registration enablement', () => {
    const onRegister = vi.fn()
    const props = {
      canRegister: true,
      channels: [],
      isPreviewPending: false,
      lineInputs: [],
      products: [],
      onChannelChange: vi.fn(),
      onClear: vi.fn(),
      onEditLine: vi.fn(),
      onPaymentMethodChange: vi.fn(),
      onQuantityChange: vi.fn(),
      onRegister,
      onRemoveLine: vi.fn(),
      previewCart: undefined,
    }

    const withoutMethod = renderHook(() => useNewSaleCart(props))
    expect(withoutMethod.result.current.shouldShowPaymentMethodReason).toBe(true)
    expect(withoutMethod.result.current.isRegisterDisabled).toBe(true)
    act(() => withoutMethod.result.current.handleRegister())
    expect(onRegister).not.toHaveBeenCalled()

    const withMethod = renderHook(() =>
      useNewSaleCart({ ...props, paymentMethod: OrderPaymentMethod.Pix }),
    )
    expect(withMethod.result.current.shouldShowPaymentMethodReason).toBe(false)
    expect(withMethod.result.current.isRegisterDisabled).toBe(false)
    act(() => withMethod.result.current.handleRegister())
    expect(onRegister).toHaveBeenCalledOnce()

    const pending = renderHook(() =>
      useNewSaleCart({
        ...props,
        isPreviewPending: true,
        paymentMethod: OrderPaymentMethod.Pix,
      }),
    )
    expect(pending.result.current.isRegisterDisabled).toBe(true)
    expect(pending.result.current.shouldShowPaymentMethodReason).toBe(false)

    const notRegistrable = renderHook(() =>
      useNewSaleCart({
        ...props,
        canRegister: false,
        paymentMethod: OrderPaymentMethod.Pix,
      }),
    )
    expect(notRegistrable.result.current.isRegisterDisabled).toBe(true)
  })
})
