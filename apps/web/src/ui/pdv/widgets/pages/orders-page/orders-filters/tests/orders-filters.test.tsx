import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OrdersFilters } from '..'
import {
  PAYMENT_METHOD_NOT_INFORMED_PRESENTATION,
  PAYMENT_METHOD_PRESENTATION,
} from '@/ui/pdv/constants/payment-method-presentation'

import { useOrdersFilters } from '../use-orders-filters'

vi.mock('../use-orders-filters', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../use-orders-filters')>()),
  useOrdersFilters: vi.fn(),
}))
const useOrdersFiltersMock = vi.mocked(useOrdersFilters)

const baseSearch = {
  search: '',
  channelId: undefined,
  paymentMethod: undefined,
  status: undefined,
  period: 'last-30-days' as const,
  page: 1,
}

type FilterPaymentMethod = Parameters<typeof OrdersFilters>[0]['search']['paymentMethod']

function filterLabel(paymentMethod: FilterPaymentMethod) {
  if (paymentMethod === undefined) return 'Todas as formas de pagamento'
  if (paymentMethod === 'none') return PAYMENT_METHOD_NOT_INFORMED_PRESENTATION.label
  return PAYMENT_METHOD_PRESENTATION[paymentMethod].label
}

function filterIcon(paymentMethod: FilterPaymentMethod) {
  if (paymentMethod === undefined) return 'wallet' as const
  if (paymentMethod === 'none') return PAYMENT_METHOD_NOT_INFORMED_PRESENTATION.icon
  return PAYMENT_METHOD_PRESENTATION[paymentMethod].icon
}

function renderFilters(search: Parameters<typeof OrdersFilters>[0]['search']) {
  useOrdersFiltersMock.mockReturnValue({
    handleChannelChange: vi.fn(),
    handleFromChange: vi.fn(),
    handlePaymentMethodChange: vi.fn(),
    handlePeriodChange: vi.fn(),
    handleStatusChange: vi.fn(),
    handleToChange: vi.fn(),
    paymentMethodFilterIcon: filterIcon(search.paymentMethod),
    paymentMethodFilterLabel: filterLabel(search.paymentMethod),
    searchValue: '',
    setSearchValue: vi.fn(),
  })
  render(
    <OrdersFilters
      channels={[]}
      isLoadingChannels={false}
      onClear={vi.fn()}
      onSearchChange={vi.fn()}
      search={search}
    />,
  )
}

describe('OrdersFilters', () => {
  afterEach(cleanup)
  it('renders Portuguese controls and preserves the URL-facing values', () => {
    useOrdersFiltersMock.mockReturnValue({
      handleChannelChange: vi.fn(),
      handleFromChange: vi.fn(),
      handlePaymentMethodChange: vi.fn(),
      handlePeriodChange: vi.fn(),
      handleStatusChange: vi.fn(),
      handleToChange: vi.fn(),
      paymentMethodFilterIcon: 'wallet',
      paymentMethodFilterLabel: 'Todas as formas de pagamento',
      searchValue: '',
      setSearchValue: vi.fn(),
    })
    render(
      <OrdersFilters
        channels={[]}
        isLoadingChannels={false}
        onClear={vi.fn()}
        onSearchChange={vi.fn()}
        search={{
          search: '',
          channelId: undefined,
          paymentMethod: undefined,
          status: undefined,
          period: 'last-30-days',
          page: 1,
        }}
      />,
    )
    expect(
      (screen.getByRole('textbox', { name: 'Buscar pedidos' }) as HTMLInputElement)
        .readOnly,
    ).toBe(false)
    expect(
      screen.getByRole('combobox', { name: 'Filtrar por canal' }).textContent,
    ).toContain('Todos os canais')
    expect(
      screen.getByRole('combobox', { name: 'Filtrar por status' }).textContent,
    ).toContain('Todos os status')
    expect(
      screen.getByRole('combobox', { name: 'Filtrar por forma de pagamento' })
        .textContent,
    ).toContain('Todas as formas de pagamento')
  })

  it('orders the controls as search, channel, payment method, status and period', () => {
    renderFilters({ ...baseSearch })
    const names = screen
      .getAllByRole('combobox')
      .map((element) => element.getAttribute('aria-label'))
    expect(names).toEqual([
      'Filtrar por canal',
      'Filtrar por forma de pagamento',
      'Filtrar por status',
      'Filtrar por período',
    ])
    const all = Array.from(document.querySelectorAll('input, [role="combobox"]')).map(
      (element) => element.getAttribute('aria-label'),
    )
    expect(all[0]).toBe('Buscar pedidos')
  })

  it('shows the selected payment method with its long label and offers every option', () => {
    renderFilters({ ...baseSearch, paymentMethod: 'credit-card' })
    const trigger = screen.getByRole('combobox', {
      name: 'Filtrar por forma de pagamento',
    })
    expect(trigger.textContent).toContain('Cartão de crédito')
    fireEvent.click(trigger)
    for (const label of [
      'Todas as formas de pagamento',
      'Pix',
      'Cartão de crédito',
      'Cartão de débito',
      'Dinheiro',
      'Não informado',
    ]) {
      expect(screen.getAllByRole('option', { name: label }).length).toBeGreaterThan(0)
    }
  })

  it('keeps the wallet icon and the idle outline while no payment method is selected', () => {
    renderFilters({ ...baseSearch })
    const trigger = screen.getByRole('combobox', {
      name: 'Filtrar por forma de pagamento',
    })
    expect(trigger.querySelector('svg.lucide-wallet')).not.toBeNull()
    expect(trigger.className).not.toContain('outline-primary')
  })

  it('shows the method icon and the active outline only on the payment trigger', () => {
    renderFilters({ ...baseSearch, paymentMethod: 'cash' })
    const trigger = screen.getByRole('combobox', {
      name: 'Filtrar por forma de pagamento',
    })
    expect(trigger.querySelector('svg.lucide-banknote')).not.toBeNull()
    expect(trigger.querySelector('svg.lucide-wallet')).toBeNull()
    expect(trigger.className).toContain('outline-primary')
    for (const name of [
      'Filtrar por canal',
      'Filtrar por status',
      'Filtrar por período',
    ]) {
      expect(
        screen.getByRole('combobox', { name }).className.includes('outline-primary'),
      ).toBe(false)
    }
  })

  it('shows the not-informed icon for none', () => {
    renderFilters({ ...baseSearch, paymentMethod: 'none' })
    const trigger = screen.getByRole('combobox', {
      name: 'Filtrar por forma de pagamento',
    })
    expect(trigger.querySelector('svg.lucide-circle-minus')).not.toBeNull()
  })

  it('shows Não informado for none and offers Limpar filtros when a payment method is set', () => {
    renderFilters({ ...baseSearch, paymentMethod: 'none' })
    expect(
      screen.getByRole('combobox', { name: 'Filtrar por forma de pagamento' })
        .textContent,
    ).toContain('Não informado')
    expect(
      (screen.getByRole('button', { name: 'Limpar filtros' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)
  })
})
