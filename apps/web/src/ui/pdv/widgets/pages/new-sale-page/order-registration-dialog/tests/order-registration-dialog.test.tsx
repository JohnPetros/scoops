import { OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OrderRegistrationDialog, type OrderRegistrationDialogProps } from '..'

const cart = {
  establishmentId: 'establishment-1',
  lines: [
    {
      accompanimentIds: [],
      kind: 'resale' as const,
      productId: 'product-1',
      quantity: 2,
      baseUnitPrice: 10,
      finalUnitPrice: 10,
      subtotal: 20,
      consumptions: [],
    },
    {
      accompanimentIds: [],
      kind: 'resale' as const,
      productId: 'product-2',
      quantity: 1,
      baseUnitPrice: 8,
      finalUnitPrice: 8,
      subtotal: 8,
      consumptions: [],
    },
  ],
  discounts: [],
  subtotal: 28,
  totalDiscount: 0,
  total: 28,
}

const comboCart = {
  ...cart,
  channelId: 'channel-1',
  discounts: [
    {
      discountId: 'discount-1',
      name: 'Combo Açaí + Picolé',
      type: 'combo' as const,
      fixedPrice: 20,
      savings: 4.64,
      components: [],
      lineProductIds: ['product-1'],
    },
  ],
  totalDiscount: 4.64,
  total: 23.36,
}

function renderDialog(overrides: Partial<OrderRegistrationDialogProps> = {}) {
  const props: OrderRegistrationDialogProps = {
    cart,
    isOpen: true,
    isPending: false,
    onConfirm: vi.fn(),
    onOpenChange: vi.fn(),
    paymentMethod: OrderPaymentMethod.Pix,
    ...overrides,
  }
  render(<OrderRegistrationDialog {...props} />)
  return props
}

function rowLabels() {
  return screen.getAllByRole('term').map((term) => term.textContent)
}

describe('OrderRegistrationDialog', () => {
  afterEach(cleanup)

  it('shows the frame title, warning, rows and actions', () => {
    renderDialog({
      cart: comboCart,
      channel: {
        id: 'channel-1',
        establishmentId: 'establishment-1',
        name: 'Delivery próprio',
        percentage: 12,
        status: 'active',
      } as never,
      paymentMethod: OrderPaymentMethod.CreditCard,
    })

    const dialog = screen.getByRole('dialog', { name: 'Registrar pedido?' })
    expect(
      within(dialog).getByText(
        'A venda é registrada e o estoque é baixado. Não há reembolso nem estorno; só um gerente pode cancelar depois.',
      ),
    ).toBeTruthy()
    expect(rowLabels()).toEqual([
      'Canal de venda',
      'Forma de pagamento',
      'Itens',
      'Combo Açaí + Picolé',
      'Total',
    ])
    expect(within(dialog).getByText('Delivery próprio · +12%')).toBeTruthy()
    expect(within(dialog).getByText('Cartão de crédito')).toBeTruthy()
    expect(within(dialog).queryByText('Crédito')).toBeNull()
    expect(within(dialog).getByText('2 itens · 3 unidades')).toBeTruthy()
    expect(
      within(dialog).getByText('Economia de R$ 4,64').textContent?.replaceAll(' ', ' '),
    ).toBe('Economia de R$ 4,64')
    expect(within(dialog).getByText('R$ 23,36').textContent?.replaceAll(' ', ' ')).toBe(
      'R$ 23,36',
    )
    expect(
      within(dialog).getByRole('button', { name: 'Voltar ao carrinho' }),
    ).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Registrar pedido' })).toBeTruthy()
  })

  it('reads Sem canal and omits the Combo rows when none applies', () => {
    renderDialog({ paymentMethod: OrderPaymentMethod.Cash })

    expect(rowLabels()).toEqual([
      'Canal de venda',
      'Forma de pagamento',
      'Itens',
      'Total',
    ])
    expect(screen.getByText('Sem canal')).toBeTruthy()
    expect(screen.getByText('Dinheiro')).toBeTruthy()
  })

  it('blocks confirmation with a reason when the selected channel cannot be resolved', () => {
    const props = renderDialog({ cart: comboCart, isChannelUnresolved: true })

    expect(screen.queryByText('Sem canal')).toBeNull()
    expect(screen.getByText('Canal indisponível')).toBeTruthy()
    const button = screen.getByRole('button', { name: 'Registrar pedido' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    const reason = screen.getByRole('alert')
    expect(reason.textContent).toContain('Não foi possível carregar o canal de venda')
    expect(button.getAttribute('aria-describedby')).toBe(reason.id)
    fireEvent.click(button)
    expect(props.onConfirm).not.toHaveBeenCalled()
  })

  it('draws the store icon before a resolved channel and none before Sem canal', () => {
    renderDialog({
      cart: comboCart,
      channel: {
        id: 'channel-1',
        name: 'Delivery próprio',
        percentage: 12,
      } as never,
    })
    const channelValue = screen.getByText('Delivery próprio · +12%').closest('dd')
    expect(channelValue?.querySelector('svg.lucide-store')).not.toBeNull()
    cleanup()

    renderDialog()
    expect(screen.getByText('Sem canal').closest('dd')?.querySelector('svg')).toBeNull()
  })

  it('confirms registration and returns to the cart with the frame labels', () => {
    const props = renderDialog()

    const confirmButton = screen.getByRole('button', { name: 'Registrar pedido' })
    confirmButton.focus()
    expect(document.activeElement).toBe(confirmButton)
    fireEvent.click(confirmButton)
    expect(props.onConfirm).toHaveBeenCalledOnce()

    fireEvent.click(screen.getByRole('button', { name: 'Voltar ao carrinho' }))
    expect(props.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps the pending text and disables confirmation while registering', () => {
    renderDialog({ isPending: true })

    const pendingButton = screen.getByRole('button', { name: 'Registrando…' })
    expect((pendingButton as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Registrar pedido' })).toBeNull()
  })

  it('keeps the loading text and a disabled confirmation while the cart updates', () => {
    renderDialog({ cart: undefined })

    expect(screen.getByText('Atualizando os valores do pedido…')).toBeTruthy()
    expect(screen.queryAllByRole('term')).toHaveLength(0)
    expect(
      (screen.getByRole('button', { name: 'Registrar pedido' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })
})
