import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Armchair, X } from 'lucide-react'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isMobile
}

export default function TablePicker({
  tables,
  value,
  onChange,
  compact = false,
}: {
  tables: number
  value: number | null
  onChange: (n: number) => void
  compact?: boolean
}) {
  const list = Array.from({ length: tables }, (_, i) => i + 1)

  return (
    <div>
      {!compact && (
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Armchair className="h-4 w-4" /> Your table
          </h3>
          {value && (
            <span className="chip border border-emerald-200 bg-emerald-50 text-emerald-700">
              Table {value} selected
            </span>
          )}
        </div>
      )}

      <div
        className={`grid gap-2 ${
          compact ? 'grid-cols-6' : 'grid-cols-6 sm:grid-cols-8 md:grid-cols-12'
        }`}
      >
        {list.map((n) => {
          const selected = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`relative aspect-square rounded-xl border text-sm font-bold transition-all duration-200 ${
                selected
                  ? 'border-transparent bg-brand-600 text-white shadow-brand scale-105'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 hover:shadow-sm'
              }`}
            >
              {n}
              {selected && (
                <motion.span
                  layoutId="table-ring"
                  className="absolute inset-0 rounded-xl ring-2 ring-brand-400/70"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TableBadge({ table }: { table: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-2.5 py-1 text-xs font-extrabold text-white">
      <Armchair className="h-3.5 w-3.5" /> T{table}
    </span>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className={`fixed z-50 flex flex-col border-slate-200 bg-white shadow-2xl ${
              isMobile
                ? 'inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl'
                : 'right-0 top-0 h-full w-full max-w-md border-l'
            }`}
          >
            {/* Mobile drag handle */}
            {isMobile && (
              <div className="flex justify-center pt-2.5">
                <span className="h-1.5 w-10 rounded-full bg-slate-300" />
              </div>
            )}
            <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="font-display text-lg font-extrabold text-ink-900">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-ink-500 transition hover:bg-slate-100 hover:text-ink-900"
              >
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
