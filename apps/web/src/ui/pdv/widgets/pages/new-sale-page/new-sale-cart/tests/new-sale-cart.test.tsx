import { OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { NewSaleCart, type NewSaleCartProps } from '..'
import { useNewSaleCart } from '../use-new-sale-cart'

vi.mock('../use-new-sale-cart', () => ({ useNewSaleCart: vi.fn() }))

const useNewSaleCartMock = vi.mocked(useNewSaleCart)
const line = {
  accompanimentIds: [],
  kind: 'resale' as const,
  productId: 'product-1',
  quantity: 2,
}
const product = {
  productId: 'product-1',
  name: 'Copo pronto',
  kind: 'resale' as const,
  stockControl: 'single' as const,
  isActive: true,
  isAvailable: true,
  sizes: [],
  resalePrice: 12,
  resaleBrands: [],
}

const REASON = 'Falta escolher a forma de pagamento.'
const HINT = 'Escolha como o cliente vai pagar para registrar o pedido.'

function cartProps(overrides: Partial<NewSaleCartProps> = {}): NewSaleCartProps {
  return {
    canRegister: true,
    channels: [],
    isPreviewPending: false,
    lineInputs: [line],
    onChannelChange: vi.fn(),
    onClear: vi.fn(),
    onEditLine: vi.fn(),
    onPaymentMethodChange: vi.fn(),
    onQuantityChange: vi.fn(),
    onRegister: vi.fn(),
    onRemoveLine: vi.fn(),
    previewCart: undefined,
    products: [product],
    ...overrides,
  }
}

function cartState(overrides: Record<string, unknown> = {}) {
  return {
    handleClearConfirmationChange: vi.fn(),
    handleConfirmClear: vi.fn(),
    handleEditLine: vi.fn(),
    handleOpenClearConfirmation: vi.fn(),
    handleQuantityChange: vi.fn(),
    handleRegister: vi.fn(),
    handleRemoveLine: vi.fn(),
    isClearConfirmationOpen: false,
    isRegisterDisabled: false,
    lineInputs: [line],
    previewCart: undefined,
    productsById: new Map([[product.productId, product]]),
    shouldShowPaymentMethodReason: false,
    ...overrides,
  } as never
}

describe('NewSaleCart', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('offers direct quantity controls and registration', () => {
    const onQuantityChange = vi.fn()
    const onRegister = vi.fn()
    useNewSaleCartMock.mockReturnValue({
      handleClearConfirmationChange: vi.fn(),
      handleConfirmClear: vi.fn(),
      handleEditLine: vi.fn(),
      handleOpenClearConfirmation: vi.fn(),
      handleQuantityChange: onQuantityChange,
      handleRegister: onRegister,
      handleRemoveLine: vi.fn(),
      isClearConfirmationOpen: false,
      isRegisterDisabled: false,
      shouldShowPaymentMethodReason: false,
      lineInputs: [line],
      previewCart: {
        establishmentId: 'establishment-1',
        lines: [
          {
            ...line,
            baseUnitPrice: 12,
            finalUnitPrice: 12,
            subtotal: 24,
            consumptions: [],
          },
        ],
        discounts: [],
        subtotal: 24,
        totalDiscount: 0,
        total: 24,
      },
      productsById: new Map([[product.productId, product]]),
    } as never)

    render(
      <NewSaleCart
        canRegister
        channels={[]}
        isPreviewPending={false}
        lineInputs={[line]}
        onChannelChange={vi.fn()}
        onClear={vi.fn()}
        onEditLine={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onQuantityChange={onQuantityChange}
        onRegister={onRegister}
        onRemoveLine={vi.fn()}
        previewCart={undefined}
        products={[product]}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Aumentar quantidade de Copo pronto' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pedido' }))

    expect(onQuantityChange).toHaveBeenCalledWith(0, 3)
    expect(onRegister).toHaveBeenCalledOnce()
  })

  it('shows the last matching prices while recalculating repeated product lines', () => {
    const firstLine = {
      ...line,
      kind: 'portion' as const,
      sizeId: 'size-1',
      accompanimentIds: ['cream'],
    }
    const secondLine = { ...firstLine, accompanimentIds: ['granola'] }
    const previewLines = [
      {
        ...firstLine,
        baseUnitPrice: 20,
        finalUnitPrice: 20,
        subtotal: 20,
        consumptions: [],
      },
      {
        ...secondLine,
        baseUnitPrice: 22,
        finalUnitPrice: 22,
        subtotal: 22,
        consumptions: [],
      },
    ]
    useNewSaleCartMock.mockReturnValue({
      handleClearConfirmationChange: vi.fn(),
      handleConfirmClear: vi.fn(),
      handleEditLine: vi.fn(),
      handleOpenClearConfirmation: vi.fn(),
      handleQuantityChange: vi.fn(),
      handleRegister: vi.fn(),
      handleRemoveLine: vi.fn(),
      isClearConfirmationOpen: false,
      lineInputs: [firstLine, secondLine],
      previewCart: {
        establishmentId: 'establishment-1',
        lines: previewLines,
        discounts: [],
        subtotal: 42,
        totalDiscount: 0,
        total: 42,
      },
      productsById: new Map([
        [
          product.productId,
          {
            ...product,
            name: 'Açaí tropical',
            kind: 'portion',
            sizes: [
              {
                sizeId: 'size-1',
                name: '300 g',
                accompaniments: [
                  { accompanimentId: 'cream', name: 'Creme' },
                  { accompanimentId: 'granola', name: 'Granola' },
                ],
              },
            ],
          },
        ],
      ]),
    } as never)

    render(
      <NewSaleCart
        canRegister
        channels={[]}
        isPreviewPending
        lineInputs={[firstLine, secondLine]}
        onChannelChange={vi.fn()}
        onClear={vi.fn()}
        onEditLine={vi.fn()}
        onPaymentMethodChange={vi.fn()}
        onQuantityChange={vi.fn()}
        onRegister={vi.fn()}
        onRemoveLine={vi.fn()}
        previewCart={undefined}
        products={[product]}
      />,
    )

    expect(screen.queryAllByText('Atualizando valor…')).toHaveLength(0)
    expect(screen.getByText('R$ 20,00 cada')).toBeTruthy()
    expect(screen.getByText('R$ 22,00 cada')).toBeTruthy()
  })

  it('places the empty payment method selector below the channel field', () => {
    useNewSaleCartMock.mockReturnValue(
      cartState({ isRegisterDisabled: true, shouldShowPaymentMethodReason: true }),
    )

    render(<NewSaleCart {...cartProps()} />)

    const channel = screen.getByRole('combobox', { name: 'Canal de venda' })
    const group = screen.getByRole('radiogroup', { name: 'Forma de pagamento' })
    expect(
      channel.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByText('Obrigatório')).toBeTruthy()
    expect(screen.getAllByRole('radio').map((radio) => radio.textContent)).toEqual([
      'Pix',
      'Crédito',
      'Débito',
      'Dinheiro',
    ])
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio.getAttribute('aria-checked')).toBe('false')
    }
  })

  it('blocks registration with the hint and a reason linked to the disabled button', () => {
    useNewSaleCartMock.mockReturnValue(
      cartState({ isRegisterDisabled: true, shouldShowPaymentMethodReason: true }),
    )

    render(<NewSaleCart {...cartProps()} />)

    const registerButton = screen.getByRole('button', { name: 'Registrar pedido' })
    expect((registerButton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(HINT)).toBeTruthy()
    const reason = screen.getByText(REASON)
    expect(registerButton.getAttribute('aria-describedby')).toBe(reason.id)
  })

  it('draws the disabled button muted without the primary glow', () => {
    useNewSaleCartMock.mockReturnValue(
      cartState({ isRegisterDisabled: true, shouldShowPaymentMethodReason: true }),
    )

    render(<NewSaleCart {...cartProps()} />)

    const classes = screen
      .getByRole('button', { name: 'Registrar pedido' })
      .className.split(/\s+/)
    expect(classes).toContain('disabled:bg-muted')
    expect(classes).toContain('disabled:text-text-tertiary')
    expect(classes).toContain('disabled:opacity-100')
    expect(classes).not.toContain('shadow-primary')
    expect(classes).toContain('enabled:shadow-primary')
  })

  it('shows the reason even when the cart is empty or still pricing', () => {
    useNewSaleCartMock.mockReturnValue(
      cartState({
        isRegisterDisabled: true,
        lineInputs: [],
        shouldShowPaymentMethodReason: true,
      }),
    )

    render(<NewSaleCart {...cartProps({ isPreviewPending: true, lineInputs: [] })} />)

    expect(screen.getByText(REASON)).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Registrar pedido' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })

  it('removes the hint and reason and enables registration once a method is chosen', () => {
    const onPaymentMethodChange = vi.fn()
    const handleRegister = vi.fn()
    useNewSaleCartMock.mockReturnValue(cartState({ handleRegister }))

    render(
      <NewSaleCart
        {...cartProps({
          onPaymentMethodChange,
          paymentMethod: OrderPaymentMethod.CreditCard,
        })}
      />,
    )

    expect(
      screen.getByRole('radio', { name: 'Crédito' }).getAttribute('aria-checked'),
    ).toBe('true')
    expect(screen.queryByText(HINT)).toBeNull()
    expect(screen.queryByText(REASON)).toBeNull()
    const registerButton = screen.getByRole('button', { name: 'Registrar pedido' })
    expect((registerButton as HTMLButtonElement).disabled).toBe(false)
    expect(registerButton.hasAttribute('aria-describedby')).toBe(false)
    fireEvent.click(registerButton)
    expect(handleRegister).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('radio', { name: 'Dinheiro' }))
    expect(onPaymentMethodChange).toHaveBeenCalledWith(OrderPaymentMethod.Cash)
  })
})
