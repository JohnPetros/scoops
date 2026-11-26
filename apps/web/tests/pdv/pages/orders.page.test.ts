import { expect, test } from '../../playwright'

const CHANNEL_ID = '00000000-0000-4000-8000-000000000020'

const order = {
  id: '00000000-0000-4000-8000-000000000010',
  establishmentId: 'browser-establishment-id',
  idempotencyKey: '00000000-0000-4000-8000-000000000011',
  sequenceNumber: 124,
  createdBy: 'browser-manager-id',
  createdByName: 'Maria Manager',
  status: 'registered',
  channel: { channelId: CHANNEL_ID, name: 'Delivery próprio', percentage: 12 },
  lines: [
    {
      product: {
        productId: '00000000-0000-4000-8000-000000000030',
        name: 'Açaí',
        kind: 'portion',
      },
      size: {
        sizeId: '00000000-0000-4000-8000-000000000031',
        name: '500 ml',
        quantity: 1,
      },
      accompaniments: [],
      quantity: 1,
      baseUnitPrice: 20,
      finalUnitPrice: 20,
      subtotal: 20,
      consumptions: [],
    },
  ],
  discounts: [],
  subtotal: 20,
  totalDiscount: 0,
  total: 22.4,
  createdAt: '2026-08-28T12:00:00.000Z',
}

const pageBody = {
  items: [order],
  page: 1,
  pageSize: 6,
  total: 1,
  totalPages: 1,
}

const PAYMENT_ROWS = [
  { sequenceNumber: 126, paymentMethod: 'pix', label: 'Pix' },
  { sequenceNumber: 125, paymentMethod: 'credit-card', label: 'Cartão de crédito' },
  { sequenceNumber: 124, paymentMethod: 'debit-card', label: 'Cartão de débito' },
  { sequenceNumber: 123, paymentMethod: 'cash', label: 'Dinheiro' },
  { sequenceNumber: 122, paymentMethod: undefined, label: 'Não informado' },
] as const

const paymentPageBody = {
  items: PAYMENT_ROWS.map((row, index) => ({
    ...order,
    id: `00000000-0000-4000-8000-0000000001${index}0`,
    sequenceNumber: row.sequenceNumber,
    ...(row.paymentMethod ? { paymentMethod: row.paymentMethod } : {}),
  })),
  page: 1,
  pageSize: 6,
  total: 30,
  totalPages: 5,
}

test.describe('OrdersPage', () => {
  test('redirects anonymous users to login', async ({ page }) => {
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/login\?returnTo=.*orders/)
  })

  test('renders the Manager list, maps URL filters, and supports keyboard/mobile use', async ({
    page,
    identityFixture,
    pdvFixture,
  }) => {
    const consoleErrors: string[] = []
    const failedRequests: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('requestfailed', (request) => failedRequests.push(request.url()))

    await identityFixture.mockManagerSession()
    await identityFixture.mockManagerAccount()
    const channelsMock = await pdvFixture.mockSalesChannels({
      channels: [
        {
          id: CHANNEL_ID,
          establishmentId: 'browser-establishment-id',
          name: 'Delivery próprio',
          percentage: 12,
          status: 'active',
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        },
      ],
    })
    const ordersMock = await pdvFixture.mockOrders({ list: { body: pageBody } })

    await page.setViewportSize({ width: 1481, height: 1050 })
    await page.goto('/orders')
    await expect(page.getByRole('heading', { name: /Pedidos/ })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Maria Manager' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'Delivery próprio' })).toBeVisible()
    await expect(page.getByRole('cell', { name: '#00124' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Ver pedido 124/ })).toBeVisible()

    const expectedOrderPeriod = await page.evaluate(() => {
      const today = new Date()
      const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
      const to = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        23,
        59,
        59,
        999,
      )

      return {
        createdFrom: from.toISOString(),
        createdTo: to.toISOString(),
      }
    })

    const initialListRequest = ordersMock.requests.find(
      (request) => request.method === 'GET',
    )
    expect(initialListRequest?.url.pathname).toBe('/orders')
    expect(initialListRequest?.url.searchParams.get('page')).toBe('1')
    expect(initialListRequest?.url.searchParams.get('pageSize')).toBe('6')
    expect(initialListRequest?.url.searchParams.get('createdFrom')).toBe(
      expectedOrderPeriod.createdFrom,
    )
    expect(initialListRequest?.url.searchParams.get('createdTo')).toBe(
      expectedOrderPeriod.createdTo,
    )

    const channelFilter = page.getByRole('combobox', { name: 'Filtrar por canal' })
    await channelFilter.click()
    await page.getByRole('option', { name: 'Delivery próprio' }).click()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('channelId'))
      .toBe(CHANNEL_ID)
    await expect
      .poll(() => ordersMock.requests.at(-1)?.url.searchParams.get('channelId'))
      .toBe(CHANNEL_ID)

    const statusFilter = page.getByRole('combobox', { name: 'Filtrar por status' })
    await statusFilter.click()
    await page.getByRole('option', { name: 'Registrado' }).click()
    await expect
      .poll(() => new URL(page.url()).searchParams.get('status'))
      .toBe('registered')
    await expect
      .poll(() => ordersMock.requests.at(-1)?.url.searchParams.get('status'))
      .toBe('registered')

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).resolves.toBe(true)
    await page.getByRole('textbox', { name: 'Buscar pedidos' }).focus()
    await page.keyboard.press('Tab')
    await expect(channelFilter).toBeFocused()

    expect(channelsMock.requests.some((request) => request.method === 'GET')).toBe(true)
    expect(consoleErrors).toEqual([])
    expect(failedRequests).toEqual([])
  })

  test('shows the Pagamento column and card cell with long labels and icons', async ({
    page,
    identityFixture,
    pdvFixture,
  }) => {
    await identityFixture.mockManagerSession()
    await identityFixture.mockManagerAccount()
    await pdvFixture.mockSalesChannels()
    await pdvFixture.mockOrders({ list: { body: paymentPageBody } })

    await page.setViewportSize({ width: 1481, height: 1050 })
    await page.goto('/orders')
    await expect(page.getByRole('cell', { name: '#00126' })).toBeVisible()
    const headers = await page.getByRole('columnheader').allTextContents()
    expect(headers.indexOf('Pagamento')).toBe(headers.indexOf('Canal') + 1)
    expect(headers.indexOf('Itens')).toBe(headers.indexOf('Pagamento') + 1)
    for (const row of PAYMENT_ROWS) {
      const tableRow = page.getByRole('row').filter({
        hasText: `#${String(row.sequenceNumber).padStart(5, '0')}`,
      })
      const cell = tableRow.getByRole('cell').nth(4)
      await expect(cell).toHaveText(row.label)
      await expect(cell.locator('svg')).toBeVisible()
    }

    await page.setViewportSize({ width: 390, height: 844 })
    const card = page.getByRole('article').filter({ hasText: '#00125' }).first()
    await expect(card).toContainText('Pagamento')
    await expect(card).toContainText('Cartão de crédito')
    await expect(
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).resolves.toBe(true)
  })

  test('filters by payment method, keeps it through period changes and clears it', async ({
    page,
    identityFixture,
    pdvFixture,
  }) => {
    await identityFixture.mockManagerSession()
    await identityFixture.mockManagerAccount()
    await pdvFixture.mockSalesChannels()
    const ordersMock = await pdvFixture.mockOrders({
      list: { body: paymentPageBody },
    })
    const lastParam = () => ordersMock.requests.at(-1)?.url.searchParams
    const urlParam = (name: string) => new URL(page.url()).searchParams.get(name)

    await page.setViewportSize({ width: 1481, height: 1050 })
    await page.goto('/orders?page=3')
    await expect(page.getByRole('cell', { name: '#00126' })).toBeVisible()
    expect(ordersMock.requests[0]?.url.searchParams.has('paymentMethod')).toBe(false)

    const paymentFilter = page.getByRole('combobox', {
      name: 'Filtrar por forma de pagamento',
    })
    await expect(paymentFilter).toContainText('Todas as formas de pagamento')
    await paymentFilter.click()
    await expect(page.getByRole('option')).toHaveText([
      'Todas as formas de pagamento',
      'Pix',
      'Cartão de crédito',
      'Cartão de débito',
      'Dinheiro',
      'Não informado',
    ])
    await page.getByRole('option', { name: 'Cartão de crédito' }).click()
    await expect.poll(() => urlParam('paymentMethod')).toBe('credit-card')
    expect(urlParam('page')).toBe('1')
    await expect.poll(() => lastParam()?.get('paymentMethod')).toBe('credit-card')
    await expect(paymentFilter).toContainText('Cartão de crédito')

    await paymentFilter.click()
    await page.getByRole('option', { name: 'Não informado' }).click()
    await expect.poll(() => urlParam('paymentMethod')).toBe('none')
    await expect.poll(() => lastParam()?.get('paymentMethod')).toBe('none')

    await paymentFilter.click()
    await page.getByRole('option', { name: 'Dinheiro' }).click()
    await expect.poll(() => lastParam()?.get('paymentMethod')).toBe('cash')

    await page.getByRole('combobox', { name: 'Filtrar por período' }).click()
    await page.getByRole('option', { name: 'Período personalizado' }).click()
    await expect.poll(() => urlParam('period')).toBe('custom')
    expect(urlParam('paymentMethod')).toBe('cash')
    await expect.poll(() => lastParam()?.get('paymentMethod')).toBe('cash')

    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect.poll(() => urlParam('paymentMethod')).toBeNull()
    await expect(paymentFilter).toContainText('Todas as formas de pagamento')
    await expect.poll(() => lastParam()?.has('paymentMethod')).toBe(false)
  })

  test('falls back to all methods for an invalid URL value and follows the tab order', async ({
    page,
    identityFixture,
    pdvFixture,
  }) => {
    await identityFixture.mockManagerSession()
    await identityFixture.mockManagerAccount()
    await pdvFixture.mockSalesChannels()
    const ordersMock = await pdvFixture.mockOrders({
      list: { body: paymentPageBody },
    })

    await page.setViewportSize({ width: 1481, height: 1050 })
    await page.goto('/orders?paymentMethod=voucher')
    await expect(page.getByRole('cell', { name: '#00126' })).toBeVisible()
    await expect(
      page.getByRole('combobox', { name: 'Filtrar por forma de pagamento' }),
    ).toContainText('Todas as formas de pagamento')
    expect(
      ordersMock.requests.every(
        (request) => !request.url.searchParams.has('paymentMethod'),
      ),
    ).toBe(true)

    await page.getByRole('textbox', { name: 'Buscar pedidos' }).focus()
    for (const name of [
      'Filtrar por canal',
      'Filtrar por forma de pagamento',
      'Filtrar por status',
      'Filtrar por período',
    ]) {
      await page.keyboard.press('Tab')
      await expect(page.getByRole('combobox', { name })).toBeFocused()
    }
  })

  test('names the payment method in the filtered empty state', async ({
    page,
    identityFixture,
    pdvFixture,
  }) => {
    await identityFixture.mockManagerSession()
    await identityFixture.mockManagerAccount()
    await pdvFixture.mockSalesChannels()
    await pdvFixture.mockOrders()

    await page.setViewportSize({ width: 1481, height: 1050 })
    await page.goto('/orders?paymentMethod=cash')
    await expect(
      page.getByRole('heading', { name: 'Nenhum pedido encontrado' }),
    ).toBeVisible()
    await expect(
      page.getByText(
        'Não encontramos pedidos com a busca, o canal, a forma de pagamento, o status e o período selecionados.',
      ),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).last().click()
    await expect(page).toHaveURL(/\/orders\/?\?search=&period=last-30-days&page=1$/)
  })

  test('keeps loading and recovers from a failed list request', async ({
    page,
    identityFixture,
    pdvFixture,
  }) => {
    const consoleErrors: string[] = []
    const failedRequests: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })
    page.on('requestfailed', (request) => failedRequests.push(request.url()))

    await identityFixture.mockManagerSession()
    await identityFixture.mockManagerAccount()
    let attempts = 0
    await pdvFixture.mockSalesChannels()
    await pdvFixture.mockOrders({
      list: () => {
        attempts += 1
        return attempts === 1
          ? { body: { message: 'temporary failure' }, status: 503 }
          : { body: pageBody }
      },
    })

    await page.goto('/orders')
    await expect(page.getByRole('alert')).toContainText(
      'Não foi possível carregar os pedidos.',
    )
    await page.setViewportSize({ width: 1481, height: 1050 })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.setViewportSize({ width: 1481, height: 1050 })
    await expect(page).toHaveURL(/\/orders\/?(?:\?[^#]*)?$/)
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('cell', { name: '#00124' })).toBeVisible()
    expect(attempts).toBe(2)
    expect(consoleErrors).toHaveLength(1)
    expect(consoleErrors[0]).toContain('503')
    expect(failedRequests).toEqual([])
  })

  test('distinguishes initial-empty and filtered-empty states', async ({
    page,
    identityFixture,
    pdvFixture,
  }) => {
    await identityFixture.mockManagerSession()
    await identityFixture.mockManagerAccount()
    await pdvFixture.mockSalesChannels()
    await pdvFixture.mockOrders()

    await page.goto('/orders')
    await expect(
      page.getByRole('heading', { name: 'Nenhum pedido registrado ainda' }),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Iniciar nova venda' })).toBeVisible()
    await page.setViewportSize({ width: 1481, height: 1050 })

    await page.goto('/orders?search=pedido-inexistente')
    await expect(
      page.getByRole('heading', { name: 'Nenhum pedido encontrado' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Limpar filtros' }).last(),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).last().click()
    await expect(page).toHaveURL(/\/orders\/?\?search=&period=last-30-days&page=1$/)
  })

  test('covers the list loading state at desktop and narrow viewports', async ({
    page,
    identityFixture,
    pdvFixture,
  }) => {
    await identityFixture.mockManagerSession()
    await identityFixture.mockManagerAccount()
    await pdvFixture.mockSalesChannels()
    await pdvFixture.mockOrders({ list: { body: pageBody } })

    let releaseListRequest!: () => void
    const listRequestPaused = new Promise<void>((resolve) => {
      releaseListRequest = resolve
    })
    await page.route('**/orders**', async (route) => {
      const request = route.request()
      const requestUrl = new URL(request.url())
      if (
        request.method() === 'GET' &&
        requestUrl.pathname === '/orders' &&
        ['fetch', 'xhr'].includes(request.resourceType())
      ) {
        await listRequestPaused
      }
      await route.fallback()
    })

    await page.setViewportSize({ width: 1481, height: 1050 })
    const navigation = page.goto('/orders', { waitUntil: 'commit' })
    await expect(page.getByLabel('Carregando pedidos')).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    releaseListRequest()
    await navigation
    await page.unroute('**/orders**')
  })
})
