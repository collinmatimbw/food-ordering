import { Printer, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Order } from '../types'
import { money } from '../utils'

export default function ReceiptModal({
  order,
  currency,
  onClose,
}: {
  order: Order | null
  currency: string
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {order && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px] no-print"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2"
          >
            {/* Toolbar (screen only) */}
            <div className="no-print mb-3 flex items-center justify-end gap-2">
              <button onClick={() => window.print()} className="btn-primary text-sm">
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Receipt */}
            <div className="print-area rounded-lg bg-white p-6 font-mono text-[12px] text-ink-900 shadow-sheet">
              <div className="border-b border-dashed border-slate-300 pb-3 text-center">
                <p className="font-display text-lg font-extrabold tracking-tight">
                  FOOD POINT
                </p>
                <p className="text-[11px] text-ink-500">
                  Mikocheni B, Dar es Salaam
                </p>
                <p className="text-[11px] text-ink-500">TIN 118-442-901 · +255 754 000 111</p>
              </div>

              <div className="grid grid-cols-2 gap-1 border-b border-dashed border-slate-300 py-3 text-[11px]">
                <span>Receipt</span>
                <span className="text-right font-bold">{order.code}</span>
                <span>{order.table != null ? 'Table' : 'Order type'}</span>
                <span className="text-right font-bold">
                  {order.table != null
                    ? order.table
                    : order.type === 'delivery'
                      ? 'Delivery'
                      : 'Takeaway'}
                </span>
                {order.phone && (
                  <>
                    <span>Phone</span>
                    <span className="text-right font-bold">{order.phone}</span>
                  </>
                )}
                {order.address && (
                  <>
                    <span>{order.type === 'delivery' ? 'Location' : 'Note'}</span>
                    <span className="text-right">{order.address}</span>
                  </>
                )}
                <span>Guest</span>
                <span className="text-right">{order.customer}</span>
                <span>Date</span>
                <span className="text-right">
                  {new Date(order.createdAt).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span>Status</span>
                <span className="text-right uppercase">{order.status}</span>
              </div>

              <table className="w-full border-b border-dashed border-slate-300 py-2">
                <thead>
                  <tr className="text-[10px] uppercase text-ink-500">
                    <th className="py-1 text-left font-semibold">Item</th>
                    <th className="py-1 text-center font-semibold">Qty</th>
                    <th className="py-1 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it, idx) => (
                    <tr key={`${it.id}-${idx}`} className="align-top">
                      <td className="py-0.5 pr-2">
                        {it.name}
                        {it.note && (
                          <span className="block text-[10px] italic text-amber-700">
                            {it.note}
                          </span>
                        )}
                        {it.kisinia && (
                          <span className="block text-[10px] text-ink-500">
                            {it.kisinia.picks.length
                              ? it.kisinia.picks.map((p) => `${p.qty}× ${p.name}`).join(', ')
                              : "Kitchen's choice"}
                          </span>
                        )}
                      </td>
                      <td className="py-0.5 text-center">{it.qty}</td>
                      <td className="py-0.5 text-right">
                        {money(currency, it.price * it.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 border-b border-dashed border-slate-300 py-2">
                <Row label="Subtotal" value={money(currency, order.subtotal)} />
                <Row label="Service (5%)" value={money(currency, order.service)} />
                <Row label="TOTAL" value={money(currency, order.total)} bold />
              </div>

              {order.note && (
                <p className="border-b border-dashed border-slate-300 py-2 text-[11px] italic text-ink-600">
                  Note: {order.note}
                </p>
              )}

              <p className="pt-3 text-center text-[11px] text-ink-500">
                Asante sana! Karibu tena.
              </p>
              <p className="text-center text-[10px] text-ink-400">
                Powered by Savor Table Ordering
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-[13px] font-extrabold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
