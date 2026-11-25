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

describe('Get Order Controller [GET /orders/:orderId]', () => {
  let fixture: PdvModuleFixture
  let auth: BetterAuthFixture

  beforeAll(async () => ({ fixture, auth } = await preparePdvFixture()))
  beforeEach(async () => resetPdvFixture(fixture, auth))
  afterAll(async () => fixture?.close())

  it('returns the immutable order snapshot to managers and operators', async () => {
    const registered = await fixture.registerPortionOrder({
      authorization: managerRequestAuthorization(),
      productName: 'Original Snapshot Name',
      idempotencyKey: '55000000-0000-4000-8000-000000000201',
    })
    await fixture.products.replace(
      PdvModuleFixture.accounts.establishmentId,
      registered.product.id,
      { name: 'Current Catalog Name' },
    )

    const manager = await request(fixture.app.getHttpServer())
      .get(`/orders/${registered.order.id}`)
      .set('Cookie', managerRequestAuthorization())
    const operator = await request(fixture.app.getHttpServer())
      .get(`/orders/${registered.order.id}`)
      .set('Cookie', operatorRequestAuthorization())

    expect(manager.status).toBe(200)
    expect(manager.body).toMatchObject({
      id: registered.order.id,
      createdByName: 'Maria Manager',
      status: 'registered',
      lines: [
        {
          product: { name: 'Original Snapshot Name' },
        },
      ],
    })
    expect(manager.body.createdAt).toMatch(/Z$/)
    expect(operator.status).toBe(200)
    expect(operator.body).toEqual(manager.body)
  })

  it('returns the stored payment method and omits it for an older order', async () => {
    const stored = await fixture.registerPortionOrder({
      authorization: managerRequestAuthorization(),
      productName: 'Stored Method Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000203',
      paymentMethod: 'credit-card',
    })
    const legacy = await fixture.registerPortionOrder({
      authorization: managerRequestAuthorization(),
      productName: 'Legacy Method Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000204',
    })
    await fixture.clearOrderPaymentMethod(legacy.order.id)

    const storedResponse = await request(fixture.app.getHttpServer())
      .get(`/orders/${stored.order.id}`)
      .set('Cookie', managerRequestAuthorization())
    const legacyResponse = await request(fixture.app.getHttpServer())
      .get(`/orders/${legacy.order.id}`)
      .set('Cookie', operatorRequestAuthorization())

    expect(storedResponse.status).toBe(200)
    expect(storedResponse.body.paymentMethod).toBe('credit-card')
    expect(legacyResponse.status).toBe(200)
    expect(legacyResponse.body).not.toHaveProperty('paymentMethod')
  })

  it('hides unknown and cross-tenant orders and validates the UUID boundary', async () => {
    const foreign = await fixture.registerPortionOrder({
      authorization: foreignManagerRequestAuthorization(),
      establishmentId: PdvModuleFixture.accounts.foreignEstablishmentId,
      productName: 'Foreign Snapshot',
      idempotencyKey: '55000000-0000-4000-8000-000000000202',
    })
    const unknown = await request(fixture.app.getHttpServer())
      .get('/orders/55000000-0000-4000-8000-000000000299')
      .set('Cookie', managerRequestAuthorization())
    const crossTenant = await request(fixture.app.getHttpServer())
      .get(`/orders/${foreign.order.id}`)
      .set('Cookie', managerRequestAuthorization())
    const malformed = await request(fixture.app.getHttpServer())
      .get('/orders/not-an-order-id')
      .set('Cookie', managerRequestAuthorization())
    const anonymous = await request(fixture.app.getHttpServer()).get(
      `/orders/${foreign.id}`,
    )

    expect(unknown.status).toBe(404)
    expect(crossTenant.status).toBe(404)
    expect(crossTenant.body.message).toBe(unknown.body.message)
    expect(malformed.status).toBe(400)
    expect(anonymous.status).toBe(401)
  })
})
