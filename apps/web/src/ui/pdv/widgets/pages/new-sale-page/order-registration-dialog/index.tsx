import type { SalesChannel } from '@scoops/core/pdv/domain/entities'
import type { Cart, OrderPaymentMethod } from '@scoops/core/pdv/domain/structures'

import { Button } from '@/ui/shadcn/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/shadcn/dialog'
import { Icon } from '@/ui/shared/widgets/components/icon'

import { OrderRegistrationSummary } from './order-registration-summary'

export type OrderRegistrationDialogProps = {
  cart?: Cart
  channel?: SalesChannel
  isChannelUnresolved?: boolean
  isOpen: boolean
  isPending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  paymentMethod?: OrderPaymentMethod
}

export const OrderRegistrationDialog = ({
  cart,
  channel,
  isChannelUnresolved = false,
  isOpen,
  isPending,
  onConfirm,
  onOpenChange,
  paymentMethod,
}: OrderRegistrationDialogProps) => (
  <Dialog open={isOpen} onOpenChange={onOpenChange}>
    <DialogContent className='max-w-lg sm:max-w-[560px]'>
      <DialogHeader className='border-b border-border-soft p-6 pr-16'>
        <span className='row-span-2 grid size-11 place-items-center rounded-xl bg-accent text-primary'>
          <Icon name='receipt-text' className='size-6' />
        </span>
        <DialogTitle>Registrar pedido?</DialogTitle>
        <DialogDescription>
          A venda é registrada e o estoque é baixado. Não há reembolso nem estorno; só um
          gerente pode cancelar depois.
        </DialogDescription>
      </DialogHeader>
      <div className='px-6 py-4'>
        {cart ? (
          <OrderRegistrationSummary
            cart={cart}
            channel={channel}
            isChannelUnresolved={isChannelUnresolved}
            paymentMethod={paymentMethod}
          />
        ) : (
          <p className='text-sm text-muted-foreground'>
            Atualizando os valores do pedido…
          </p>
        )}
        {isChannelUnresolved ? (
          <p
            className='mt-3 text-xs font-semibold text-destructive'
            id='order-registration-channel-reason'
            role='alert'
          >
            Não foi possível carregar o canal de venda. Volte ao carrinho e tente de novo.
          </p>
        ) : null}
      </div>
      <DialogFooter className='sm:flex-row sm:justify-end'>
        <Button onClick={() => onOpenChange(false)} type='button' variant='outline'>
          Voltar ao carrinho
        </Button>
        <Button
          aria-describedby={
            isChannelUnresolved ? 'order-registration-channel-reason' : undefined
          }
          disabled={!cart || isPending || isChannelUnresolved}
          onClick={onConfirm}
          type='button'
        >
          {isPending ? (
            'Registrando…'
          ) : (
            <>
              <Icon name='check' /> Registrar pedido
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
