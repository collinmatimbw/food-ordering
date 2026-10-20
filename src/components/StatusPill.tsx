import type { OrderStatus } from '../types'

export const STATUS_META: Record<
  OrderStatus,
  { label: string; className: string; dot: string }
> = {
  new: {
    label: 'New',
    className: 'bg-brand-50 text-brand-700 border-brand-200',
    dot: 'bg-brand-500',
  },
  preparing: {
    label: 'Preparing',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  ready: {
    label: 'Ready',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={`chip border ${meta.className}`}
      style={{ letterSpacing: '0.06em', textTransform: 'uppercase' }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}
