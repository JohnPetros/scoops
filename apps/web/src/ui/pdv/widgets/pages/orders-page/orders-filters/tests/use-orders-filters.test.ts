import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useOrdersFilters } from '../use-orders-filters'

const search = {
  search: '',
  channelId: undefined,
  paymentMethod: undefined,
  status: undefined,
  period: 'last-30-days' as const,
  page: 2,
}

describe('useOrdersFilters', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('debounces search changes and resets pagination', () => {
    const onSearchChange = vi.fn()
    const { result } = renderHook(() =>
      useOrdersFilters({
        channels: [],
        isLoadingChannels: false,
        onClear: vi.fn(),
        onSearchChange,
        search,
      }),
    )

    act(() => result.current.setSearchValue('  #00124 '))
    act(() => vi.advanceTimersByTime(299))
    expect(onSearchChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(onSearchChange).toHaveBeenCalledWith({
      ...search,
      search: '  #00124 ',
      page: 1,
    })
  })

  it('sets and clears the payment method filter and resets the page to 1', () => {
    const onSearchChange = vi.fn()
    const { result } = renderHook(() =>
      useOrdersFilters({
        channels: [],
        isLoadingChannels: false,
        onClear: vi.fn(),
        onSearchChange,
        search,
      }),
    )

    act(() => result.current.handlePaymentMethodChange('credit-card'))
    act(() => result.current.handlePaymentMethodChange('none'))
    act(() => result.current.handlePaymentMethodChange('all'))
    act(() => result.current.handlePaymentMethodChange(null))
    expect(onSearchChange).toHaveBeenCalledTimes(3)
    expect(onSearchChange).toHaveBeenNthCalledWith(1, {
      ...search,
      paymentMethod: 'credit-card',
      page: 1,
    })
    expect(onSearchChange).toHaveBeenNthCalledWith(2, {
      ...search,
      paymentMethod: 'none',
      page: 1,
    })
    expect(onSearchChange).toHaveBeenNthCalledWith(3, {
      ...search,
      paymentMethod: undefined,
      page: 1,
    })
  })

  it('keeps the payment method when the period changes', () => {
    const onSearchChange = vi.fn()
    const { result } = renderHook(() =>
      useOrdersFilters({
        channels: [],
        isLoadingChannels: false,
        onClear: vi.fn(),
        onSearchChange,
        search: { ...search, paymentMethod: 'cash' },
      }),
    )

    act(() => result.current.handlePeriodChange('custom'))
    expect(onSearchChange).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'cash', period: 'custom', page: 1 }),
    )
    act(() => result.current.handlePeriodChange('last-30-days'))
    expect(onSearchChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        paymentMethod: 'cash',
        period: 'last-30-days',
        page: 1,
      }),
    )
  })

  it('normalizes channel and status selections while retaining canonical values', () => {
    const onSearchChange = vi.fn()
    const { result } = renderHook(() =>
      useOrdersFilters({
        channels: [],
        isLoadingChannels: false,
        onClear: vi.fn(),
        onSearchChange,
        search,
      }),
    )

    act(() => result.current.handleChannelChange('none'))
    act(() => result.current.handleStatusChange('canceled'))
    expect(onSearchChange).toHaveBeenNthCalledWith(1, {
      ...search,
      channelId: 'none',
      page: 1,
    })
    expect(onSearchChange).toHaveBeenNthCalledWith(2, {
      ...search,
      status: 'canceled',
      page: 1,
    })
  })
})
