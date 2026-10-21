import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  X,
  Building2,
  ShoppingBag,
  MapPin,
  Clock,
  Minus,
  Plus,
  Receipt,
  Star,
  SearchX,
  UtensilsCrossed,
  ArrowRight,
} from 'lucide-react'
import { fetchMenu, fetchOrder, placeOrder } from '../api'
import type { MenuResponse, Order, KisiniaCartLine, KisiniaConfig } from '../types'
import { getIcon } from '../icons'
import { money } from '../utils'
import { quoteKisinia, kisiniaKey, KISINIA_ID, picksSummary } from '../kisinia'
import DishCard from '../components/DishCard'
import DishImage from '../components/DishImage'
import KisiniaBuilder from '../components/KisiniaBuilder'
import OrderTracker from '../components/OrderTracker'
import ReceiptModal from '../components/ReceiptModal'
import TablePicker from '../components/TablePicker'
import { Sheet } from '../components/TablePicker'
import { toast, ToastHost, EmptyState } from '../components/Toasts'

const CART_KEY = 'savor.cart'
const TABLE_KEY = 'savor.table'
const HISTORY_KEY = 'savor.history'
const KISINIA_CART_KEY = 'savor.kisinia'

export default function CustomerPage() {
  const [menu, setMenu] = useState<MenuResponse | null>(null)
  const [error, setError] = useState('')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '{}')
    } catch {
      return {}
    }
  })
  const [kisCart, setKisCart] = useState<Record<string, KisiniaCartLine>>(() => {
    try {
      return JSON.parse(localStorage.getItem(KISINIA_CART_KEY) || '{}')
    } catch {
      return {}
    }
  })
  const [kisOpen, setKisOpen] = useState(false)
  const [table, setTable] = useState<number | null>(() => {
    const t = Number(localStorage.getItem(TABLE_KEY))
    return Number.isFinite(t) && t > 0 ? t : null
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [activeOrder, setActiveOrder] = useState<Order | null>(null)
  const [history, setHistory] = useState<Order[]>([])
  const [receipt, setReceipt] = useState<Order | null>(null)

  useEffect(() => {
    fetchMenu().then(setMenu).catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem(KISINIA_CART_KEY, JSON.stringify(kisCart))
  }, [kisCart])

  useEffect(() => {
    if (table) localStorage.setItem(TABLE_KEY, String(table))
  }, [table])

  // Load order history
  useEffect(() => {
    let codes: string[] = []
    try {
      codes = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
    } catch {
      codes = []
    }
    if (codes.length === 0) return
    Promise.all(codes.map((c) => fetchOrder(c).catch(() => null)))
      .then((orders) => setHistory(orders.filter((o): o is Order => Boolean(o))))
      .catch(() => {})
  }, [])

  // Live menu updates + order tracking
  useEffect(() => {
    let mounted = true
    const tickMenu = async () => {
      try {
        const m = await fetchMenu()
        if (mounted) setMenu(m)
      } catch {}
    }
    tickMenu()
    const tm = setInterval(tickMenu, 12000)
    return () => {
      mounted = false
      clearInterval(tm)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const tick = async () => {
      if (!activeOrder) return
      try {
        const o = await fetchOrder(activeOrder.code)
        if (mounted) setActiveOrder(o)
      } catch {}
    }
    tick()
    const t = setInterval(tick, 5000)
    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [activeOrder])

  const currency = menu?.restaurant.currency ?? 'TSh'
  const tables = menu?.restaurant.tables ?? 24

  const visible = useMemo(() => {
    if (!menu) return []
    return menu.items.filter((i) => {
      if (!i.available) return false
      const inCat = category === 'all' || i.category === category
      const q = query.trim().toLowerCase()
      const inQuery =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q))
      return inCat && inQuery
    })
  }, [menu, category, query])

  // Group dishes by category for sectioned display
  const sections = useMemo(() => {
    if (!menu) return []
    if (category !== 'all') {
      const cat = menu.categories.find((c) => c.id === category)
      return cat ? [{ cat, items: visible }] : []
    }
    return menu.categories
      .map((cat) => ({ cat, items: visible.filter((i) => i.category === cat.id) }))
      .filter((s) => s.items.length > 0)
  }, [menu, visible, category])

  const count =
    Object.values(cart).reduce((a, b) => a + b, 0) +
    Object.values(kisCart).reduce((a, l) => a + l.qty, 0)

  const kisSubtotal = useMemo(
    () =>
      Object.values(kisCart).reduce((sum, line) => {
        const q = quoteKisinia(menu?.kisinia, line.sizeId, line.picks)
        return q ? sum + q.unitPrice * line.qty : sum
      }, 0),
    [kisCart, menu?.kisinia]
  )

  const subtotal = useMemo(() => {
    if (!menu) return 0
    const map = new Map(menu.items.map((i) => [i.id, i.price]))
    return (
      Object.entries(cart).reduce((s, [id, qty]) => s + (map.get(id) ?? 0) * qty, 0) +
      kisSubtotal
    )
  }, [cart, menu, kisSubtotal])

  const inc = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }))
  const dec = (id: string) =>
    setCart((c) => {
      const next = { ...c }
      const q = (next[id] ?? 0) - 1
      if (q <= 0) delete next[id]
      else next[id] = q
      return next
    })

  const addKisinia = (line: KisiniaCartLine) => {
    const key = kisiniaKey(line.sizeId, line.picks)
    if (!key) return
    setKisCart((k) => ({
      ...k,
      [key]: { ...line, qty: (k[key]?.qty ?? 0) + line.qty },
    }))
    toast('Kisinia platter added to cart', 'success')
  }
  const incKis = (key: string) =>
    setKisCart((k) => (k[key] ? { ...k, [key]: { ...k[key], qty: k[key].qty + 1 } } : k))
  const decKis = (key: string) =>
    setKisCart((k) => {
      const next = { ...k }
      if (!next[key]) return k
      const q = next[key].qty - 1
      if (q <= 0) delete next[key]
      else next[key] = { ...next[key], qty: q }
      return next
    })

  const clear = () => {
    setCart({})
    setKisCart({})
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-sm p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <SearchX className="h-7 w-7" />
          </div>
          <p className="mt-4 text-ink-700">{error}</p>
          <button onClick={() => location.reload()} className="btn-primary mt-5">
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-28">
      {/* ============ HEADER ============ */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Brand */}
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand">
                <ShoppingBag className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 leading-none">
                <h1 className="font-display truncate text-[15px] font-extrabold tracking-tight text-ink-900 sm:text-[17px]">
                  {menu?.restaurant.name ?? 'Food Point'}
                </h1>
                <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-ink-500">
                  <MapPin className="h-3 w-3 shrink-0 text-brand-500" />
                  <span className="truncate">
                    {menu?.restaurant.tagline ?? 'Dar es Salaam'}
                  </span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                onClick={() => setHistoryOpen(true)}
                className="btn-ghost relative px-3 text-sm sm:px-4"
              >
                <Receipt className="h-4 w-4" />
                <span className="hidden sm:inline">My orders</span>
                {history.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    {history.length}
                  </span>
                )}
              </button>
              <a
                href="#/office"
                className="btn-ghost hidden px-4 text-sm sm:inline-flex"
                title="Office dashboard"
              >
                <Building2 className="h-4 w-4" />
                <span>Office</span>
              </a>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 transition focus-within:border-brand-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-100">
            <Search className="h-4 w-4 shrink-0 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pilau, chips mayai, kachumbari…"
              className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="shrink-0 text-ink-400 hover:text-ink-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="hide-scroll -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-0.5">
            <CatChip active={category === 'all'} onClick={() => setCategory('all')} label="All" />
            {menu?.categories.map((c) => {
              const Icon = getIcon(c.icon)
              return (
                <CatChip
                  key={c.id}
                  active={category === c.id}
                  onClick={() => setCategory(c.id)}
                  label={c.name}
                  icon={<Icon className="h-3.5 w-3.5" />}
                />
              )
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* ============ HERO ============ */}
        {!query && category === 'all' && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 p-5 sm:p-8">
              <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 right-1/3 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative max-w-lg">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur">
                  <Clock className="h-3 w-3" /> Open now · 08:00 – 23:00
                </span>
                <h2 className="font-display mt-3 text-xl font-extrabold leading-tight text-white sm:text-2xl md:text-3xl">
                  Karibu Food Point.
                  <br />
                  Authentic Tanzanian kitchen.
                </h2>
                <p className="mt-2 max-w-md text-[13px] leading-relaxed text-white/85 sm:text-sm">
                  Order from your table — nyama choma, pilau, chips mayai and more.
                  Freshly prepared, delivered to your seat.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] font-semibold text-white/90">
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-white text-white" /> 4.8 rating
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> 15–25 min
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Mikocheni B
                  </span>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* ============ KISINIA ENTRY ============ */}
        {menu?.kisinia?.enabled && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            onClick={() => setKisOpen(true)}
            className="group relative mt-4 flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-brand-200 bg-white p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-5"
          >
            <span className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-brand-100/80 to-transparent" />
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-brand-500 text-white shadow-brand sm:h-16 sm:w-16">
              <UtensilsCrossed className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-extrabold text-ink-900 sm:text-lg">
                  {menu.kisinia.title}
                </span>
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Shared platter
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[12.5px] text-ink-500">
                {menu.kisinia.blurb}
              </span>
              <span className="mt-1 block text-[12px] font-bold text-brand-600">
                From {money(currency, Math.min(...menu.kisinia.sizes.map((s) => s.price)))} ·{' '}
                {menu.kisinia.sizes.map((s) => s.name).join(' · ')}
              </span>
            </span>
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-transform group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4" />
            </span>
          </motion.button>
        )}

        {/* ============ TRACKER ============ */}
        {activeOrder && (
          <section className="mt-6">
            <OrderTracker
              order={activeOrder}
              currency={currency}
              onDismiss={() => setActiveOrder(null)}
              onViewReceipt={() => setReceipt(activeOrder)}
            />
          </section>
        )}

        {/* ============ MENU ============ */}
        {!menu ? (
          <GridSkeleton />
        ) : sections.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-ink-400">
              <SearchX className="h-7 w-7" />
            </div>
            <p className="text-ink-500">No dishes match your search.</p>
            <button
              onClick={() => {
                setQuery('')
                setCategory('all')
              }}
              className="btn-ghost"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-8 pb-4">
            {sections.map(({ cat, items }) => {
              const CatIcon = getIcon(cat.icon)
              return (
                <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-40">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <CatIcon className="h-4 w-4" />
                    </span>
                    <h2 className="font-display text-lg font-extrabold text-ink-900">
                      {cat.name}
                    </h2>
                    <span className="ml-auto text-[12px] font-semibold text-ink-400">
                      {items.length} items
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                    {items.map((item) => (
                      <DishCard
                        key={item.id}
                        item={item}
                        qty={cart[item.id] ?? 0}
                        currency={currency}
                        onAdd={() => inc(item.id)}
                        onRemove={() => dec(item.id)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>

      {/* ============ STICKY CART BAR ============ */}
      <AnimatePresence>
        {count > 0 && !cartOpen && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-700/40 bg-brand-600 pb-[env(safe-area-inset-bottom)]"
          >
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-sm font-black text-white animate-pop">
                {count}
              </span>
              <button
                onClick={() => setCartOpen(true)}
                className="flex-1 text-left text-white"
              >
                <span className="text-[13px] font-semibold">View cart</span>
                <span className="block text-[15px] font-extrabold">
                  {money(currency, subtotal)}
                </span>
              </button>
              <button
                onClick={() => setCartOpen(true)}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-700 shadow-sm transition hover:bg-brand-50 active:scale-95"
              >
                Checkout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ KISINIA BUILDER ============ */}
      {menu?.kisinia && (
        <KisiniaBuilder
          open={kisOpen}
          onClose={() => setKisOpen(false)}
          config={menu.kisinia}
          currency={currency}
          onAdd={addKisinia}
        />
      )}

      {/* ============ CART SHEET ============ */}
      <CartSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        kisCart={kisCart}
        menu={menu}
        currency={currency}
        tables={tables}
        table={table}
        setTable={setTable}
        inc={inc}
        dec={dec}
        incKis={incKis}
        decKis={decKis}
        clear={clear}
        onPlaced={(o) => {
          const codes = [o.code, ...history.map((h) => h.code)].slice(0, 20)
          localStorage.setItem(HISTORY_KEY, JSON.stringify(codes))
          setHistory((prev) => [o, ...prev])
          setActiveOrder(o)
        }}
      />

      {/* ============ HISTORY SHEET ============ */}
      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="My orders">
        {history.length === 0 ? (
          <EmptyState>
            No orders yet. Your past and current orders will appear here.
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-3 p-5">
            {history.map((o) => (
              <button
                key={o.code}
                onClick={() => {
                  setActiveOrder(o)
                  setHistoryOpen(false)
                }}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition hover:border-brand-300 hover:shadow-card"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-extrabold text-ink-900">{o.code}</p>
                  <p className="text-[12px] text-ink-500">
                    Table {o.table} · {o.items.length} items ·{' '}
                    {new Date(o.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </p>
                </div>
                <span className="font-display text-sm font-extrabold text-brand-600">
                  {money(currency, o.total)}
                </span>
              </button>
            ))}
            <button onClick={() => setHistoryOpen(false)} className="btn-ghost mt-2 w-full">
              Close
            </button>
          </div>
        )}
      </Sheet>

      {/* ============ RECEIPT ============ */}
      <ReceiptModal order={receipt} currency={currency} onClose={() => setReceipt(null)} />

      <ToastHost />
    </div>
  )
}

function CatChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`tab-pill ${active ? 'tab-active' : 'tab-idle'} py-1.5 text-[13px]`}
    >
      {icon}
      {label}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Cart sheet                                                         */
/* ------------------------------------------------------------------ */
function CartSheet({
  open,
  onClose,
  cart,
  kisCart,
  menu,
  currency,
  tables,
  table,
  setTable,
  inc,
  dec,
  incKis,
  decKis,
  clear,
  onPlaced,
}: {
  open: boolean
  onClose: () => void
  cart: Record<string, number>
  kisCart: Record<string, KisiniaCartLine>
  menu: MenuResponse | null
  currency: string
  tables: number
  table: number | null
  setTable: (n: number) => void
  inc: (id: string) => void
  dec: (id: string) => void
  incKis: (key: string) => void
  decKis: (key: string) => void
  clear: () => void
  onPlaced: (o: Order) => void
}) {
  const [customer, setCustomer] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [lineNotes, setLineNotes] = useState<Record<string, string>>({})

  const drinkCats = useMemo(
    () =>
      new Set(
        (menu?.categories ?? [])
          .filter((c) => /drink|soda|beverage|vinywaji|vinwaji/i.test(c.id + ' ' + c.name))
          .map((c) => c.id)
      ),
    [menu]
  )
  const setLineNote = (id: string, v: string) => setLineNotes((n) => ({ ...n, [id]: v }))

  const lines = useMemo(() => {
    const map = new Map((menu?.items ?? []).map((i) => [i.id, i]))
    return Object.entries(cart)
      .map(([id, qty]) => ({ item: map.get(id), qty }))
      .filter((l): l is { item: NonNullable<ReturnType<Map<string, any>['get']>>; qty: number } =>
        Boolean(l.item)
      )
  }, [cart, menu])

  const kisLines = useMemo(() => {
    const cfg = menu?.kisinia
    if (!cfg) return []
    return Object.entries(kisCart)
      .map(([key, line]) => ({
        key,
        line,
        quote: quoteKisinia(cfg, line.sizeId, line.picks),
      }))
      .filter((l): l is { key: string; line: KisiniaCartLine; quote: NonNullable<ReturnType<typeof quoteKisinia>> } =>
        Boolean(l.quote)
      )
  }, [kisCart, menu?.kisinia])

  const subtotal =
    lines.reduce((s, l) => s + l.item.price * l.qty, 0) +
    kisLines.reduce((s, l) => s + l.quote.unitPrice * l.line.qty, 0)
  const service = Math.round(subtotal * 0.05)
  const total = subtotal + service

  async function submit() {
    if (!table) return toast('Please select your table first', 'error')
    if (lines.length === 0 && kisLines.length === 0)
      return toast('Your cart is empty', 'error')
    setBusy(true)
    try {
      const order = await placeOrder({
        table,
        customer: customer.trim() || 'Guest',
        items: [
          ...lines.map((l) => ({
            id: l.item.id,
            qty: l.qty,
            note: (lineNotes[l.item.id] || '').trim() || undefined,
          })),
          ...kisLines.map((l) => ({
            id: KISINIA_ID,
            sizeId: l.line.sizeId,
            picks: l.line.picks,
            qty: l.line.qty,
          })),
        ],
        note: note.trim(),
      })
      clear()
      setCustomer('')
      setNote('')
      setLineNotes({})
      toast(`Order ${order.code} sent to the kitchen!`, 'success')
      onPlaced(order)
      onClose()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Something went wrong', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Your order">
      <div className="flex flex-col gap-5 p-5">
        {lines.length === 0 && kisLines.length === 0 ? (
          <EmptyState>Your cart is empty. Add something tasty.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {kisLines.map(({ key, line, quote }) => (
              <li
                key={key}
                className="flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50/50 p-2.5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-700 to-brand-500 text-white">
                  <UtensilsCrossed className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-ink-900">
                    {menu?.kisinia?.title ?? 'Kisinia'} · {quote.sizeName}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-500">
                    {quote.picks.length
                      ? picksSummary(menu?.kisinia?.components ?? [], line.picks)
                      : "Kitchen's choice"}
                  </p>
                  <p className="mt-0.5 text-[12px] font-semibold text-brand-600">
                    {money(currency, quote.unitPrice)} each
                    {quote.overflow > 0 && (
                      <span className="ml-1.5 text-ink-400">
                        (+{money(currency, quote.overflow)} extra picks)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-brand-200 bg-white p-0.5">
                  <button
                    onClick={() => decKis(key)}
                    aria-label="Decrease platters"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-600"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-ink-900">{line.qty}</span>
                  <button
                    onClick={() => incKis(key)}
                    aria-label="Increase platters"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="w-16 shrink-0 text-right text-[12px] font-extrabold text-ink-900 sm:w-20 sm:text-[13px]">
                  {money(currency, quote.unitPrice * line.qty)}
                </span>
              </li>
            ))}

            {lines.map(({ item, qty }) => {
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm"
                >
                  <DishImage
                    src={item.image}
                    icon={item.icon}
                    gradient={item.gradient}
                    alt={item.name}
                    iconSize="h-5 w-5"
                    className="h-12 w-12 shrink-0 rounded-xl sm:h-14 sm:w-14"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink-900">{item.name}</p>
                    <p className="text-[12px] font-semibold text-brand-600">
                      {money(currency, item.price)}
                    </p>
                    {drinkCats.has(item.category) && (
                      <div className="mt-1.5">
                        <input
                          value={lineNotes[item.id] ?? ''}
                          onChange={(e) => setLineNote(item.id, e.target.value)}
                          placeholder="Which soda? e.g. Coca-Cola, Fanta, Sprite…"
                          aria-label={`Soda preference for ${item.name}`}
                          className="input py-1.5 text-[11.5px]"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      onClick={() => dec(item.id)}
                      aria-label="Decrease"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-600 transition hover:bg-white hover:text-brand-600"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold text-ink-900">{qty}</span>
                    <button
                      onClick={() => inc(item.id)}
                      aria-label="Increase"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-600 transition hover:bg-white hover:text-brand-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="w-16 shrink-0 text-right text-[12px] font-extrabold text-ink-900 sm:w-20 sm:text-[13px]">
                    {money(currency, item.price * qty)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Table number
          </label>
          <TablePicker tables={tables} value={table} onChange={setTable} />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Your name (optional)
          </label>
          <input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="e.g. Amina"
            className="input"
          />
          <label className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-ink-400">
            Notes for the kitchen
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="No chilli, extra kachumbari…"
            className="input resize-none"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <Row label="Subtotal" value={money(currency, subtotal)} />
          <Row label="Service (5%)" value={money(currency, service)} />
          <div className="my-2 border-t border-dashed border-slate-300" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink-900">Total</span>
            <span className="font-display text-xl font-extrabold text-brand-600">
              {money(currency, total)}
            </span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-slate-100 bg-white/95 p-4 backdrop-blur-xl">
        <button
          onClick={submit}
          disabled={busy || (lines.length === 0 && kisLines.length === 0)}
          className="btn-primary w-full px-3 py-3.5 text-[13px] sm:text-base"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Sending…
            </>
          ) : table ? (
            <>
              Place order · Table {table} · {money(currency, total)}
            </>
          ) : (
            <>Select a table to continue</>
          )}
        </button>
      </div>
    </Sheet>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="text-sm font-semibold text-ink-800">{value}</span>
    </div>
  )
}

function GridSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="relative h-64 overflow-hidden rounded-2xl bg-white shadow-card">
          <div className="h-40 bg-slate-100" />
          <div className="space-y-2 p-3.5">
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-3 w-full rounded bg-slate-50" />
            <div className="h-3 w-4/5 rounded bg-slate-50" />
          </div>
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        </div>
      ))}
    </div>
  )
}
