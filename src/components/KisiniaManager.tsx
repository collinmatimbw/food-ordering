import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Save, Sparkles, Users, GripVertical } from 'lucide-react'
import type { KisiniaConfig, KisiniaComponent, KisiniaSize } from '../types'
import { saveKisinia } from '../api'
import { getIcon } from '../icons'
import { money } from '../utils'
import { toast } from './Toasts'

const ICON_CHOICES = [
  'Utensils',
  'UtensilsCrossed',
  'Wheat',
  'Drumstick',
  'Beef',
  'Fish',
  'Salad',
  'Leaf',
  'Soup',
  'Egg',
  'Croissant',
  'Flame',
  'Pizza',
  'Cake',
]

export default function KisiniaManager({
  config,
  currency,
  onSaved,
}: {
  config: KisiniaConfig
  currency: string
  onSaved: (c: KisiniaConfig) => void
}) {
  const [draft, setDraft] = useState<KisiniaConfig>(config)
  const [busy, setBusy] = useState(false)

  useEffect(() => setDraft(config), [config])

  const dirty = JSON.stringify(draft) !== JSON.stringify(config)

  const setSize = (i: number, patch: Partial<KisiniaSize>) =>
    setDraft((d) => ({
      ...d,
      sizes: d.sizes.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }))

  const setComp = (i: number, patch: Partial<KisiniaComponent>) =>
    setDraft((d) => ({
      ...d,
      components: d.components.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }))

  async function save() {
    setBusy(true)
    try {
      const saved = await saveKisinia(draft)
      onSaved(saved)
      toast('Kisinia builder updated', 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Save failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-ink-900">
            <Sparkles className="h-5 w-5 text-brand-500" /> Kisinia builder
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Size tiers, prices and what goes on the big shared plate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="btn-ghost cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              className="h-4 w-4 accent-[#163832]"
            />
            {draft.enabled ? 'Visible to customers' : 'Hidden'}
          </label>
          <button onClick={save} disabled={!dirty || busy} className="btn-primary text-sm">
            {busy ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </button>
        </div>
      </div>

      {/* Title / blurb */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Title
          </span>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Blurb (shown on the card)
          </span>
          <input
            value={draft.blurb}
            onChange={(e) => setDraft({ ...draft, blurb: e.target.value })}
            className="input"
          />
        </label>
      </div>

      {/* Sizes */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-ink-700">
            <Users className="h-4 w-4 text-brand-500" /> Size tiers
          </h3>
          <button
            onClick={() =>
              setDraft((d) => ({
                ...d,
                sizes: [
                  ...d.sizes,
                  {
                    id: `size-${d.sizes.length + 1}`,
                    name: `Watu ${d.sizes.length * 2 + 2}`,
                    people: d.sizes.length * 2 + 2,
                    price: 50000,
                    slots: 5,
                  },
                ],
              }))
            }
            disabled={draft.sizes.length >= 5}
            className="btn-ghost text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add size
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="hidden grid-cols-[1fr_100px_130px_110px_36px] gap-3 px-1 text-[10px] font-bold uppercase tracking-wider text-ink-400 sm:grid">
            <span>Name</span>
            <span>People</span>
            <span>Price ({currency})</span>
            <span>Included picks</span>
            <span />
          </div>
          {draft.sizes.map((s, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_100px_130px_110px_36px] sm:border-0 sm:bg-transparent sm:p-1"
            >
              <input
                value={s.name}
                onChange={(e) => setSize(i, { name: e.target.value })}
                className="input py-2 sm:text-sm"
                placeholder="Name"
              />
              <input
                type="number"
                min={1}
                value={s.people}
                onChange={(e) => setSize(i, { people: parseInt(e.target.value, 10) || 1 })}
                className="input py-2 sm:text-sm"
                title="People"
              />
              <input
                type="number"
                min={0}
                step={1000}
                value={s.price}
                onChange={(e) => setSize(i, { price: parseInt(e.target.value, 10) || 0 })}
                className="input py-2 sm:text-sm"
                title="Price"
              />
              <input
                type="number"
                min={1}
                value={s.slots}
                onChange={(e) => setSize(i, { slots: parseInt(e.target.value, 10) || 1 })}
                className="input py-2 sm:text-sm"
                title="Included picks"
              />
              <button
                onClick={() =>
                  setDraft((d) => ({ ...d, sizes: d.sizes.filter((_, idx) => idx !== i) }))
                }
                disabled={draft.sizes.length <= 1}
                aria-label="Remove size"
                className="flex h-9 w-9 items-center justify-center justify-self-end rounded-xl border border-slate-200 text-ink-400 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-400">
          “Included picks” = how many portions come with the base price. Anything beyond is
          charged at the component price (cheapest charged first).
        </p>
      </section>

      {/* Components */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-ink-700">
            <GripVertical className="h-4 w-4 text-brand-500" /> Components
            <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] text-brand-700">
              {draft.components.length}
            </span>
          </h3>
          <button
            onClick={() => {
              const n = draft.components.length + 1
              setDraft((d) => ({
                ...d,
                components: [
                  ...d.components,
                  {
                    id: `comp-${n}-${Date.now().toString(36).slice(-4)}`,
                    name: 'New item',
                    price: 3000,
                    icon: 'Utensils',
                    available: true,
                  },
                ],
              }))
            }}
            disabled={draft.components.length >= 40}
            className="btn-ghost text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add component
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {draft.components.map((c, i) => {
              const Icon = getIcon(c.icon)
              return (
                <motion.div
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`flex items-center gap-2.5 rounded-2xl border p-3 transition ${
                    c.available
                      ? 'border-slate-200 bg-white'
                      : 'border-dashed border-slate-300 bg-slate-50 opacity-70'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      c.available ? 'bg-brand-50 text-brand-600' : 'bg-slate-200 text-ink-400'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <input
                      value={c.name}
                      onChange={(e) => setComp(i, { name: e.target.value })}
                      className="w-full border-b border-transparent bg-transparent text-[13px] font-bold text-ink-900 outline-none transition focus:border-brand-300"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={c.price}
                        onChange={(e) => setComp(i, { price: parseInt(e.target.value, 10) || 0 })}
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-ink-700 outline-none focus:border-brand-400"
                        title="Price"
                      />
                      <select
                        value={c.icon}
                        onChange={(e) => setComp(i, { icon: e.target.value })}
                        className="rounded-lg border border-slate-200 px-1.5 py-1 text-xs text-ink-600 outline-none focus:border-brand-400"
                        title="Icon"
                      >
                        {ICON_CHOICES.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setComp(i, { available: !c.available })}
                        className={`chip border ml-auto transition ${
                          c.available
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white text-ink-400'
                        }`}
                      >
                        {c.available ? 'Available' : 'Off'}
                      </button>
                      <button
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            components: d.components.filter((_, idx) => idx !== i),
                          }))
                        }
                        disabled={draft.components.length <= 1}
                        aria-label="Remove component"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3">
          <span className="text-[12px] text-ink-500">
            Example: {money(currency, draft.sizes[0]?.price ?? 0)} kisinia with{' '}
            {draft.sizes[0]?.slots ?? 0} picks — extras from{' '}
            {money(currency, Math.min(...draft.components.map((c) => c.price)))}
          </span>
          <button onClick={save} disabled={!dirty || busy} className="btn-primary text-sm">
            <Save className="h-4 w-4" /> Save changes
          </button>
        </div>
      </section>
    </div>
  )
}
