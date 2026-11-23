import { OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'
import { z } from 'zod'

export const orderPaymentMethodSchema = z.enum(OrderPaymentMethod, {
  error: 'Selecione a forma de pagamento.',
})
