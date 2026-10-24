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

/** Full-screen loading screen: logo on white, no animation flicker. */
export default function Splash({ label = 'Setting the table…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-white"
    >
      <img
        src="/logo/logoo.png"
        alt=""
        className="h-20 w-auto object-contain"
        draggable={false}
      />
    </div>
  )
}
