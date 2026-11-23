import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OrdersList } from '..'

vi.mock('../use-orders-list', () => ({
  useOrdersList: () => ({
    formatOrderDate: () => '25/07/2026 16:24',
    formatOrderTotal: () => 'R$ 42,56',
  }),
}))

const baseOrder = {
  id: 'order-1',
  establishmentId: 'establishment-1',
  idempotencyKey: 'key-1',
  sequenceNumber: 124,
  createdBy: 'user-1',
  createdByName: 'Carlo — Gerente',
  status: 'registered' as const,
  lines: [],
  discounts: [],
  subtotal: 16,
  totalDiscount: 0,
  total: 16,
  createdAt: new Date('2026-07-25T16:24:00.000Z'),
}

describe('OrdersList', () => {
  afterEach(cleanup)
  it('shows the Pagamento column and card cell with long labels and Não informado', () => {
    render(
      <OrdersList
        onOpenOrder={vi.fn()}
        onPageChange={vi.fn()}
        ordersPage={{
          page: 1,
          pageSize: 6,
          total: 4,
          items: [
            { ...baseOrder, id: 'o1', paymentMethod: 'pix' },
            { ...baseOrder, id: 'o2', paymentMethod: 'credit-card' },
            { ...baseOrder, id: 'o3', paymentMethod: 'debit-card' },
            { ...baseOrder, id: 'o4', paymentMethod: 'cash' },
            { ...baseOrder, id: 'o5' },
          ],
        }}
      />,
    )
    const headers = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent)
    expect(headers.indexOf('Pagamento')).toBe(headers.indexOf('Canal') + 1)
    expect(headers.indexOf('Itens')).toBe(headers.indexOf('Pagamento') + 1)
    const paymentCells = screen
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[headers.indexOf('Pagamento')])
    expect(paymentCells.map((cell) => cell?.textContent)).toEqual([
      'Pix',
      'Cartão de crédito',
      'Cartão de débito',
      'Dinheiro',
      'Não informado',
    ])
    expect(
      paymentCells.map((cell) => cell?.querySelector('svg')?.getAttribute('class')),
    ).toEqual([
      expect.stringContaining('lucide-qr-code'),
      expect.stringContaining('lucide-credit-card'),
      expect.stringContaining('lucide-wallet-cards'),
      expect.stringContaining('lucide-banknote'),
      expect.stringContaining('lucide-circle-minus'),
    ])
    for (const label of [
      'Pix',
      'Cartão de crédito',
      'Cartão de débito',
      'Dinheiro',
      'Não informado',
    ]) {
      // one table cell and one mobile card cell per order
      expect(screen.getAllByText(label)).toHaveLength(2)
    }
    expect(screen.queryByText('Crédito')).toBeNull()
    expect(screen.queryByText('Débito')).toBeNull()
  })

  it('renders operator, channel, status, total and an accessible detail action', () => {
    render(
      <OrdersList
        onOpenOrder={vi.fn()}
        onPageChange={vi.fn()}
        ordersPage={{
          page: 1,
          pageSize: 6,
          total: 1,
          items: [
            {
              id: 'order-1',
              establishmentId: 'establishment-1',
              idempotencyKey: 'key-1',
              sequenceNumber: 124,
              createdBy: 'user-1',
              createdByName: 'Carlo — Gerente',
              status: 'registered',
              lines: [
                {
                  product: { productId: 'product-1', name: 'Açaí', kind: 'portion' },
                  accompaniments: [],
                  quantity: 1,
                  baseUnitPrice: 16,
                  finalUnitPrice: 16,
                  subtotal: 16,
                  allocatedNetSalesCents: 1600,
                  costComponents: [],
                  cogsCents: null,
                  consumptions: [],
                },
              ],
              discounts: [],
              subtotal: 16,
              totalDiscount: 0,
              total: 16,
              createdAt: new Date('2026-07-25T16:24:00.000Z'),
            },
          ],
        }}
      />,
    )
    expect(screen.getAllByText('Carlo — Gerente')).not.toHaveLength(0)
    expect(screen.getAllByText('Registrado').length).toBeGreaterThan(0)
    expect(screen.getByRole('columnheader', { name: 'AÇÃO' })).toBeTruthy()
    expect(screen.getByText('Detalhes')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ver pedido 124' })).toBeTruthy()
  })
})
