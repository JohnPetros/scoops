import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { OrdersPage } from '..'
import { useOrdersPage } from '../use-orders-page'

vi.mock('../use-orders-page', () => ({ useOrdersPage: vi.fn() }))
vi.mock('../orders-filters', () => ({ OrdersFilters: () => <div>filters</div> }))
vi.mock('../orders-list', () => ({ OrdersList: () => <div>orders-list</div> }))
vi.mock('../orders-loading', () => ({ OrdersLoading: () => <div>loading</div> }))
vi.mock('../orders-empty-state', () => ({ OrdersEmptyState: () => <div>empty</div> }))
vi.mock('../orders-error', () => ({ OrdersError: () => <div>error</div> }))

const useOrdersPageMock = vi.mocked(useOrdersPage)
const search = {
  search: '',
  channelId: undefined,
  paymentMethod: undefined,
  status: undefined,
  period: 'last-30-days' as const,
  page: 1,
}

function makePage() {
  return {
    channels: [],
    hasFilters: false,
    isLoadingChannels: false,
    isLoadingOrders: false,
    isPageLoadingOrders: false,
    isRefreshingChannels: false,
    isRefreshingOrders: false,
    ordersError: null,
    ordersPage: { items: [], page: 1, pageSize: 6, total: 0, totalPages: 0 },
    refetchOrders: vi.fn(),
    handleClearFilters: vi.fn(),
    handleNewSale: vi.fn(),
    handleOpenOrder: vi.fn(),
    handlePageChange: vi.fn(),
    handleSearchChange: vi.fn(),
    search,
  }
}

describe('OrdersPage', () => {
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    useOrdersPageMock.mockReturnValue(makePage())
  })

  it('renders the heading and delegates the filters and empty state', () => {
    render(<OrdersPage onSearchChange={vi.fn()} search={search} />)
    expect(screen.getByRole('heading', { name: /Pedidos/ })).toBeTruthy()
    expect(screen.getByText('filters')).toBeTruthy()
    expect(screen.getByText('empty')).toBeTruthy()
  })

  it('names the payment method in the filtered empty state and clears from it', () => {
    const handleClearFilters = vi.fn()
    useOrdersPageMock.mockReturnValue({
      ...makePage(),
      hasFilters: true,
      handleClearFilters,
      search: { ...search, paymentMethod: 'cash' },
    })
    render(<OrdersPage onSearchChange={vi.fn()} search={search} />)
    expect(
      screen.getByText(
        'Não encontramos pedidos com a busca, o canal, a forma de pagamento, o status e o período selecionados.',
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(handleClearFilters).toHaveBeenCalledTimes(1)
  })
})
