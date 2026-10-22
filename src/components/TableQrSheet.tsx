import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Download, Printer, QrCode, X } from 'lucide-react'
import { Sheet } from './TablePicker'

export default function TableQrSheet({
  open,
  onClose,
  tables,
  baseUrl,
}: {
  open: boolean
  onClose: () => void
  tables: number
  baseUrl: string
}) {
  const [codes, setCodes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || tables <= 0) return
    let cancelled = false
    setLoading(true)
    const list = Array.from({ length: tables }, (_, i) => i + 1)
    Promise.all(
      list.map(async (t) => {
        const url = `${baseUrl}/?table=${t}`
        const data = await QRCode.toDataURL(url, { width: 512, margin: 2 })
        return [t, data] as const
      })
    )
      .then((entries) => {
        if (cancelled) return
        setCodes(Object.fromEntries(entries))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, tables, baseUrl])

  const download = (t: number) => {
    const data = codes[t]
    if (!data) return
    const a = document.createElement('a')
    a.href = data
    a.download = `willis-lounge-table-${t}.png`
    a.click()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Table QR codes">
      <div className="flex flex-col gap-4 p-5">
        <div className="no-print flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
          <p className="text-[12px] text-ink-600">
            Print these and place them on the tables. Scanning opens the menu pre-set to that table.
          </p>
          <button onClick={() => window.print()} className="btn-primary shrink-0">
            <Printer className="h-4 w-4" /> Print all
          </button>
        </div>

        {loading && <p className="text-sm text-ink-500">Generating QR codes…</p>}

        <div className="print-area grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: tables }, (_, i) => i + 1).map((t) => (
            <div
              key={t}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-center"
            >
              <p className="font-display text-base font-extrabold text-ink-900">Table {t}</p>
              {codes[t] ? (
                <img
                  src={codes[t]}
                  alt={`QR code for table ${t}`}
                  className="h-28 w-28 rounded-lg border border-slate-100"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-slate-100 text-ink-300">
                  <QrCode className="h-8 w-8" />
                </div>
              )}
              <p className="text-[10px] font-medium text-ink-400">Scan to order</p>
              <button
                onClick={() => download(t)}
                className="no-print inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700"
              >
                <Download className="h-3.5 w-3.5" /> PNG
              </button>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="btn-ghost no-print w-full">
          Close
        </button>
      </div>
    </Sheet>
  )
}
