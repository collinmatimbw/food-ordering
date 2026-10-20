import { motion } from 'framer-motion'
import { Plus, Minus, Clock, Star } from 'lucide-react'
import type { MenuItem } from '../types'
import DishImage from './DishImage'
import { money } from '../utils'

export default function DishCard({
  item,
  qty,
  currency,
  onAdd,
  onRemove,
}: {
  item: MenuItem
  qty: number
  currency: string
  onAdd: () => void
  onRemove: () => void
}) {
  const selected = qty > 0

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300 ${
        selected
          ? 'ring-2 ring-brand-500 shadow-lift'
          : 'shadow-card hover:-translate-y-1 hover:shadow-lift'
      }`}
    >
      {/* Photo */}
      <div className="relative">
        <DishImage
          src={item.image}
          icon={item.icon}
          gradient={item.gradient}
          alt={item.name}
          iconSize="h-10 w-10 sm:h-14 sm:w-14"
          className="h-28 w-full sm:h-40"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

        {item.tags[0] && (
          <span className="absolute left-2 top-2 rounded-md bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm sm:left-3 sm:top-3 sm:px-2 sm:py-1 sm:text-[10px]">
            {item.tags[0]}
          </span>
        )}

        {item.rating && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-bold text-ink-900 shadow-sm backdrop-blur sm:right-3 sm:top-3 sm:px-2 sm:py-1 sm:text-[11px]">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {item.rating.toFixed(1)}
          </span>
        )}

        {item.prepMinutes && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur sm:bottom-3 sm:left-3 sm:px-2 sm:py-1 sm:text-[10px]">
            <Clock className="h-3 w-3" /> {item.prepMinutes} min
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:gap-1.5 sm:p-3.5">
        <h3 className="font-display text-[13px] font-bold leading-snug text-ink-900 line-clamp-1 sm:text-[15px]">
          {item.name}
        </h3>
        <p className="hidden text-[12.5px] leading-relaxed text-ink-500 line-clamp-2 sm:block">
          {item.description}
        </p>

        <div className="mt-auto flex items-end justify-between pt-2">
          <div className="min-w-0">
            <span className="font-display block truncate text-base font-extrabold text-brand-600 sm:text-lg">
              {money(currency, item.price)}
            </span>
            <div className="mt-0.5 hidden gap-1 sm:flex">
              {item.tags.slice(1, 3).map((t) => (
                <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {qty === 0 ? (
            <button
              onClick={onAdd}
              disabled={!item.available}
              aria-label={`Add ${item.name}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand transition-all hover:scale-105 hover:bg-brand-700 active:scale-95 disabled:opacity-40 sm:h-10 sm:w-10"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-0.5 rounded-xl bg-brand-600 p-1 shadow-brand animate-pop">
              <button
                onClick={onRemove}
                aria-label="Decrease"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white transition hover:bg-white/15 sm:h-8 sm:w-8"
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <span className="w-5 text-center text-sm font-bold text-white sm:w-6">{qty}</span>
              <button
                onClick={onAdd}
                aria-label="Increase"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white transition hover:bg-white/15 sm:h-8 sm:w-8"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  )
}
