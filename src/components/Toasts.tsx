import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { Check, AlertCircle, Info, Utensils } from 'lucide-react'

export interface Toast {
  id: number
  message: string
  type?: 'success' | 'error' | 'info'
}

let counter = 0
const listeners = new Set<(t: Toast) => void>()

export function toast(message: string, type: Toast['type'] = 'info') {
  const t: Toast = { id: ++counter, message, type }
  listeners.forEach((l) => l(t))
}

const styles: Record<NonNullable<Toast['type']>, string> = {
  success: 'border-emerald-200 bg-white text-emerald-700',
  error: 'border-rose-200 bg-white text-rose-700',
  info: 'border-brand-200 bg-white text-brand-700',
}

const iconBg: Record<NonNullable<Toast['type']>, string> = {
  success: 'bg-emerald-500 text-white',
  error: 'bg-rose-500 text-white',
  info: 'bg-brand-600 text-white',
}

const icons = {
  success: Check,
  error: AlertCircle,
  info: Info,
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => {
    const push = (t: Toast) => {
      setItems((prev) => [...prev, t])
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== t.id)), 3200)
    }
    listeners.add(push)
    return () => {
      listeners.delete(push)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      <AnimatePresence>
        {items.map((t) => {
          const Icon = icons[t.type ?? 'info']
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className={`pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-card backdrop-blur-xl ${styles[t.type ?? 'info']}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${iconBg[t.type ?? 'info']}`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              {t.message}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Utensils className="h-7 w-7" />
      </div>
      <p className="max-w-xs text-sm text-slate-500">{children}</p>
    </div>
  )
}
