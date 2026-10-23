import { useEffect } from 'react'
import { motion } from 'framer-motion'

/** Fade out and remove the static boot splash from index.html (if still there). */
export function hideBootSplash() {
  const boot = document.getElementById('wl-boot')
  if (!boot || boot.dataset.leaving) return
  boot.dataset.leaving = '1'
  boot.style.opacity = '0'
  window.setTimeout(() => boot.remove(), 500)
}

/** Full-screen Willis Lounge branded loading screen. */
export default function Splash({ label = 'Setting the table…' }: { label?: string }) {
  useEffect(() => hideBootSplash(), [])

  return (
    <motion.div
      role="status"
      aria-label={label}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#14352F] via-[#0C2A25] to-[#051F1B] px-6"
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

      <div className="relative flex flex-col items-center text-center">
        {/* Monogram */}
        <div className="relative">
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-3xl bg-brand-300/25 motion-reduce:animate-none"
          />
          <div className="relative flex h-24 w-24 animate-pop items-center justify-center rounded-3xl bg-gradient-to-br from-brand-300 to-brand-500 text-brand-900 shadow-brand motion-reduce:animate-none">
            <span className="font-['Sora'] text-4xl font-extrabold tracking-tight">WL</span>
          </div>
        </div>

        {/* Wordmark */}
        <h1 className="mt-7 animate-riseIn font-['Sora'] text-[30px] font-extrabold tracking-tight text-white motion-reduce:animate-none sm:text-4xl">
          WILLIS LOUNGE
        </h1>
        <p className="mt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-brand-100/60">
          Bar &amp; Grill · Sinza Mapambano
        </p>

        {/* Progress shimmer */}
        <div className="mt-8 h-1.5 w-52 overflow-hidden rounded-full bg-white/10 sm:w-60">
          <div className="h-full w-2/5 animate-barSweep rounded-full bg-gradient-to-r from-brand-300 to-amber-300 motion-reduce:animate-none" />
        </div>

        <p className="mt-4 text-xs font-medium text-white/45">{label}</p>
      </div>
    </motion.div>
  )
}
