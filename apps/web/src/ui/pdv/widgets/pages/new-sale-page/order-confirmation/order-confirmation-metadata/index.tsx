import { Icon } from '@/ui/shared/widgets/components/icon'

import type { OrderConfirmationMetadataItem } from '../use-order-confirmation'

export type OrderConfirmationMetadataProps = {
  metadata: readonly OrderConfirmationMetadataItem[]
}

export const OrderConfirmationMetadata = ({
  metadata,
}: OrderConfirmationMetadataProps) => (
  <dl className='grid gap-4 border-b border-border-soft bg-muted/45 p-5 sm:grid-cols-4 sm:p-6'>
    {metadata.map(([label, value, icon]) => (
      <div key={label}>
        <dt className='text-xs text-muted-foreground'>{label}</dt>
        <dd className='mt-1 flex items-center gap-1.5 text-sm font-bold'>
          {icon ? <Icon className='size-3.5 shrink-0 text-primary' name={icon} /> : null}
          {value}
        </dd>
      </div>
    ))}
  </dl>
)
