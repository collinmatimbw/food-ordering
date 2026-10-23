import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck } from 'lucide-react'

/**
 * Ask the visitor for their phone number after the splash. The number is
 * stored on the device as their ID (prefills checkout and order tracking).
 */
export default function PhoneGate({
  initial = '',
  onSubmit,
}: {
  initial?: string
  onSubmit: (phone: string) => void
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.replace(/\D/g, '').length < 7) {
      setError('Enter a valid phone number (at least 7 digits).')
      return
    }
    setError('')
    onSubmit(value.trim())
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-gradient-to-b from-[#14352F] via-[#0C2A25] to-[#051F1B] px-5 py-10"
    >
      {/* Ambient décor */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl"
      />

      <form
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-center shadow-sheet backdrop-blur-xl sm:p-7"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-300 to-brand-500 font-['Sora'] text-xl font-extrabold text-brand-900 shadow-brand">
          WL
        </div>

        <h1 className="mt-4 font-['Sora'] text-xl font-extrabold tracking-tight text-white sm:text-2xl">
          Welcome to Willis Lounge
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-white/55">
          Enter your phone number to continue. We use it as your ID so your
          orders stay linked to you and you can track them anytime.
        </p>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="tel"
          autoFocus
          placeholder="e.g. 0712 345 678"
          aria-label="Your phone number"
          className="mt-5 w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white outline-none transition placeholder:font-normal placeholder:text-white/35 focus:border-brand-300 focus:bg-white/15 focus:ring-4 focus:ring-brand-300/25"
        />

        {error && (
          <p className="mt-2 text-[12px] font-semibold text-amber-300">{error}</p>
        )}

        <button
          type="submit"
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-brand-800 shadow-brand transition-all duration-200 hover:bg-brand-50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-white/40">
          <ShieldCheck className="h-3.5 w-3.5" />
          Your number is only used to find your orders.
        </p>
      </form>
    </motion.div>
  )
}
