import { OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PaymentMethodSelector, type PaymentMethodSelectorProps } from '..'

const HINT = 'Escolha como o cliente vai pagar para registrar o pedido.'

function StatefulSelector({
  initialPaymentMethod,
  onPaymentMethodChange,
}: {
  initialPaymentMethod?: OrderPaymentMethod
  onPaymentMethodChange: PaymentMethodSelectorProps['onPaymentMethodChange']
}) {
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod)

  return (
    <PaymentMethodSelector
      onPaymentMethodChange={(nextPaymentMethod) => {
        setPaymentMethod(nextPaymentMethod)
        onPaymentMethodChange(nextPaymentMethod)
      }}
      paymentMethod={paymentMethod}
    />
  )
}

describe('PaymentMethodSelector', () => {
  afterEach(cleanup)

  it('offers the four short-labelled options with none checked and a required hint', () => {
    render(<PaymentMethodSelector onPaymentMethodChange={vi.fn()} />)

    const group = screen.getByRole('radiogroup', { name: 'Forma de pagamento' })
    expect(group.getAttribute('aria-describedby')).toContain(screen.getByText(HINT).id)
    expect(screen.getByText('Obrigatório').textContent).toBe('Obrigatório')
    const radios = screen.getAllByRole('radio')
    expect(radios.map((radio) => radio.textContent)).toEqual([
      'Pix',
      'Crédito',
      'Débito',
      'Dinheiro',
    ])
    for (const radio of radios) expect(radio.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByText(HINT).textContent).toBe(HINT)
    expect(group.getAttribute('aria-describedby')).toBe(
      screen.getByText(HINT).getAttribute('id'),
    )
  })

  it('exposes the checked option and removes the hint once a method is selected', () => {
    render(
      <PaymentMethodSelector
        onPaymentMethodChange={vi.fn()}
        paymentMethod={OrderPaymentMethod.CreditCard}
      />,
    )

    expect(
      screen.getByRole('radio', { name: 'Crédito' }).getAttribute('aria-checked'),
    ).toBe('true')
    expect(screen.getByRole('radio', { name: 'Pix' }).getAttribute('aria-checked')).toBe(
      'false',
    )
    expect(screen.queryByText(HINT)).toBeNull()
    expect(screen.getByRole('radiogroup').hasAttribute('aria-describedby')).toBe(false)
  })

  it('reports the canonical method value when an option is clicked', () => {
    const onPaymentMethodChange = vi.fn()
    render(<StatefulSelector onPaymentMethodChange={onPaymentMethodChange} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Débito' }))

    expect(onPaymentMethodChange).toHaveBeenCalledWith(OrderPaymentMethod.DebitCard)
    expect(
      screen.getByRole('radio', { name: 'Débito' }).getAttribute('aria-checked'),
    ).toBe('true')
    expect(screen.queryByText(HINT)).toBeNull()
  })

  it('moves focus and selection between options with the arrow keys', async () => {
    const onPaymentMethodChange = vi.fn()
    render(
      <StatefulSelector
        initialPaymentMethod={OrderPaymentMethod.Pix}
        onPaymentMethodChange={onPaymentMethodChange}
      />,
    )
    const pix = screen.getByRole('radio', { name: 'Pix' })
    pix.focus()

    fireEvent.keyDown(pix, { key: 'ArrowRight' })

    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: 'Crédito' }).getAttribute('aria-checked'),
      ).toBe('true'),
    )
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'Crédito' }))
    expect(onPaymentMethodChange).toHaveBeenLastCalledWith(OrderPaymentMethod.CreditCard)

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Crédito' }), {
      key: 'ArrowLeft',
    })

    await waitFor(() =>
      expect(
        screen.getByRole('radio', { name: 'Pix' }).getAttribute('aria-checked'),
      ).toBe('true'),
    )
    expect(onPaymentMethodChange).toHaveBeenLastCalledWith(OrderPaymentMethod.Pix)
  })

  it('keeps a single tab stop on the checked option', () => {
    render(
      <PaymentMethodSelector
        onPaymentMethodChange={vi.fn()}
        paymentMethod={OrderPaymentMethod.Cash}
      />,
    )

    const tabStops = screen
      .getAllByRole('radio')
      .filter((radio) => radio.getAttribute('tabindex') === '0')

    expect(tabStops).toHaveLength(1)
    expect(tabStops[0]?.textContent).toBe('Dinheiro')
  })
})
