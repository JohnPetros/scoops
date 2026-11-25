import { OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useActiveSalesChannelsQuery } from '@/ui/pdv/hooks/use-active-sales-channels-query'
import { usePreviewOrderAction } from '@/ui/pdv/hooks/use-preview-order-action'
import { useRegisterOrderAction } from '@/ui/pdv/hooks/use-register-order-action'
import { useAuthContext } from '@/ui/shared/hooks/use-auth-context'

import { getNewSaleCartStorageKey } from '../new-sale-cart-storage'
import { useNewSalePage } from '../use-new-sale-page'

vi.mock('@/ui/pdv/hooks/use-active-sales-channels-query', () => ({
  useActiveSalesChannelsQuery: vi.fn(),
}))
vi.mock('@/ui/pdv/hooks/use-preview-order-action', () => ({
  usePreviewOrderAction: vi.fn(),
}))
vi.mock('@/ui/pdv/hooks/use-register-order-action', () => ({
  useRegisterOrderAction: vi.fn(),
}))
vi.mock('@/ui/shared/hooks/use-auth-context', () => ({ useAuthContext: vi.fn() }))

const useActiveSalesChannelsQueryMock = vi.mocked(useActiveSalesChannelsQuery)
const usePreviewOrderActionMock = vi.mocked(usePreviewOrderAction)
const useRegisterOrderActionMock = vi.mocked(useRegisterOrderAction)
const useAuthContextMock = vi.mocked(useAuthContext)

const account = { establishmentId: 'establishment-1' }

const product = {
  productId: 'product-1',
  name: 'Pote pronto',
  kind: 'resale' as const,
  stockControl: 'single' as const,
  isActive: true,
  isAvailable: true,
  sizes: [],
  resaleBrands: [],
}

describe('useNewSalePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAuthContextMock.mockReturnValue({ account } as never)
  })

  afterEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('owns local cart quantity changes and sends a preview input without prices', async () => {
    const previewOrder = vi.fn().mockResolvedValue({
      response: {
        body: {
          cart: {
            establishmentId: 'establishment-1',
            lines: [],
            discounts: [],
            subtotal: 0,
            totalDiscount: 0,
            total: 0,
          },
          previewToken: 'preview-token',
        },
        isFailure: false,
        statusCode: 200,
      },
    })
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    usePreviewOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      previewOrder,
    } as never)
    useRegisterOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      registerOrder: vi.fn(),
    } as never)

    const { result } = renderHook(() => useNewSalePage())
    const line = {
      accompanimentIds: [],
      kind: 'resale' as const,
      productId: product.productId,
      quantity: 1,
    }

    act(() => result.current.handleSelectProduct(product))
    act(() => result.current.handleSaveLine(line))
    act(() => result.current.handleQuantityChange(0, 2))

    await waitFor(() => expect(result.current.lineInputs[0]?.quantity).toBe(2))
    await waitFor(() => expect(previewOrder).toHaveBeenCalled())
    const request = previewOrder.mock.calls.at(-1)?.[0]
    expect(request).toEqual({
      lines: [{ kind: 'resale', productId: product.productId, quantity: 2 }],
    })
    expect(request).not.toHaveProperty('total')
    expect(request).not.toHaveProperty('price')
  })

  it('restores the cart from localStorage and requests a fresh preview', async () => {
    const line = {
      accompanimentIds: [],
      kind: 'resale' as const,
      productId: product.productId,
      quantity: 2,
    }
    const previewOrder = vi.fn().mockResolvedValue({
      response: {
        body: {
          cart: {
            establishmentId: 'establishment-1',
            lines: [],
            discounts: [],
            subtotal: 0,
            totalDiscount: 0,
            total: 0,
          },
          previewToken: 'preview-token',
        },
        isFailure: false,
        statusCode: 200,
      },
    })
    window.localStorage.setItem(
      getNewSaleCartStorageKey(account.establishmentId),
      JSON.stringify({ version: 1, lineInputs: [line], products: [product] }),
    )
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    usePreviewOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      previewOrder,
    } as never)
    useRegisterOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      registerOrder: vi.fn(),
    } as never)

    const { result } = renderHook(() => useNewSalePage())

    await waitFor(() => expect(result.current.lineInputs).toEqual([line]))
    expect(result.current.catalogProducts).toEqual([product])
    await waitFor(() =>
      expect(previewOrder).toHaveBeenCalledWith({
        lines: [{ kind: 'resale', productId: product.productId, quantity: 2 }],
      }),
    )
  })

  it('keeps repeated portion products as separate lines by accompaniment configuration', async () => {
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    usePreviewOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      previewOrder: vi.fn().mockResolvedValue({
        response: { body: {}, isFailure: false, statusCode: 200 },
      }),
    } as never)
    useRegisterOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      registerOrder: vi.fn(),
    } as never)

    const { result } = renderHook(() => useNewSalePage())
    const firstLine = {
      accompanimentIds: ['granola'],
      kind: 'portion' as const,
      productId: 'acai',
      quantity: 1,
      sizeId: 'large',
    }
    const secondLine = {
      ...firstLine,
      accompanimentIds: ['banana'],
    }

    act(() => result.current.handleSaveLine(firstLine))
    act(() => result.current.handleSaveLine(secondLine))

    expect(result.current.lineInputs).toEqual([firstLine, secondLine])
    act(() => result.current.handleQuantityChange(1, 3))
    expect(result.current.lineInputs).toEqual([firstLine, { ...secondLine, quantity: 3 }])
  })

  it('removes the persisted cart when the current order is cleared', async () => {
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    usePreviewOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      previewOrder: vi.fn().mockResolvedValue({
        response: {
          body: {
            cart: {
              establishmentId: 'establishment-1',
              lines: [],
              discounts: [],
              subtotal: 0,
              totalDiscount: 0,
              total: 0,
            },
            previewToken: 'preview-token',
          },
          isFailure: false,
          statusCode: 200,
        },
      }),
    } as never)
    useRegisterOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      registerOrder: vi.fn(),
    } as never)

    const { result } = renderHook(() => useNewSalePage())
    act(() =>
      result.current.handleSaveLine({
        accompanimentIds: [],
        kind: 'resale',
        productId: product.productId,
        quantity: 1,
      }),
    )

    await waitFor(() =>
      expect(
        window.localStorage.getItem(getNewSaleCartStorageKey(account.establishmentId)),
      ).not.toBeNull(),
    )
    act(() => result.current.handleClear())

    await waitFor(() =>
      expect(
        window.localStorage.getItem(getNewSaleCartStorageKey(account.establishmentId)),
      ).toBeNull(),
    )
  })

  it('creates a new idempotency key for every cart or channel mutation', () => {
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    usePreviewOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      previewOrder: vi.fn(),
    } as never)
    useRegisterOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      registerOrder: vi.fn(),
    } as never)

    const { result } = renderHook(() => useNewSalePage())
    const line = {
      accompanimentIds: [],
      kind: 'resale' as const,
      productId: product.productId,
      quantity: 1,
    }

    act(() => result.current.handleSaveLine(line))
    const afterAdd = result.current.idempotencyKey
    act(() => result.current.handleQuantityChange(0, 2))
    const afterQuantity = result.current.idempotencyKey
    act(() => result.current.handleChannelChange('channel-1'))
    const afterChannel = result.current.idempotencyKey

    expect(afterAdd).toBeTruthy()
    expect(afterQuantity).toBeTruthy()
    expect(afterChannel).toBeTruthy()
    expect(afterQuantity).not.toBe(afterAdd)
    expect(afterChannel).not.toBe(afterQuantity)
  })

  it('reuses the unchanged registration request key only for a retry', async () => {
    const previewOrder = vi.fn().mockResolvedValue({
      response: {
        body: {
          cart: {
            establishmentId: 'establishment-1',
            lines: [],
            discounts: [],
            subtotal: 0,
            totalDiscount: 0,
            total: 0,
          },
          previewToken: 'preview-token',
        },
        isFailure: false,
        statusCode: 200,
      },
    })
    const registerOrder = vi
      .fn()
      .mockResolvedValueOnce({ response: { isFailure: true, statusCode: 503 } })
      .mockResolvedValueOnce({
        response: {
          body: { kind: 'registered', order: {}, replayed: false },
          isFailure: false,
          statusCode: 201,
        },
      })
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    usePreviewOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      previewOrder,
    } as never)
    useRegisterOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      registerOrder,
    } as never)

    const { result } = renderHook(() => useNewSalePage())
    act(() =>
      result.current.handleSaveLine({
        accompanimentIds: [],
        kind: 'resale',
        productId: product.productId,
        quantity: 1,
      }),
    )
    await waitFor(() => expect(result.current.previewToken).toBe('preview-token'))
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.Pix))
    act(() => result.current.handleRegister())
    await act(async () => {
      await result.current.handleConfirmRegistration()
    })

    expect(result.current.registrationFeedback).toBe('rollback')
    const firstRequest = registerOrder.mock.calls[0]?.[0]

    act(() => result.current.handleRetryRegistration())
    await waitFor(() => expect(result.current.registeredOrder).toBeDefined())

    expect(registerOrder).toHaveBeenCalledTimes(2)
    expect(registerOrder.mock.calls[1]?.[0]).toEqual(firstRequest)
  })

  it('surfaces preview failures and refreshes the request when the user retries', async () => {
    const previewOrder = vi
      .fn()
      .mockResolvedValueOnce({
        response: { isFailure: true, errorMessage: 'Preço indisponível' },
      })
      .mockResolvedValueOnce({
        response: {
          body: {
            cart: {
              establishmentId: 'establishment-1',
              lines: [],
              discounts: [],
              subtotal: 10,
              totalDiscount: 0,
              total: 10,
            },
            previewToken: 'refreshed-preview',
          },
          isFailure: false,
          statusCode: 200,
        },
      })
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    usePreviewOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      previewOrder,
    } as never)
    useRegisterOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      registerOrder: vi.fn(),
    } as never)

    const { result } = renderHook(() => useNewSalePage())
    act(() =>
      result.current.handleSaveLine({
        accompanimentIds: [],
        kind: 'resale',
        productId: product.productId,
        quantity: 1,
      }),
    )
    await waitFor(() => expect(result.current.previewError).toBe('Preço indisponível'))

    act(() => result.current.handleRefreshPreview())
    await waitFor(() => expect(result.current.previewToken).toBe('refreshed-preview'))
    expect(previewOrder).toHaveBeenCalledTimes(2)
    expect(result.current.previewError).toBeUndefined()
  })

  it('keeps the cart safe when quantities are outside the supported bounds', async () => {
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    usePreviewOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      previewOrder: vi.fn(),
    } as never)
    useRegisterOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      registerOrder: vi.fn(),
    } as never)
    const { result } = renderHook(() => useNewSalePage())
    const line = {
      accompanimentIds: [],
      kind: 'resale' as const,
      productId: product.productId,
      quantity: 1,
    }

    act(() => result.current.handleSaveLine(line))
    act(() => result.current.handleQuantityChange(0, 0))
    act(() => result.current.handleQuantityChange(0, 1000))
    expect(result.current.lineInputs).toEqual([line])

    act(() => result.current.handleEditLine(line, undefined, 0))
    expect(result.current.selectedProduct).toBeUndefined()
    act(() => result.current.handleDialogOpenChange(false))
    expect(result.current.editingLine).toBeUndefined()
  })

  it('maps a transient registration response to a verification retry and then a registered order', async () => {
    const previewOrder = vi.fn().mockResolvedValue({
      response: {
        body: {
          cart: {
            establishmentId: 'establishment-1',
            lines: [],
            discounts: [],
            subtotal: 10,
            totalDiscount: 0,
            total: 10,
          },
          previewToken: 'preview-token',
        },
        isFailure: false,
        statusCode: 200,
      },
    })
    const registerOrder = vi
      .fn()
      .mockResolvedValueOnce({ response: { statusCode: 0, isFailure: true } })
      .mockResolvedValueOnce({
        response: {
          body: { kind: 'registered', order: { id: 'order-1' }, replayed: false },
          isFailure: false,
          statusCode: 201,
        },
      })
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    usePreviewOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      previewOrder,
    } as never)
    useRegisterOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      registerOrder,
    } as never)

    const { result } = renderHook(() => useNewSalePage())
    act(() =>
      result.current.handleSaveLine({
        accompanimentIds: [],
        kind: 'resale',
        productId: product.productId,
        quantity: 1,
      }),
    )
    await waitFor(() => expect(result.current.previewToken).toBe('preview-token'))
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.Pix))
    act(() => result.current.handleRegister())
    await act(async () => result.current.handleConfirmRegistration())

    await waitFor(() => expect(result.current.registeredOrder).toEqual({ id: 'order-1' }))
    expect(registerOrder).toHaveBeenCalledTimes(2)
    expect(result.current.isVerification).toBe(false)
    expect(result.current.lineInputs).toEqual([])
  })

  it('preserves a repriced preview, then refreshes same-line facts after channel change', async () => {
    const previewOrder = vi
      .fn()
      .mockResolvedValueOnce({
        response: {
          body: {
            cart: {
              establishmentId: 'establishment-1',
              lines: [],
              discounts: [],
              subtotal: 10,
              totalDiscount: 0,
              total: 10,
            },
            previewToken: 'preview-token',
          },
          isFailure: false,
          statusCode: 200,
        },
      })
      .mockResolvedValueOnce({
        response: {
          body: {
            cart: {
              establishmentId: 'establishment-1',
              lines: [],
              discounts: [],
              subtotal: 10,
              totalDiscount: 0,
              total: 10,
            },
            previewToken: 'channel-preview',
          },
          isFailure: false,
          statusCode: 200,
        },
      })
    const recalculatedCart = {
      establishmentId: 'establishment-1',
      lines: [
        {
          accompanimentIds: [],
          kind: 'resale' as const,
          productId: product.productId,
          quantity: 2,
        },
      ],
      discounts: [],
      subtotal: 20,
      totalDiscount: 0,
      total: 20,
    }
    const registerOrder = vi
      .fn()
      .mockResolvedValueOnce({
        response: {
          body: {
            kind: 'repriced',
            recalculatedCart,
            previewToken: 'new-preview',
            changes: [],
          },
          isFailure: true,
          statusCode: 409,
        },
      })
      .mockResolvedValueOnce({
        response: {
          body: { kind: 'review-required', shortages: [], changes: [] },
          isFailure: false,
          statusCode: 201,
        },
      })
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    usePreviewOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      previewOrder,
    } as never)
    useRegisterOrderActionMock.mockReturnValue({
      error: null,
      isPending: false,
      registerOrder,
    } as never)

    const { result } = renderHook(() => useNewSalePage())
    act(() =>
      result.current.handleSaveLine({
        accompanimentIds: [],
        kind: 'resale',
        productId: product.productId,
        quantity: 1,
      }),
    )
    await waitFor(() => expect(result.current.previewToken).toBe('preview-token'))
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.Pix))
    act(() => result.current.handleRegister())
    await act(async () => result.current.handleConfirmRegistration())

    expect(result.current.registrationResult?.kind).toBe('repriced')
    expect(result.current.lineInputs[0]?.quantity).toBe(2)
    expect(result.current.previewToken).toBe('new-preview')
    act(() => result.current.handleFeedbackAction())
    expect(result.current.isRegistrationOpen).toBe(true)
    act(() => result.current.handleChannelChange('channel-1'))
    await waitFor(() => expect(result.current.previewToken).toBe('channel-preview'))
    expect(previewOrder).toHaveBeenCalledTimes(2)
    expect(previewOrder.mock.calls[1]?.[0]).toMatchObject({
      channelId: 'channel-1',
      lines: [{ quantity: 2, productId: product.productId }],
    })
    await act(async () => result.current.handleConfirmRegistration())
    expect(result.current.registrationResult?.kind).toBe('review-required')
    expect(registerOrder.mock.calls[1]?.[0]).toMatchObject({
      channelId: 'channel-1',
      previewToken: 'channel-preview',
    })
  })
})

const previewCart = {
  establishmentId: 'establishment-1',
  lines: [],
  discounts: [],
  subtotal: 10,
  totalDiscount: 0,
  total: 10,
}
const resaleLine = {
  accompanimentIds: [],
  kind: 'resale' as const,
  productId: product.productId,
  quantity: 1,
}
const registeredResponse = {
  response: {
    body: { kind: 'registered', order: { id: 'order-1' }, replayed: false },
    isFailure: false,
    statusCode: 201,
  },
}

function setupPaymentMethodHook(
  registerOrder = vi.fn().mockResolvedValue(registeredResponse),
) {
  const previewOrder = vi.fn().mockResolvedValue({
    response: {
      body: { cart: previewCart, previewToken: 'preview-token' },
      isFailure: false,
      statusCode: 200,
    },
  })
  useActiveSalesChannelsQueryMock.mockReturnValue({
    activeSalesChannels: [],
    isActiveSalesChannelsError: false,
    isLoadingActiveSalesChannels: false,
    isRefreshingActiveSalesChannels: false,
  } as never)
  usePreviewOrderActionMock.mockReturnValue({
    error: null,
    isPending: false,
    previewOrder,
  } as never)
  useRegisterOrderActionMock.mockReturnValue({
    error: null,
    isPending: false,
    registerOrder,
  } as never)
  return { previewOrder, registerOrder, ...renderHook(() => useNewSalePage()) }
}

function readStoredCart() {
  const raw = window.localStorage.getItem(
    getNewSaleCartStorageKey(account.establishmentId),
  )
  return raw ? JSON.parse(raw) : null
}

describe('useNewSalePage payment method', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAuthContextMock.mockReturnValue({ account } as never)
  })

  afterEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
  })

  it('starts without a method and never lets a method change reach the preview', async () => {
    const { previewOrder, result } = setupPaymentMethodHook()
    expect(result.current.paymentMethod).toBeUndefined()
    act(() => result.current.handleSaveLine(resaleLine))
    await waitFor(() => expect(result.current.previewToken).toBe('preview-token'))
    expect(previewOrder).toHaveBeenCalledTimes(1)
    const keyBeforeChange = result.current.idempotencyKey

    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.Pix))
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.CreditCard))

    expect(result.current.paymentMethod).toBe(OrderPaymentMethod.CreditCard)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(previewOrder).toHaveBeenCalledTimes(1)
    expect(result.current.previewToken).toBe('preview-token')
    expect(result.current.previewCart).toEqual(previewCart)
    expect(result.current.idempotencyKey).not.toBe(keyBeforeChange)
    for (const [request] of previewOrder.mock.calls) {
      expect(request).not.toHaveProperty('paymentMethod')
    }
  })

  it('does not open registration or send a request while no method is chosen', async () => {
    const { registerOrder, result } = setupPaymentMethodHook()
    act(() => result.current.handleSaveLine(resaleLine))
    await waitFor(() => expect(result.current.previewToken).toBe('preview-token'))

    act(() => result.current.handleRegister())
    await act(async () => result.current.handleConfirmRegistration())

    expect(result.current.isRegistrationOpen).toBe(false)
    expect(registerOrder).not.toHaveBeenCalled()
  })

  it('posts the selected method and rotates the key when the method changes after a failure', async () => {
    const registerOrder = vi
      .fn()
      .mockResolvedValueOnce({ response: { isFailure: true, statusCode: 503 } })
      .mockResolvedValueOnce({ response: { isFailure: true, statusCode: 503 } })
      .mockResolvedValueOnce(registeredResponse)
    const { result } = setupPaymentMethodHook(registerOrder)
    act(() => result.current.handleSaveLine(resaleLine))
    await waitFor(() => expect(result.current.previewToken).toBe('preview-token'))
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.Pix))
    act(() => result.current.handleRegister())
    await act(async () => result.current.handleConfirmRegistration())

    expect(registerOrder.mock.calls[0]?.[0]).toMatchObject({
      paymentMethod: OrderPaymentMethod.Pix,
      previewToken: 'preview-token',
    })
    expect(result.current.registrationFeedback).toBe('rollback')

    act(() => result.current.handleFeedbackAction())
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.Cash))
    act(() => result.current.handleRegister())
    await act(async () => result.current.handleConfirmRegistration())

    const firstRequest = registerOrder.mock.calls[0]?.[0]
    const secondRequest = registerOrder.mock.calls[1]?.[0]
    expect(secondRequest.paymentMethod).toBe(OrderPaymentMethod.Cash)
    expect(secondRequest.idempotencyKey).not.toBe(firstRequest.idempotencyKey)

    act(() => result.current.handleRetryRegistration())
    await waitFor(() => expect(result.current.registeredOrder).toBeDefined())
    expect(registerOrder.mock.calls[2]?.[0]).toEqual(secondRequest)
  })

  it('keeps the method through item edits, removals, quantity and channel changes and recalculation', async () => {
    const { result } = setupPaymentMethodHook()
    act(() => result.current.handleSelectProduct(product))
    act(() => result.current.handleSaveLine(resaleLine))
    act(() => result.current.handleSaveLine({ ...resaleLine, quantity: 3 }))
    await waitFor(() => expect(result.current.previewToken).toBe('preview-token'))
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.DebitCard))

    act(() => result.current.handleQuantityChange(0, 2))
    expect(result.current.paymentMethod).toBe(OrderPaymentMethod.DebitCard)
    act(() => result.current.handleEditLine(resaleLine, product, 1))
    act(() => result.current.handleSaveLine({ ...resaleLine, quantity: 4 }))
    expect(result.current.paymentMethod).toBe(OrderPaymentMethod.DebitCard)
    act(() => result.current.handleChannelChange('channel-1'))
    expect(result.current.paymentMethod).toBe(OrderPaymentMethod.DebitCard)
    act(() => result.current.handleRefreshPreview())
    expect(result.current.paymentMethod).toBe(OrderPaymentMethod.DebitCard)
    act(() => result.current.handleRemoveLine(0))
    expect(result.current.paymentMethod).toBe(OrderPaymentMethod.DebitCard)
    expect(result.current.lineInputs).toHaveLength(1)
  })

  it.each([
    ['rollback after a 5xx', { isFailure: true, statusCode: 503 }],
    ['an invalid preview token', { isFailure: true, statusCode: 400 }],
    ['an unprocessable body', { isFailure: true, statusCode: 422 }],
    [
      'a repriced result',
      {
        body: {
          kind: 'repriced',
          recalculatedCart: {
            ...previewCart,
            lines: [
              { ...resaleLine, baseUnitPrice: 12, finalUnitPrice: 12, subtotal: 12 },
            ],
          },
          previewToken: 'new-preview',
          changes: [],
        },
        isFailure: true,
        statusCode: 409,
      },
    ],
    [
      'a review-required result',
      {
        body: { kind: 'review-required', shortages: [], changes: [] },
        isFailure: true,
        statusCode: 409,
      },
    ],
    [
      'a correction-required result',
      {
        body: {
          kind: 'correction-required',
          invalidConfigurations: [],
          shortages: [],
          changes: [],
        },
        isFailure: true,
        statusCode: 409,
      },
    ],
    ['a lost connection', { isFailure: true, statusCode: 0 }],
  ] as const)('keeps the selected method after %s', async (_name, response) => {
    const registerOrder = vi.fn().mockResolvedValue({ response })
    const { result } = setupPaymentMethodHook(registerOrder)
    act(() => result.current.handleSaveLine(resaleLine))
    await waitFor(() => expect(result.current.previewToken).toBe('preview-token'))
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.CreditCard))
    act(() => result.current.handleRegister())

    await act(async () => result.current.handleConfirmRegistration())

    expect(registerOrder).toHaveBeenCalled()
    expect(result.current.registeredOrder).toBeUndefined()
    expect(result.current.paymentMethod).toBe(OrderPaymentMethod.CreditCard)
    expect(result.current.lineInputs.length).toBeGreaterThan(0)
  })

  it('keeps the method after a registration that rejects with an exception', async () => {
    const registerOrder = vi.fn().mockRejectedValue(new Error('Falha de rede'))
    const { result } = setupPaymentMethodHook(registerOrder)
    act(() => result.current.handleSaveLine(resaleLine))
    await waitFor(() => expect(result.current.previewToken).toBe('preview-token'))
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.Cash))
    act(() => result.current.handleRegister())

    await act(async () => result.current.handleConfirmRegistration())

    expect(result.current.registrationError).toBe('Falha de rede')
    expect(result.current.paymentMethod).toBe(OrderPaymentMethod.Cash)
  })

  it('saves the method in the version 2 cart and restores it after a reload', async () => {
    const first = setupPaymentMethodHook()
    act(() => first.result.current.handleSelectProduct(product))
    act(() => first.result.current.handleSaveLine(resaleLine))
    act(() => first.result.current.handleChannelChange('channel-1'))
    act(() => first.result.current.handlePaymentMethodChange(OrderPaymentMethod.Pix))
    await waitFor(() => expect(readStoredCart()?.paymentMethod).toBe('pix'))
    expect(readStoredCart()).toMatchObject({ version: 2, channelId: 'channel-1' })
    first.unmount()

    const reloaded = setupPaymentMethodHook()

    await waitFor(() => expect(reloaded.result.current.lineInputs).toEqual([resaleLine]))
    expect(reloaded.result.current.paymentMethod).toBe(OrderPaymentMethod.Pix)
    expect(reloaded.result.current.channelId).toBe('channel-1')
  })

  it('restores a version 1 cart with its items and channel but no method', async () => {
    window.localStorage.setItem(
      getNewSaleCartStorageKey(account.establishmentId),
      JSON.stringify({
        version: 1,
        lineInputs: [resaleLine],
        products: [product],
        channelId: 'channel-1',
      }),
    )

    const { result } = setupPaymentMethodHook()

    await waitFor(() => expect(result.current.lineInputs).toEqual([resaleLine]))
    expect(result.current.channelId).toBe('channel-1')
    expect(result.current.paymentMethod).toBeUndefined()
    await waitFor(() => expect(readStoredCart()?.version).toBe(2))
    expect(readStoredCart()).not.toHaveProperty('paymentMethod')
  })

  it('discards a stored cart whose method is not one of the four values', async () => {
    window.localStorage.setItem(
      getNewSaleCartStorageKey(account.establishmentId),
      JSON.stringify({
        version: 2,
        lineInputs: [resaleLine],
        products: [product],
        paymentMethod: 'voucher',
      }),
    )

    const { result } = setupPaymentMethodHook()

    await waitFor(() =>
      expect(
        window.localStorage.getItem(getNewSaleCartStorageKey(account.establishmentId)),
      ).toBeNull(),
    )
    expect(result.current.lineInputs).toEqual([])
    expect(result.current.paymentMethod).toBeUndefined()
  })

  it('clears items, channel and method after a successful registration', async () => {
    const { result } = setupPaymentMethodHook()
    act(() => result.current.handleSelectProduct(product))
    act(() => result.current.handleSaveLine(resaleLine))
    act(() => result.current.handleChannelChange('channel-1'))
    await waitFor(() => expect(result.current.previewToken).toBe('preview-token'))
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.Pix))
    act(() => result.current.handleRegister())

    await act(async () => result.current.handleConfirmRegistration())

    expect(result.current.registeredOrder).toEqual({ id: 'order-1' })
    expect(result.current.lineInputs).toEqual([])
    expect(result.current.channelId).toBeUndefined()
    expect(result.current.paymentMethod).toBeUndefined()
    expect(readStoredCart()).toBeNull()

    act(() => result.current.handleNewSale())

    expect(result.current.registeredOrder).toBeUndefined()
    expect(result.current.channelId).toBeUndefined()
    expect(result.current.paymentMethod).toBeUndefined()
  })

  it('clears the items and the method but keeps the channel on Limpar pedido', async () => {
    const { result } = setupPaymentMethodHook()
    act(() => result.current.handleSelectProduct(product))
    act(() => result.current.handleSaveLine(resaleLine))
    act(() => result.current.handleChannelChange('channel-1'))
    act(() => result.current.handlePaymentMethodChange(OrderPaymentMethod.DebitCard))
    await waitFor(() => expect(readStoredCart()?.paymentMethod).toBe('debit-card'))

    act(() => result.current.handleClear())

    expect(result.current.lineInputs).toEqual([])
    expect(result.current.paymentMethod).toBeUndefined()
    expect(result.current.channelId).toBe('channel-1')
    expect(readStoredCart()).toBeNull()
  })

  it('resolves the registration channel only from the active channels', async () => {
    const { result, rerender } = setupPaymentMethodHook()
    expect(result.current.registrationSummary.isChannelUnresolved).toBe(false)

    act(() => result.current.handleChannelChange('channel-1'))
    expect(result.current.registrationSummary.channel).toBeUndefined()
    expect(result.current.registrationSummary.isChannelUnresolved).toBe(true)

    const channel = { id: 'channel-1', name: 'Balcão', percentage: 0 }
    useActiveSalesChannelsQueryMock.mockReturnValue({
      activeSalesChannels: [channel],
      isActiveSalesChannelsError: false,
      isLoadingActiveSalesChannels: false,
      isRefreshingActiveSalesChannels: false,
    } as never)
    rerender()

    expect(result.current.registrationSummary.channel).toEqual(channel)
    expect(result.current.registrationSummary.isChannelUnresolved).toBe(false)
  })
})
