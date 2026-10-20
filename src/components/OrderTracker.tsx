import { motion } from 'framer-motion'
import { Receipt, RotateCcw } from 'lucide-react'
import type { Order } from '../types'
import { StatusPill } from './StatusPill'
import { getIcon } from '../icons'
import { money } from '../utils'

const STEPS = [
  { key: 'new', label: 'Received', icon: 'ClipboardList' },
  { key: 'preparing', label: 'Preparing', icon: 'ChefHat' },
  { key: 'ready', label: 'Ready', icon: 'BellRing' },
  { key: 'delivered', label: 'Served', icon: 'UtensilsCrossed' },
] as const

export default function OrderTracker({
  order,
  currency,
  onDismiss,
  onViewReceipt,
}: {
  order: Order
  currency: string
  onDismiss: () => void
  onViewReceipt?: () => void
}) {
  const cancelled = order.status === 'cancelled'
  const activeIndex = STEPS.findIndex((s) => s.key === order.status)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 shadow-lift sm:rounded-[28px] sm:p-8"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-200/60 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-500">
            Order placed
          </p>
          <h2 className="font-display mt-1 text-xl font-extrabold text-ink-900 sm:text-2xl">
            {order.code}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Table {order.table} · {order.customer}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusPill status={order.status} />
          <span className="font-display text-2xl font-extrabold text-brand-600">
            {money(currency, order.total)}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="relative mt-8">
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200" />
        <motion.div
          className="absolute left-0 top-5 h-0.5 bg-gradient-to-r from-brand-400 to-emerald-400"
          initial={{ width: '0%' }}
          animate={{ width: cancelled ? '0%' : `${Math.max(0, activeIndex) * 33.3}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        <div className="relative grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => {
            const done = !cancelled && i <= activeIndex
            const current = !cancelled && i === activeIndex
            const StepIcon = getIcon(s.icon)
            return (
              <div key={s.key} className="flex flex-col items-center gap-2 text-center">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-500 sm:h-10 sm:w-10 ${
                    current
                      ? 'scale-110 border-transparent bg-brand-600 text-white shadow-brand'
                      : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  <StepIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider sm:text-[11px] ${
                    done ? 'text-ink-700' : 'text-ink-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Items */}
      <div className="relative mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <ul className="flex flex-col gap-1.5">
          {order.items.map((it, idx) => {
            const ItemIcon = getIcon(it.icon)
            if (it.kisinia) {
              return (
                <li key={`${it.id}-${idx}`} className="rounded-xl border border-brand-200 bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-ink-700">
                      <ItemIcon className="h-4 w-4 text-brand-600" />
                      <span className="font-semibold text-ink-800">{it.qty}×</span> {it.name}
                      <span className="chip border border-brand-200 bg-brand-50 text-[9px] text-brand-700">
                        Kisinia
                      </span>
                    </span>
                    <span className="font-semibold text-ink-500">
                      {money(currency, it.price * it.qty)}
                    </span>
                  </div>
                  <p className="mt-1 pl-6 text-[11.5px] text-ink-500">
                    {it.kisinia.picks.length
                      ? it.kisinia.picks.map((p) => `${p.qty}× ${p.name}`).join(', ')
                      : "Kitchen's choice"}
                  </p>
                </li>
              )
            }
            return (
              <li key={`${it.id}-${idx}`} className="flex items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <span className="flex items-center gap-2 text-ink-600">
                    <ItemIcon className="h-4 w-4 shrink-0 text-ink-400" />
                    <span className="truncate">{it.qty} × {it.name}</span>
                  </span>
                  {it.note && (
                    <span className="mt-0.5 block pl-6 text-[11px] italic text-amber-700">
                      {it.note}
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-semibold text-ink-800">
                  {money(currency, it.price * it.qty)}
                </span>
              </li>
            )
          })}
        </ul>
        {order.note && (
          <p className="mt-3 rounded-xl bg-white p-3 text-xs italic text-ink-500">
            “{order.note}”
          </p>
        )}
      </div>

      <div className="relative mt-6 flex flex-col gap-2 sm:flex-row">
        {onViewReceipt && (
          <button onClick={onViewReceipt} className="btn-ghost flex-1">
            <Receipt className="h-4 w-4" /> View receipt
          </button>
        )}
        <button onClick={onDismiss} className="btn-ghost flex-1">
          <RotateCcw className="h-4 w-4" /> Start a new order
        </button>
      </div>
    </motion.div>
  )
}
