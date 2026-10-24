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

/** Full-screen Willis Lounge loading screen with logo. */
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
        {/* Logo */}
        <img
          src="/logo/logoo.png"
          alt=""
          className="h-28 w auto object-contain"
          draggable={false}
        />

        {/* Wordmark */}
        <h1 className="mt-5 font-['Sora'] text-[22px] font-extrabold tracking-tight text-white motion-reduce:animate-none sm:text-[28px]">
          WILLIS LOUNGE
        </h1>
        <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-brand-100/60">
          Bar &amp; Grill · Sinza Mapambano
        </p>

        {/* Progress shimmer */}
        <div className="mt-6 h-1.5 w-44 overflow-hidden rounded-full bg-white/10 sm:w-52">
          <div className="h-full w-2/5 animate-barSweep rounded-full bg-gradient-to-r from-brand-300 to-amber-300 motion-reduce:animate-none" />
        </div>

        <p className="mt-3 text-xs font-medium text-white/45">{label}</p>
      </div>
    </motion.div>
  )
}
