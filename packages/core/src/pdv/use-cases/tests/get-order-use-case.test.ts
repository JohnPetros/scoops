import { beforeEach, describe, expect, it } from 'vitest'
import { mock, type MockProxy } from 'vitest-mock-extended'

import { UserProfile } from '#identity/domain/structures/user-profile.ts'
import { OrderFaker } from '#pdv/domain/entities/fakers/order-faker.ts'
import { OrderPaymentMethod } from '#pdv/domain/structures/order-payment-method.ts'
import type { OrdersRepository } from '#pdv/interfaces/orders-repository.ts'
import { AuthorizationError, NotFoundError } from '#shared/domain/errors/index.ts'
import { GetOrderUseCase } from '#pdv/use-cases/get-order-use-case.ts'

const actor = {
  id: 'operator-1',
  name: 'Operator',
  establishmentId: 'establishment-1',
  profile: UserProfile.Operator,
} as const

describe('Get Order Use Case', () => {
  let repository: MockProxy<OrdersRepository>
  let useCase: GetOrderUseCase

  beforeEach(() => {
    repository = mock<OrdersRepository>()
    useCase = new GetOrderUseCase(repository)
  })

  it('reads a complete current-tenant snapshot', async () => {
    const order = OrderFaker.fake({ establishmentId: actor.establishmentId })
    repository.findById.mockResolvedValue(order)
    await expect(useCase.execute({ actor, orderId: order.id })).resolves.toBe(order)
    expect(repository.findById).toHaveBeenCalledWith(actor.establishmentId, order.id)
  })

  it('returns the stored payment method, or none for an older order', async () => {
    const withMethod = OrderFaker.fake({
      establishmentId: actor.establishmentId,
      paymentMethod: OrderPaymentMethod.DebitCard,
    })
    repository.findById.mockResolvedValueOnce(withMethod)
    await expect(
      useCase.execute({ actor, orderId: withMethod.id }),
    ).resolves.toMatchObject({ paymentMethod: OrderPaymentMethod.DebitCard })

    const older = OrderFaker.fake({
      establishmentId: actor.establishmentId,
      paymentMethod: undefined,
    })
    repository.findById.mockResolvedValueOnce(older)
    const result = await useCase.execute({ actor, orderId: older.id })
    expect(result.paymentMethod).toBeUndefined()
  })

  it('hides missing and cross-tenant orders identically', async () => {
    repository.findById.mockResolvedValue(undefined)
    await expect(useCase.execute({ actor, orderId: 'missing' })).rejects.toBeInstanceOf(
      NotFoundError,
    )

    repository.findById.mockResolvedValue(OrderFaker.fake({ establishmentId: 'other' }))
    await expect(useCase.execute({ actor, orderId: 'foreign' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('allows Manager and rejects an unauthorized profile before reading', async () => {
    repository.findById.mockResolvedValue(
      OrderFaker.fake({ establishmentId: actor.establishmentId }),
    )
    await expect(
      useCase.execute({
        actor: { ...actor, profile: UserProfile.Manager },
        orderId: 'order-1',
      }),
    ).resolves.toBeDefined()
    await expect(
      useCase.execute({
        actor: { ...actor, profile: 'owner' as UserProfile },
        orderId: 'order-1',
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
    expect(repository.findById).toHaveBeenCalledTimes(1)
  })
})
