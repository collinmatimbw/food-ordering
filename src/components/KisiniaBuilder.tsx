import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Minus,
  Plus,
  Users,
  UtensilsCrossed,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import type { KisiniaConfig, KisiniaCartLine } from '../types'
import { getIcon } from '../icons'
import { money } from '../utils'
import { quoteKisinia, COMBO_ID, MAX_PICK_QTY } from '../kisinia'
import { Sheet } from './TablePicker'

type Mode = 'size' | 'combo'

export default function KisiniaBuilder({
  open,
  onClose,
  config,
  currency,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  config: KisiniaConfig
  currency: string
  onAdd: (line: KisiniaCartLine) => void
}) {
  const [mode, setMode] = useState<Mode>('size')
  const [sizeId, setSizeId] = useState<string>(config.sizes[0]?.id ?? '')
  const [picks, setPicks] = useState<Record<string, number>>({})
  const [qty, setQty] = useState(1)

  const available = useMemo(
    () => config.components.filter((c) => c.available),
    [config.components]
  )
  const chosenSize = config.sizes.find((s) => s.id === sizeId)
  const quote = useMemo(
    () =>
      quoteKisinia(config, mode === 'combo' ? COMBO_ID : sizeId, mode === 'combo' ? picks : {}),
    [config, mode, sizeId, picks]
  )

  const portionsUsed = Object.values(picks).reduce((a, b) => a + b, 0)

  const bump = (id: string, delta: number) =>
    setPicks((p) => {
      const next = { ...p }
      const v = (next[id] ?? 0) + delta
      if (v <= 0) delete next[id]
      else next[id] = Math.min(v, MAX_PICK_QTY)
      return next
    })

  const canAdd =
    mode === 'size' ? Boolean(quote && chosenSize) : Boolean(quote && portionsUsed > 0)

  function add() {
    if (!quote) return
    onAdd({
      sizeId: quote.sizeId,
      picks: mode === 'combo' ? { ...picks } : {},
      qty,
    })
    setPicks({})
    setQty(1)
    setMode('size')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={config.title}>
      <div className="flex flex-col gap-5 p-5">
        {/* Blurb */}
        <p className="text-[13px] leading-relaxed text-ink-500">{config.blurb}</p>

        {/* Choose the path (exclusive) */}
        <section aria-label="Choose how to build your kisinia">
          <div className="grid grid-cols-2 gap-2.5">
            <ChoiceTile
              active={mode === 'size'}
              onClick={() => setMode('size')}
              Icon={Users}
              title="Kisinia size"
              sub="Choose by people count"
            />
            <ChoiceTile
              active={mode === 'combo'}
              onClick={() => setMode('combo')}
              Icon={UtensilsCrossed}
              title="Food combo"
              sub="Pick your own dishes"
            />
          </div>
        </section>

        {/* ===== PATH 1: platter size ===== */}
        {mode === 'size' ? (
          <section>
            <Step n={1} label="Chagua size yako" hint="Kitchen fills the food" />
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {config.sizes.map((s) => {
                const active = s.id === sizeId
                return (
                  <button
                    key={s.id}
                    onClick={() => setSizeId(s.id)}
                    className={`relative flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-all ${
                      active
                        ? 'border-brand-600 bg-brand-600 text-white shadow-brand'
                        : 'border-slate-200 bg-white text-ink-700 hover:border-brand-300'
                    }`}
                  >
                    <Users className={`h-4 w-4 ${active ? 'text-white' : 'text-brand-500'}`} />
                    <span className="font-display text-sm font-extrabold">{s.name}</span>
                    <span
                      className={`text-[11px] font-semibold ${active ? 'text-white/80' : 'text-ink-400'}`}
                    >
                      {money(currency, s.price)}
                    </span>
                    <span
                      className={`text-[10px] ${active ? 'text-white/70' : 'text-ink-400'}`}
                    >
                      {s.slots} picks
                    </span>
                    {active && (
                      <CheckCircle2 className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-white text-brand-600" />
                    )}
                  </button>
                )
              })}
            </div>
            <p className="mt-2.5 flex items-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11.5px] leading-snug text-ink-500">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
              Just pick how many people — our kitchen fills the kisinia with its best dishes. No
              food picking needed.
            </p>
          </section>
        ) : (
          /* ===== PATH 2: food combo ===== */
          <section>
            <Step n={1} label="Jaza chakula" hint={`${portionsUsed} portion${portionsUsed === 1 ? '' : 's'}`} />
            <div className="mt-3 grid grid-cols-1 gap-2">
              {available.map((c) => {
                const qtyOf = picks[c.id] ?? 0
                const Icon = getIcon(c.icon)
                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-3 rounded-2xl border p-2.5 transition-colors ${
                      qtyOf > 0 ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        qtyOf > 0 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-ink-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink-900">{c.name}</p>
                      <p className="text-[11px] font-semibold text-ink-400">
                        {money(currency, c.price)} each
                      </p>
                    </div>
                    {qtyOf === 0 ? (
                      <button
                        onClick={() => bump(c.id, 1)}
                        aria-label={`Add ${c.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-ink-600 transition hover:border-brand-400 hover:text-brand-600 active:scale-95"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-0.5 rounded-xl border border-brand-200 bg-white p-0.5 animate-pop">
                        <button
                          onClick={() => bump(c.id, -1)}
                          aria-label={`Remove ${c.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-700"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                        <span className="w-5 text-center text-[13px] font-bold text-ink-900">
                          {qtyOf}
                        </span>
                        <button
                          onClick={() => bump(c.id, 1)}
                          aria-label={`More ${c.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-700"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-2.5 flex items-start gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11.5px] leading-snug text-ink-500">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
              No platter size here — you pay exactly for the dishes you picked.
            </p>
          </section>
        )}

        {/* Summary */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {mode === 'size' ? (
            <>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-ink-500">
                  {quote ? `${quote.sizeName} platter (${quote.slots} picks)` : 'No size selected'}
                </span>
                <span className="font-semibold text-ink-800">
                  {money(currency, quote?.unitPrice ?? 0)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-ink-400">Kitchen's choice inside</p>
            </>
          ) : (
            <>
              {portionsUsed > 0 ? (
                Object.entries(picks).map(([id, q]) => {
                  const c = available.find((x) => x.id === id)
                  if (!c) return null
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between text-[13px] first:mt-0"
                    >
                      <span className="text-ink-500">
                        {q}× {c.name}
                      </span>
                      <span className="font-semibold text-ink-800">
                        {money(currency, c.price * q)}
                      </span>
                    </div>
                  )
                })
              ) : (
                <p className="text-[13px] text-ink-400">Pick at least one dish</p>
              )}
              {portionsUsed > 0 && (
                <>
                  <div className="my-2 border-t border-dashed border-slate-300" />
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-ink-500">Combo total ({portionsUsed} portions)</span>
                    <span className="font-semibold text-ink-800">
                      {money(currency, quote?.unitPrice ?? 0)}
                    </span>
                  </div>
                </>
              )}
            </>
          )}
          <div className="my-2 border-t border-dashed border-slate-300" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-0.5">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Fewer kisinia"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-600 transition hover:bg-slate-100"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
              <span className="w-5 text-center text-sm font-bold text-ink-900">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                aria-label="More kisinia"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-600 transition hover:bg-slate-100"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-ink-400">Total</span>
              <p className="font-display text-xl font-extrabold text-brand-600">
                {money(currency, (quote?.unitPrice ?? 0) * qty)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 p-4 backdrop-blur-xl">
        <button onClick={add} disabled={!canAdd} className="btn-primary w-full py-3.5 text-base">
          {canAdd && quote ? (
            <>Add to cart · {money(currency, quote.unitPrice * qty)}</>
          ) : mode === 'size' ? (
            <>Pick a platter size</>
          ) : (
            <>Pick at least one dish</>
          )}
        </button>
      </div>
    </Sheet>
  )
}

function ChoiceTile({
  active,
  onClick,
  Icon,
  title,
  sub,
}: {
  active: boolean
  onClick: () => void
  Icon: React.ComponentType<{ className?: string }>
  title: string
  sub: string
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all ${
        active
          ? 'border-brand-600 bg-brand-600 text-white shadow-brand'
          : 'border-slate-200 bg-white text-ink-700 hover:border-brand-300'
      }`}
    >
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          active ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-600'
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="font-display text-[13px] font-extrabold">{title}</span>
      <span className={`text-[10.5px] leading-tight ${active ? 'text-white/75' : 'text-ink-400'}`}>
        {sub}
      </span>
      {active && (
        <CheckCircle2 className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-white text-brand-600" />
      )}
    </button>
  )
}

function Step({ n, label, hint }: { n: number; label: string; hint: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-900 text-[11px] font-black text-white">
        {n}
      </span>
      <h3 className="font-display text-sm font-extrabold text-ink-900">{label}</h3>
      <span className="ml-auto text-[11px] font-semibold text-ink-400">{hint}</span>
    </div>
  )
}
