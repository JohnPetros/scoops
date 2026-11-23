import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { BetterAuthFixture } from '@/identity/fixtures/better-auth-fixture'
import {
  PdvModuleFixture,
  foreignManagerRequestAuthorization,
  managerRequestAuthorization,
  operatorRequestAuthorization,
  preparePdvFixture,
  resetPdvFixture,
} from '@/pdv/fixtures/pdv-module-fixture'

describe('List Orders Controller [GET /orders]', () => {
  let fixture: PdvModuleFixture
  let auth: BetterAuthFixture

  beforeAll(async () => ({ fixture, auth } = await preparePdvFixture()))
  beforeEach(async () => resetPdvFixture(fixture, auth))
  afterAll(async () => fixture?.close())

  it('lists tenant orders with search, channel, status and date filters', async () => {
    const channel = await fixture.addSalesChannel({
      establishmentId: PdvModuleFixture.accounts.establishmentId,
      name: 'Delivery',
      percentage: 10,
      status: 'active',
    })
    const channeled = await fixture.registerPortionOrder({
      authorization: managerRequestAuthorization(),
      productName: 'Chocolate Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000101',
      channelId: channel.id,
    })
    const noChannel = await fixture.registerPortionOrder({
      authorization: operatorRequestAuthorization(),
      productName: 'Vanilla Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000102',
    })
    await fixture.registerPortionOrder({
      authorization: foreignManagerRequestAuthorization(),
      establishmentId: PdvModuleFixture.accounts.foreignEstablishmentId,
      productName: 'Foreign Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000103',
    })

    const search = await request(fixture.app.getHttpServer())
      .get(
        '/orders?search=Chocolate&createdFrom=2026-01-01T00:00:00.000Z&createdTo=2027-01-01T00:00:00.000Z&status=registered&page=1&pageSize=6',
      )
      .set('Cookie', managerRequestAuthorization())
    const channelFilter = await request(fixture.app.getHttpServer())
      .get(`/orders?channelId=${channel.id}`)
      .set('Cookie', managerRequestAuthorization())
    const noChannelFilter = await request(fixture.app.getHttpServer())
      .get('/orders?channelId=none')
      .set('Cookie', managerRequestAuthorization())
    const operator = await request(fixture.app.getHttpServer())
      .get('/orders')
      .set('Cookie', operatorRequestAuthorization())

    expect(search.status).toBe(200)
    expect(search.body).toMatchObject({ page: 1, pageSize: 6, total: 1, totalPages: 1 })
    expect(search.body.items[0]).toMatchObject({
      id: channeled.order.id,
      createdByName: 'Maria Manager',
      status: 'registered',
    })
    expect(channelFilter.body.items.map((item: { id: string }) => item.id)).toEqual([
      channeled.order.id,
    ])
    expect(noChannelFilter.body.items.map((item: { id: string }) => item.id)).toEqual([
      noChannel.order.id,
    ])
    expect(operator.body.total).toBe(2)
    expect(operator.body.items[0].createdAt).toMatch(/Z$/)
  })

  it('filters orders by payment method, none and combined filters inside the tenant', async () => {
    const pix = await fixture.registerPortionOrder({
      authorization: managerRequestAuthorization(),
      productName: 'Pix Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000111',
      paymentMethod: 'pix',
    })
    const cash = await fixture.registerPortionOrder({
      authorization: operatorRequestAuthorization(),
      productName: 'Cash Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000112',
      paymentMethod: 'cash',
    })
    const legacy = await fixture.registerPortionOrder({
      authorization: managerRequestAuthorization(),
      productName: 'Legacy Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000113',
    })
    await fixture.clearOrderPaymentMethod(legacy.order.id)
    await fixture.registerPortionOrder({
      authorization: foreignManagerRequestAuthorization(),
      establishmentId: PdvModuleFixture.accounts.foreignEstablishmentId,
      productName: 'Foreign Pix Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000114',
      paymentMethod: 'pix',
    })
    const foreignLegacy = await fixture.registerPortionOrder({
      authorization: foreignManagerRequestAuthorization(),
      establishmentId: PdvModuleFixture.accounts.foreignEstablishmentId,
      productName: 'Foreign Legacy Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000115',
    })
    await fixture.clearOrderPaymentMethod(foreignLegacy.order.id)
    const channel = await fixture.addSalesChannel({
      establishmentId: PdvModuleFixture.accounts.establishmentId,
      name: 'Delivery',
      percentage: 10,
      status: 'active',
    })
    const channeledPix = await fixture.registerPortionOrder({
      authorization: managerRequestAuthorization(),
      productName: 'Channeled Pix Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000116',
      paymentMethod: 'pix',
      channelId: channel.id,
    })
    const ids = (response: { body: { items: { id: string }[] } }) =>
      response.body.items.map((item) => item.id)

    const byPix = await listOrders(fixture, 'paymentMethod=pix')
    const byCash = await listOrders(fixture, 'paymentMethod=cash', true)
    const byNone = await listOrders(fixture, 'paymentMethod=none')
    const combined = await listOrders(
      fixture,
      'paymentMethod=cash&search=Cash&status=registered',
    )
    const empty = await listOrders(fixture, 'paymentMethod=cash&search=Pix')
    const byPixAndChannel = await listOrders(
      fixture,
      `paymentMethod=pix&channelId=${channel.id}`,
    )
    const byNoneInPeriod = await listOrders(
      fixture,
      'paymentMethod=none&createdFrom=2026-01-01T00:00:00.000Z&createdTo=2100-01-01T00:00:00.000Z',
    )
    const byPixBeforeOrders = await listOrders(
      fixture,
      'paymentMethod=pix&createdFrom=2020-01-01T00:00:00.000Z&createdTo=2020-01-02T00:00:00.000Z',
    )
    const invalid = await listOrders(fixture, 'paymentMethod=voucher')
    const all = await listOrders(fixture, '')

    expect(ids(byPix).sort()).toEqual([pix.order.id, channeledPix.order.id].sort())
    expect(byPix.body.total).toBe(2)
    expect(ids(byCash)).toEqual([cash.order.id])
    expect(ids(byNone)).toEqual([legacy.order.id])
    expect(byNone.body.total).toBe(1)
    expect(ids(combined)).toEqual([cash.order.id])
    expect(empty.body.items).toEqual([])
    expect(ids(byPixAndChannel)).toEqual([channeledPix.order.id])
    expect(ids(byNoneInPeriod)).toEqual([legacy.order.id])
    expect(byPixBeforeOrders.body.items).toEqual([])
    expect(invalid.status).toBe(422)
    expect(invalid.body).not.toHaveProperty('items')
    const legacyItem = all.body.items.find(
      (item: { id: string }) => item.id === legacy.order.id,
    )
    expect(legacyItem).not.toHaveProperty('paymentMethod')
    expect(byPix.body.items[0].paymentMethod).toBe('pix')
  })

  it('rejects malformed queries and unauthenticated requests', async () => {
    const malformed = await request(fixture.app.getHttpServer())
      .get('/orders?createdFrom=2026-01-01T00:00:00.000Z')
      .set('Cookie', managerRequestAuthorization())
    const anonymous = await request(fixture.app.getHttpServer()).get('/orders')
    const foreign = await request(fixture.app.getHttpServer())
      .get('/orders')
      .set('Cookie', foreignManagerRequestAuthorization())

    expect(malformed.status).toBe(422)
    expect(malformed.body).not.toHaveProperty('items')
    expect(anonymous.status).toBe(401)
    expect(foreign.status).toBe(200)
    expect(foreign.body.items).toEqual([])
  })
})

async function listOrders(fixture: PdvModuleFixture, query: string, asOperator = false) {
  return request(fixture.app.getHttpServer())
    .get(query ? `/orders?${query}` : '/orders')
    .set(
      'Cookie',
      asOperator ? operatorRequestAuthorization() : managerRequestAuthorization(),
    )
}
