import { useState } from 'react'
import { getIcon } from '../icons'

export default function DishImage({
  src,
  icon,
  gradient,
  alt,
  className = '',
  iconSize = 'h-14 w-14',
  eager = false,
}: {
  src?: string
  icon: string
  gradient: string
  alt: string
  className?: string
  iconSize?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const Icon = getIcon(icon)
  const showPhoto = src && !failed

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {showPhoto ? (
        <img
          src={src}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
          <Icon className={`relative ${iconSize} text-white/95 drop-shadow-[0_6px_14px_rgba(0,0,0,0.25)]`} strokeWidth={1.5} />
        </div>
      )}
    </div>
  )
}
