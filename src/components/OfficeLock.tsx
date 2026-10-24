import { useEffect, useState } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { getOfficeKey, setOfficeKey, verifyOfficeKey } from '../api'
import { hideBootSplash } from './Splash'

export default function OfficeLock({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => hideBootSplash(), [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    const candidate = value.trim()
    if (!candidate) {
      setError('Enter the staff key.')
      return
    }
    const previous = getOfficeKey()
    setBusy(true)
    setError('')
    setOfficeKey(candidate)
    const ok = await verifyOfficeKey()
    setBusy(false)
    if (ok) {
      onUnlock()
    } else {
      setOfficeKey(previous)
      setError('That key is not valid. Try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={submit}
        className="card w-full max-w-sm p-8 text-center shadow-card"
      >
        <img
          src="/logo/logoo.png"
          alt=""
          className="mx-auto h-14 w-auto object-contain"
          draggable={false}
        />
        <h1 className="font-display mt-4 text-xl font-extrabold text-ink-900">Staff access</h1>
        <p className="mt-1 text-[13px] text-ink-500">
          Enter the office key to open the Willis Lounge dashboard.
        </p>

        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Office key"
          autoFocus
          className="input mt-5 text-center"
        />

        {error && <p className="mt-2 text-[12px] font-semibold text-rose-600">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-4 w-full">
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Unlocking…
            </>
          ) : (
            'Unlock office'
          )}
        </button>
      </form>
    </div>
  )
}
