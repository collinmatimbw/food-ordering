import { useMemo, useState } from 'react'
import { Minus, Plus, UtensilsCrossed } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MenuItem } from '../types'
import { Sheet } from './TablePicker'
import { getIcon } from '../icons'
import { money } from '../utils'

interface SideCount {
  [id: string]: number
}

export default function PlatterPicker({
  open,
  onClose,
  platter,
  sides,
  currency,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  platter: MenuItem | null
  sides: MenuItem[]
  currency: string
  onAdd: (platter: MenuItem, sides: MenuItem[], qty: number) => void
}) {
  const [counts, setCounts] = useState<SideCount>({})
  const [qty, setQty] = useState(1)

  const included = platter?.sidesIncluded ?? 0
  const totalSides = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts])
  const selectedSides = useMemo(
    () => sides.filter((s) => (counts[s.id] || 0) > 0).flatMap((s) => Array(counts[s.id]).fill(s)),
    [sides, counts]
  )

  const canAdd = included > 0 ? totalSides === included : true

  const incSide = (id: string) => setCounts((c) => ({ ...c, [id]: (c[id] || 0) + 1 }))
  const decSide = (id: string) => {
    setCounts((c) => {
      const next = { ...c }
      const v = (next[id] || 0) - 1
      if (v <= 0) delete next[id]
      else next[id] = v
      return next
    })
  }

  const reset = () => {
    setCounts({})
    setQty(1)
  }

  const add = () => {
    if (!platter) return
    if (!canAdd) return
    onAdd(platter, selectedSides, qty)
    reset()
    onClose()
  }

  if (!platter) return null

  const PIcon = getIcon(platter.icon)

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Kisinia selection"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start gap-3 px-5 pb-4 pt-1">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 text-white">
            <PIcon className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-extrabold text-ink-900">{platter.name}</p>
            <p className="text-sm font-bold text-brand-600">{money(currency, platter.price)}</p>
            {platter.description && (
              <p className="mt-1 text-[12.5px] leading-snug text-ink-500">{platter.description}</p>
            )}
            {included > 0 && (
              <p className="mt-1 text-[12px] font-semibold text-brand-600">
                Choose {included} side{included === 1 ? '' : 's'} ({totalSides}/{included})
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-ink-400">Select sides</p>
          <div className="flex flex-col gap-2">
            {sides.map((side) => {
              const Icon = getIcon(side.icon)
              const c = counts[side.id] || 0
              return (
                <div
                  key={side.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-ink-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-ink-900">{side.name}</p>
                    <p className="text-[11.5px] text-ink-500">{money(currency, side.price)}</p>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 p-0.5">
                    <button
                      onClick={() => decSide(side.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 hover:bg-slate-50"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{c}</span>
                    <button
                      onClick={() => incSide(side.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-600 hover:bg-slate-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 p-0.5">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-slate-50"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-600 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={add}
              disabled={!canAdd}
              className={`btn-primary inline-flex items-center gap-2 ${!canAdd ? 'opacity-50' : ''}`}
            >
              <UtensilsCrossed className="h-4 w-4" />
              Add to cart · {money(currency, platter.price * qty)}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}
