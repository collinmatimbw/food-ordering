import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fetchMenu, fetchOrders, getOfficeKey, setOfficeKey, updateOrderStatus } from '../api'
import type { MenuResponse, Order, OrderStatus } from '../types'
import { STATUS_META, StatusPill } from '../components/StatusPill'
import { TableBadge, OrderSourceBadge } from '../components/TablePicker'
import { toast, ToastHost } from '../components/Toasts'
import MenuManager from '../components/MenuManager'
import KisiniaManager from '../components/KisiniaManager'
import OfficeLock from '../components/OfficeLock'
import Splash from '../components/Splash'
import { getIcon } from '../icons'
import { money } from '../utils'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Clock,
  Flame,
  Inbox,
  LayoutGrid,
  List,
  Menu,
  MapPin,
  Phone,
  QrCode,
  ReceiptText,
  Search,
  Sparkles,
  StickyNote,
  Table2,
  TrendingUp,
  Users,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Wallet,
  X,
  Lock,
} from 'lucide-react'
import TableQrSheet from '../components/TableQrSheet'

type ViewKey = 'orders' | 'customers' | 'tables' | 'reports' | 'menu' | 'kisinia'

const COLUMNS: { key: OrderStatus; title: string; icon: string }[] = [
  { key: 'new', title: 'Incoming', icon: 'Inbox' },
  { key: 'preparing', title: 'In the kitchen', icon: 'ChefHat' },
  { key: 'ready', title: 'Ready to serve', icon: 'BellRing' },
  { key: 'delivered', title: 'Completed', icon: 'CheckCircle2' },
]

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  new: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  new: 'Accept & cook',
  preparing: 'Mark ready',
  ready: 'Mark served',
}

const FLOW: OrderStatus[] = ['new', 'preparing', 'ready', 'delivered']

function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function initials(name: string) {
  const parts = (name || '?').trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

const AVATAR_TINTS = [
  'bg-brand-100 text-brand-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
]

function avatarTint(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return AVATAR_TINTS[h % AVATAR_TINTS.length]
}

export default function OfficePage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [unlocked, setUnlocked] = useState(() => Boolean(getOfficeKey()))
  const [currency, setCurrency] = useState('$')
  const [loading, setLoading] = useState(true)
  const [sound, setSound] = useState(true)
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')
  const [view, setView] = useState<ViewKey>('orders')
  const [menu, setMenu] = useState<MenuResponse | null>(null)
  const [ordersView, setOrdersView] = useState<'kanban' | 'list'>('list')
  const [search, setSearch] = useState('')
  const [tableFilter, setTableFilter] = useState<number | 'all'>('all')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'all'>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrBaseUrl] = useState(() => {
    if (typeof window === 'undefined') return ''
    const origin = window.location.origin
    return origin.includes('localhost') ? 'https://food-ordering-sigma-ashen.vercel.app' : origin
  })
  const seen = useRef<Set<string>>(new Set())
  const soundRef = useRef(sound)
  soundRef.current = sound

  useEffect(() => {
    if (!unlocked) return
    Promise.all([fetchOrders(), fetchMenu()])
      .then(([o, m]) => {
        setOrders(o)
        setMenu(m)
        setCurrency(m.restaurant.currency)
        o.forEach((x) => seen.current.add(x.code))
      })
      .catch(() => toast('Failed to load orders', 'error'))
      .finally(() => setLoading(false))
  }, [unlocked])

  useEffect(() => {
    if (!unlocked) return
    let mounted = true
    const tick = async () => {
      try {
        const list = await fetchOrders()
        if (!mounted) return
        const incoming = Array.isArray(list) ? list : []
        setOrders((prev) => {
          const next: Order[] = []
          for (const o of incoming) {
            const old = prev.find((x) => x.code === o.code)
            if (old && old.status !== o.status && !seen.current.has(o.code + ':' + o.status)) {
              // mark seen by status change to avoid repeat; simpler track
            }
            if (!seen.current.has(o.code)) {
              if (old) {
                /* update */
              } else {
                seen.current.add(o.code)
                if (soundRef.current) beep()
                toast(`New order ${o.code} · Table ${o.table}`, 'info')
              }
            } else {
              if (old && old.status !== o.status && o.status === 'ready' && soundRef.current) {
                try {
                  beep()
                } catch {}
              }
            }
            next.push(o)
          }
          return next.sort((a, b) => b.createdAt - a.createdAt)
        })
      } catch {
        /* ignore */
      }
    }
    tick()
    const t = setInterval(tick, 6000)
    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [unlocked])

  useEffect(() => {
    let mounted = true
    const tickMenu = async () => {
      try {
        const m = await fetchMenu()
        if (mounted) setMenu(m)
      } catch {
        /* ignore */
      }
    }
    const t = setInterval(tickMenu, 12000)
    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [unlocked])

  const [, force] = useState(0)
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 15000)
    return () => clearInterval(t)
  }, [])

  async function move(order: Order, status: OrderStatus) {
    try {
      const updated = await updateOrderStatus(order.code, status)
      setOrders((prev) => prev.map((x) => (x.code === updated.code ? updated : x)))
      toast(`${order.code} updated to ${STATUS_META[status].label}`, 'success')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error')
    }
  }

  const startOfDay = useMemo(() => new Date().setHours(0, 0, 0, 0), [orders])
  const startOfWeek = useMemo(() => new Date(Date.now() - 6 * 86400000).setHours(0, 0, 0, 0), [])

  const grouped = useMemo(() => {
    const g: Record<string, Order[]> = { new: [], preparing: [], ready: [], delivered: [] }
    for (const o of orders) {
      if (filter !== 'all' && o.status !== filter) continue
      if (g[o.status]) g[o.status].push(o)
    }
    return g
  }, [orders, filter])

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (dateRange === 'today' && o.createdAt < startOfDay) return false
      if (dateRange === 'week' && o.createdAt < startOfWeek) return false
      if (tableFilter !== 'all' && o.table !== tableFilter) return false
      if (view === 'orders' && filter !== 'all' && o.status !== filter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${o.code} ${o.customer} ${o.note || ''} ${o.phone || ''} ${o.address || ''} ${
          o.table ?? ''
        }`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [orders, dateRange, tableFilter, view, filter, search, startOfDay, startOfWeek])

  const groupedFiltered = useMemo(() => {
    const g: Record<string, Order[]> = { new: [], preparing: [], ready: [], delivered: [] }
    for (const o of filteredOrders) {
      if (o.status === 'cancelled') continue
      if (g[o.status]) g[o.status].push(o)
    }
    return g
  }, [filteredOrders])

  const customers = useMemo(() => {
    const map = new Map<string, any>()
    for (const o of orders) {
      const key = (o.customer || 'Guest').trim().toLowerCase()
      if (!map.has(key))
        map.set(key, { name: o.customer || 'Guest', orders: [], total: 0, lastAt: 0, active: 0 })
      const c = map.get(key)
      c.orders.push(o)
      c.total += o.total
      if (o.createdAt > c.lastAt) c.lastAt = o.createdAt
      if (o.status === 'new' || o.status === 'preparing') c.active++
    }
    return Array.from(map.values()).sort((a, b) => b.lastAt - a.lastAt)
  }, [orders])

  const tablesOccupancy = useMemo(() => {
    const m = new Map<number, Order[]>()
    for (const o of orders) {
      if (o.status === 'cancelled' || o.status === 'delivered') continue
      if (o.table == null) continue
      if (!m.has(o.table)) m.set(o.table, [])
      m.get(o.table)!.push(o)
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0])
  }, [orders])

  const reports = useMemo(() => {
    const all = orders.filter((o) => o.status !== 'cancelled')
    const todayOrders = all.filter((o) => o.createdAt >= startOfDay)
    const weekOrders = all.filter((o) => o.createdAt >= startOfWeek)
    const revenueToday = todayOrders.reduce((s, o) => s + o.total, 0)
    const revenueWeek = weekOrders.reduce((s, o) => s + o.total, 0)
    const revenueAll = all.reduce((s, o) => s + o.total, 0)
    const byStatus: Record<OrderStatus, number> = { new: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 }
    for (const o of all) byStatus[o.status]++
    const itemMap = new Map<string, { qty: number; rev: number }>()
    for (const o of all) {
      for (const it of o.items) {
        const key = it.name
        const cur = itemMap.get(key) || { qty: 0, rev: 0 }
        cur.qty += it.qty
        cur.rev += it.price * it.qty
        itemMap.set(key, cur)
      }
    }
    const topItems = Array.from(itemMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
    const hours = Array.from({ length: 24 }, () => 0)
    for (const o of todayOrders) hours[new Date(o.createdAt).getHours()]++
    return { revenueToday, revenueWeek, revenueAll, byStatus, topItems, hours, todayCount: todayOrders.length, weekCount: weekOrders.length, allCount: all.length }
  }, [orders, startOfDay, startOfWeek])

  const openCount = orders.filter((o) => o.status === 'new' || o.status === 'preparing').length
  const todayCount = orders.filter((o) => o.createdAt >= startOfDay && o.status !== 'cancelled').length
  const revenueTodayAll = orders.filter((o) => o.createdAt >= startOfDay && o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)

  const navItems = [
    { key: 'orders', label: 'Orders', icon: LayoutGrid, count: openCount },
    { key: 'customers', label: 'Customers', icon: Users, count: customers.length },
    { key: 'tables', label: 'Tables', icon: Table2, count: tablesOccupancy.length },
    { key: 'reports', label: 'Reports', icon: BarChart3, count: 0 },
    { key: 'menu', label: 'Menu Manager', icon: BookOpen, count: menu?.items.length ?? 0 },
    { key: 'kisinia', label: 'Kisinia', icon: UtensilsCrossed, count: menu?.kisinia?.components.length ?? 0 },
  ] as const

  const viewMeta: Record<ViewKey, { title: string; sub: string }> = {
    orders: { title: 'Orders', sub: 'Live operations · incoming tickets in real time' },
    customers: { title: 'Customers', sub: 'Everyone who has ordered, at a glance' },
    tables: { title: 'Tables', sub: 'Floor occupancy and running totals' },
    reports: { title: 'Reports', sub: 'Sales snapshot and best sellers' },
    menu: { title: 'Menu Manager', sub: 'Add, edit and curate the customer menu' },
    kisinia: { title: 'Kisinia', sub: 'Platter builder sizes and components' },
  }

  const totalTables = menu?.restaurant.tables ?? 0
  const occupied = tablesOccupancy.length
  const occupancyPct = totalTables ? Math.min(100, Math.round((occupied / totalTables) * 100)) : 0
  const repeatCount = customers.filter((c: any) => c.orders.length > 1).length
  const avgSpend = customers.length ? customers.reduce((s: number, c: any) => s + c.total, 0) / customers.length : 0
  const maxHour = Math.max(1, ...reports.hours)
  const topQty = Math.max(1, ...reports.topItems.map((i) => i.qty))
  const statusTotal = Math.max(1, Object.values(reports.byStatus).reduce((s, n) => s + n, 0))
  const filtersActive =
    search.trim() !== '' || dateRange !== 'all' || tableFilter !== 'all' || filter !== 'all'

  function clearFilters() {
    setSearch('')
    setTableFilter('all')
    setDateRange('all')
    setFilter('all')
  }

  const sidebar = (
    <SidebarContent
      view={view}
      onNavigate={(k) => {
        setView(k)
        setNavOpen(false)
      }}
      nav={navItems as any}
      sound={sound}
      onToggleSound={() => setSound((s) => !s)}
      onLock={() => {
        setOfficeKey('')
        setUnlocked(false)
      }}
      openCount={openCount}
    />
  )

  if (!unlocked) return <OfficeLock onUnlock={() => setUnlocked(true)} />

  return (
    <div className="min-h-screen">
      {/* ============ LOADING SPLASH ============ */}
      <AnimatePresence>
        {loading && <Splash key="office-splash" label="Opening the office…" />}
      </AnimatePresence>

      {/* Ambient background décor */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-8%] h-[26rem] w-[26rem] rounded-full bg-brand-100/50 blur-3xl" />
        <div className="absolute bottom-[-25%] left-[-10%] h-[24rem] w-[24rem] rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute left-[35%] top-[45%] h-[18rem] w-[18rem] rounded-full bg-sky-100/30 blur-3xl" />
      </div>

      <div className="mx-auto flex w-full max-w-[1720px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">{sidebar}</aside>

        {/* Mobile slide-over nav */}
        <AnimatePresence>
          {navOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setNavOpen(false)}
                className="fixed inset-0 z-40 bg-ink-900/50 backdrop-blur-sm lg:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="fixed inset-y-0 left-0 z-50 lg:hidden"
              >
                {sidebar}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile top bar */}
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden">
            <button
              onClick={() => setNavOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-brand transition active:scale-95"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              <p className="truncate font-display text-sm font-semibold text-ink-900">
                {viewMeta[view].title}
              </p>
            </div>
            <a
              href="#/"
              aria-label="Customer view"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
            >
              <UtensilsCrossed className="h-4 w-4" />
            </a>
          </header>

          {/* Page header */}
          <header className="sticky top-0 z-20 hidden border-b border-slate-200/60 bg-[#F6F7F9]/85 px-6 py-4 backdrop-blur-xl lg:block xl:px-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-brand-600">
                  Willis Lounge · Office
                </p>
                <h1 className="font-display mt-0.5 text-[26px] font-light leading-tight text-ink-900">
                  {viewMeta[view].title}
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <span className="chip border border-brand-200 bg-white text-brand-700 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
                  </span>
                  Live sync
                </span>
                <span className="chip border border-slate-200 bg-white text-ink-500 shadow-sm">
                  <CalendarDays className="h-3.5 w-3.5 text-ink-400" />
                  {new Date().toLocaleDateString(undefined, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
                <a
                  href="#/"
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-black active:scale-95"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Customer view
                </a>
              </div>
            </div>
          </header>

          {/* KPI strip */}
          <section className="px-4 pt-5 sm:px-6 lg:px-6 xl:px-10">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiCard
                icon={Inbox}
                label="Open orders"
                value={String(openCount)}
                hint="need attention"
                tone="brand"
              />
              <KpiCard
                icon={ReceiptText}
                label="Today's orders"
                value={String(todayCount)}
                hint="since midnight"
                tone="sky"
              />
              <KpiCard
                icon={Wallet}
                label="Today's revenue"
                value={money(currency, revenueTodayAll)}
                hint="excl. cancelled"
                tone="emerald"
              />
              <KpiCard
                icon={TrendingUp}
                label="Avg. ticket"
                value={money(currency, todayCount ? revenueTodayAll / todayCount : 0)}
                hint="per order today"
                tone="amber"
              />
            </div>
          </section>

          {/* ============ ORDERS ============ */}
          {view === 'orders' ? (
            <main className="px-4 pb-16 pt-5 sm:px-6 lg:px-6 xl:px-10">
              {/* Toolbar */}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-card backdrop-blur xl:flex-row xl:items-center">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search order #, customer, note…"
                      aria-label="Search orders"
                      className="input py-2.5 pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    {(['today', 'week', 'all'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setDateRange(r)}
                        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${
                          dateRange === r
                            ? 'bg-white text-ink-900 shadow-sm'
                            : 'text-ink-500 hover:text-ink-800'
                        }`}
                      >
                        {r === 'today' ? 'Today' : r === 'week' ? '7 days' : 'All'}
                      </button>
                    ))}
                  </div>
                  <select
                    value={tableFilter === 'all' ? 'all' : String(tableFilter)}
                    onChange={(e) =>
                      setTableFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
                    }
                    aria-label="Filter by table"
                    className="input w-auto py-2.5"
                  >
                    <option value="all">All tables</option>
                    {Array.from({ length: menu?.restaurant.tables || 24 }, (_, i) => i + 1).map(
                      (t) => (
                        <option key={t} value={t}>
                          Table {t}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div className="flex items-center justify-between gap-2 xl:justify-end">
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    {(
                      [
                        { k: 'kanban', label: 'Kanban', Icon: LayoutGrid },
                        { k: 'list', label: 'List', Icon: List },
                      ] as const
                    ).map(({ k, label, Icon }) => (
                      <button
                        key={k}
                        onClick={() => setOrdersView(k)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          ordersView === k
                            ? 'bg-ink-900 text-white shadow-sm'
                            : 'text-ink-500 hover:text-ink-900'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status chips */}
              <div className="hide-scroll mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
                  All ({orders.length})
                </FilterChip>
                {COLUMNS.map((c) => {
                  const ColIcon = getIcon(c.icon)
                  return (
                    <FilterChip
                      key={c.key}
                      active={filter === c.key}
                      onClick={() => setFilter(c.key)}
                    >
                      <ColIcon className="h-4 w-4" /> {c.title} ({groupedFiltered[c.key].length})
                    </FilterChip>
                  )
                })}
                <FilterChip
                  active={filter === 'cancelled'}
                  onClick={() => setFilter('cancelled')}
                >
                  <X className="h-4 w-4" /> Cancelled ({orders.filter((o) => o.status === 'cancelled').length})
                </FilterChip>
                {filtersActive && (
                  <button
                    onClick={clearFilters}
                    className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100"
                  >
                    <X className="h-3.5 w-3.5" /> Clear filters
                  </button>
                )}
              </div>

              {/* Content */}
              {loading ? (
                <div className="mt-4 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-3">
                      <div className="h-9 w-40 animate-pulse rounded-xl bg-slate-200/70" />
                      <div className="h-52 animate-pulse rounded-3xl bg-slate-200/50" />
                    </div>
                  ))}
                </div>
              ) : ordersView === 'kanban' && filter === 'cancelled' ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredOrders.map((order) => (
                    <div key={order.code} onClick={() => setSelectedOrder(order)} className="cursor-pointer">
                      <OrderCard
                        order={order}
                        currency={currency}
                        onAdvance={() => {}}
                        onCancel={() => {}}
                      />
                    </div>
                  ))}
                  {filteredOrders.length === 0 && (
                    <div className="col-span-full flex flex-col items-center gap-2 rounded-3xl border border-dashed border-slate-300 py-14 text-center">
                      <Search className="h-6 w-6 text-slate-300" />
                      <p className="text-sm font-medium text-slate-400">No cancelled orders</p>
                    </div>
                  )}
                </div>
              ) : ordersView === 'kanban' ? (
                <div className="hide-scroll -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 md:grid-cols-2 xl:grid-cols-4 xl:px-0 lg:px-0">
                  {COLUMNS.map((col) => {
                    const ColIcon = getIcon(col.icon)
                    const list = groupedFiltered[col.key]
                    return (
                      <section
                        key={col.key}
                        className="flex w-[82vw] shrink-0 snap-start flex-col gap-3 rounded-3xl bg-slate-100/50 p-2.5 ring-1 ring-slate-200/60 sm:w-auto sm:shrink"
                      >
                        <div className="flex items-center justify-between px-1.5 pt-1">
                          <h2 className="font-display flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                            <ColIcon className="h-4 w-4" /> {col.title}
                          </h2>
                          <span
                            className={`chip border ${STATUS_META[col.key].className}`}
                          >
                            {list.length}
                          </span>
                        </div>

                        <div className="flex flex-col gap-3">
                          <AnimatePresence mode="popLayout">
                            {list.length === 0 ? (
                              <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white/50 py-10 text-center">
                                <Sparkles className="h-4 w-4 text-slate-300" />
                                <p className="text-xs font-medium text-slate-400">No orders here</p>
                              </div>
                            ) : (
                              list.map((order) => (
                                <div
                                  key={order.code}
                                  onClick={() => setSelectedOrder(order)}
                                  className="cursor-pointer"
                                >
                                  <OrderCard
                                    order={order}
                                    currency={currency}
                                    onAdvance={() => {
                                      const next = NEXT[order.status]
                                      if (next) move(order, next)
                                    }}
                                    onCancel={() => move(order, 'cancelled')}
                                  />
                                </div>
                              ))
                            )}
                          </AnimatePresence>
                        </div>
                      </section>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Order</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Table</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Customer</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Items</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Total</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Status</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Time</th>
                          <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders
                          .slice()
                          .sort((a, b) => b.createdAt - a.createdAt)
                          .map((order) => {
                            const next = NEXT[order.status]
                            return (
                              <tr
                                key={order.code}
                                className="group border-b border-slate-50 transition-colors last:border-0 hover:bg-brand-50/40"
                              >
                                <td className="px-5 py-3">
                                  <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="font-display font-extrabold text-ink-900 underline decoration-brand-200 decoration-2 underline-offset-4 transition hover:decoration-brand-500"
                                  >
                                    {order.code}
                                  </button>
                                </td>
                                <td className="px-5 py-3">
                                  <OrderSourceBadge order={order} />
                                </td>
                                <td className="px-5 py-3">
                                  <span className="flex items-center gap-2">
                                    <span
                                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${avatarTint(order.customer)}`}
                                    >
                                      {initials(order.customer)}
                                    </span>
                                    <span className="text-ink-600">{order.customer}</span>
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-ink-500">
                                  <span className="chip border border-slate-200 bg-slate-50">
                                    {order.items.reduce((s, it) => s + it.qty, 0)} items
                                  </span>
                                </td>
                                <td className="px-5 py-3 font-display font-bold tabular-nums text-ink-900">
                                  {money(currency, order.total)}
                                </td>
                                <td className="px-5 py-3">
                                  <StatusPill status={order.status} />
                                </td>
                                <td className="px-5 py-3 text-ink-400">{timeAgo(order.createdAt)}</td>
                                <td className="px-5 py-3">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedOrder(order)}
                                      aria-label="View order"
                                      className="rounded-lg border border-slate-200 p-2 text-ink-500 transition hover:bg-slate-50 active:scale-95"
                                    >
                                      <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                    {next && (
                                      <button
                                        onClick={() => move(order, next)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-ink-900 px-2.5 py-2 text-[11px] font-bold text-white transition hover:bg-black active:scale-95"
                                      >
                                        {NEXT_LABEL[order.status]}
                                      </button>
                                    )}
                                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                      <button
                                        onClick={() => move(order, 'cancelled')}
                                        aria-label="Cancel order"
                                        className="rounded-lg border border-slate-200 p-2 text-ink-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                  {filteredOrders.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-14 text-center">
                      <Search className="h-6 w-6 text-slate-300" />
                      <p className="text-sm font-medium text-slate-400">No orders match these filters</p>
                    </div>
                  )}
                </div>
              )}
            </main>
          ) : view === 'customers' ? (
            <main className="px-4 pb-16 pt-5 sm:px-6 lg:px-6 xl:px-10">
              <div className="mb-4 grid grid-cols-3 gap-3">
                <KpiCard icon={Users} label="Customers" value={String(customers.length)} hint="all time" tone="sky" />
                <KpiCard icon={Activity} label="Repeat" value={String(repeatCount)} hint="2+ orders" tone="brand" />
                <KpiCard icon={Wallet} label="Avg. spend" value={money(currency, avgSpend)} hint="per customer" tone="emerald" />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {customers.map((c: any) => {
                  const last = c.orders.slice().sort((a: Order, b: Order) => b.createdAt - a.createdAt)[0]
                  return (
                    <button
                      key={c.name}
                      onClick={() => {
                        setSearch(c.name)
                        setFilter('all')
                        setView('orders')
                      }}
                      className="card group p-4 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${avatarTint(c.name)}`}
                          >
                            {initials(c.name)}
                          </span>
                          <span className="min-w-0">
                            <p className="truncate font-display font-bold text-ink-900">{c.name}</p>
                            <p className="text-[11px] text-ink-400">
                              {c.orders.length} order(s) · last {timeAgo(c.lastAt)}
                            </p>
                          </span>
                        </div>
                        {c.active > 0 && (
                          <span className="chip shrink-0 border border-brand-200 bg-brand-50 text-brand-700">
                            {c.active} active
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-2.5">
                        <div>
                          <p className="text-[9.5px] font-bold uppercase tracking-widest text-ink-400">Total spent</p>
                          <p className="font-display text-sm font-bold tabular-nums text-ink-900">
                            {money(currency, c.total)}
                          </p>
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-[9.5px] font-bold uppercase tracking-widest text-ink-400">Last order</p>
                          <p className="truncate text-sm font-bold text-ink-900">
                            {last.code} · {money(currency, last.total)}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-brand-600">
                        View all orders
                        <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </p>
                    </button>
                  )
                })}
              </div>
              {customers.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <Users className="h-7 w-7 text-slate-300" />
                  <p className="text-sm text-slate-400">No customers yet — orders will appear here.</p>
                </div>
              )}
            </main>
          ) : view === 'tables' ? (
            <main className="px-4 pb-16 pt-5 sm:px-6 lg:px-6 xl:px-10">
              {totalTables > 0 && (
                <div className="card mb-4 p-4 shadow-card">
                  <div className="grid grid-cols-3 gap-3">
                    <KpiCard icon={Table2} label="Occupied" value={`${occupied}/${totalTables}`} hint="tables in use" tone="brand" />
                    <KpiCard icon={CheckCircle2} label="Available" value={String(Math.max(0, totalTables - occupied))} hint="free now" tone="emerald" />
                    <KpiCard icon={Activity} label="Occupancy" value={`${occupancyPct}%`} hint="of the floor" tone="amber" />
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${occupancyPct}%` }}
                      transition={{ type: 'spring', stiffness: 80, damping: 20 }}
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {Array.from({ length: totalTables || occupied }, (_, i) => i + 1).map((t) => {
                  const list = tablesOccupancy.find(([no]) => no === t)?.[1] ?? []
                  const total = list.reduce((s, o) => s + o.total, 0)
                  if (list.length === 0) {
                    return (
                      <div
                        key={t}
                        className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 bg-white/40 py-6 text-center"
                      >
                        <TableBadge table={t} />
                        <span className="text-[11px] font-medium text-slate-400">Free</span>
                      </div>
                    )
                  }
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setTableFilter(t)
                        setOrdersView('list')
                        setView('orders')
                      }}
                      className="card rounded-2xl border-brand-200 p-3.5 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
                    >
                      <div className="flex items-center justify-between">
                        <TableBadge table={t} />
                        <span className="chip border border-brand-200 bg-brand-50 text-[9px] text-brand-700">
                          {list.length} order{list.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-2.5">
                        <p className="text-[9.5px] font-bold uppercase tracking-widest text-ink-400">Running total</p>
                        <p className="font-display text-base font-bold tabular-nums text-ink-900">
                          {money(currency, total)}
                        </p>
                      </div>
                      <div className="mt-2 flex flex-col gap-1">
                        {list.slice(0, 3).map((o) => (
                          <p key={o.code} className="flex items-center justify-between text-[10.5px] text-ink-500">
                            <span className="font-semibold text-ink-700">{o.code}</span>
                            <span className={o.status === 'new' ? 'text-brand-600' : o.status === 'preparing' ? 'text-amber-600' : 'text-emerald-600'}>
                              {STATUS_META[o.status].label}
                            </span>
                          </p>
                        ))}
                        {list.length > 3 && (
                          <p className="text-[10px] font-semibold text-ink-400">+{list.length - 3} more</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              {totalTables === 0 && occupied === 0 && (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <Table2 className="h-7 w-7 text-slate-300" />
                  <p className="text-sm text-slate-400">No tables currently occupied.</p>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setQrOpen(true)}
                  className="btn-primary no-print inline-flex items-center gap-2"
                >
                  <QrCode className="h-4 w-4" /> Table QR codes
                </button>
              </div>

              <TableQrSheet
                open={qrOpen}
                onClose={() => setQrOpen(false)}
                tables={totalTables || 24}
                baseUrl={qrBaseUrl}
              />
            </main>
          ) : view === 'reports' ? (
            <main className="px-4 pb-16 pt-5 sm:px-6 lg:px-6 xl:px-10">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <KpiCard icon={Wallet} label="Revenue today" value={money(currency, reports.revenueToday)} hint={`${reports.todayCount} orders`} tone="emerald" />
                <KpiCard icon={CalendarDays} label="Last 7 days" value={money(currency, reports.revenueWeek)} hint={`${reports.weekCount} orders`} tone="sky" />
                <KpiCard icon={TrendingUp} label="All time" value={money(currency, reports.revenueAll)} hint={`${reports.allCount} orders`} tone="brand" />
                <KpiCard icon={Flame} label="Orders today" value={String(reports.todayCount)} hint="peak hours below" tone="amber" />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {/* Hourly chart */}
                <div className="card p-5 shadow-card lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-ink-900">Orders by hour</h3>
                      <p className="text-xs text-slate-400">Today's kitchen rhythm</p>
                    </div>
                    <BarChart3 className="h-4 w-4 text-ink-300" />
                  </div>
                  <div className="flex h-40 items-end gap-[3px]">
                    {reports.hours.map((v, h) => (
                      <div key={h} className="group flex h-full flex-1 flex-col justify-end">
                        <div
                          title={`${v} order(s) at ${String(h).padStart(2, '0')}:00`}
                          className={`w-full rounded-t-[4px] transition-all duration-300 ${
                            v === 0
                              ? 'bg-slate-100'
                              : h === new Date().getHours()
                                ? 'bg-brand-500 ring-2 ring-brand-200'
                                : 'bg-brand-200 group-hover:bg-brand-400'
                          }`}
                          style={{ height: `${Math.max(4, (v / maxHour) * 100)}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 flex justify-between text-[9.5px] font-semibold text-slate-400">
                    {[0, 6, 12, 18, 23].map((h) => (
                      <span key={h}>{String(h).padStart(2, '0')}</span>
                    ))}
                  </div>
                </div>

                {/* Status distribution */}
                <div className="card p-5 shadow-card">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-ink-900">By status</h3>
                      <p className="text-xs text-slate-400">All non-cancelled orders</p>
                    </div>
                    <ReceiptText className="h-4 w-4 text-ink-300" />
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {(Object.keys(reports.byStatus) as OrderStatus[])
                      .filter((s) => s !== 'cancelled')
                      .map((s) => (
                        <div key={s}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-semibold text-ink-600">{STATUS_META[s].label}</span>
                            <span className="font-display font-bold tabular-nums text-ink-900">
                              {reports.byStatus[s]}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${STATUS_META[s].dot}`}
                              style={{ width: `${Math.round((reports.byStatus[s] / statusTotal) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Top sellers */}
                <div className="card p-5 shadow-card lg:col-span-3">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-ink-900">Top selling items</h3>
                      <p className="text-xs text-slate-400">Ranked by units sold, all time</p>
                    </div>
                    <Flame className="h-4 w-4 text-ink-300" />
                  </div>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {reports.topItems.map((it, i) => (
                      <div key={it.name} className="flex items-center gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold ${
                            i < 3 ? 'bg-brand-600 text-white shadow-brand' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] font-semibold text-ink-800">{it.name}</span>
                            <span className="shrink-0 text-[11px] tabular-nums text-ink-400">
                              {it.qty} sold · {money(currency, it.rev)}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                              style={{ width: `${Math.round((it.qty / topQty) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {reports.topItems.length === 0 && (
                    <p className="py-6 text-center text-sm text-slate-400">No sales recorded yet.</p>
                  )}
                </div>
              </div>
            </main>
          ) : view === 'menu' ? (
            <main className="px-4 pb-16 pt-5 sm:px-6 lg:px-6 xl:px-10">
              {menu ? (
                <MenuManager
                  items={menu.items}
                  categories={menu.categories}
                  currency={currency}
                  onChanged={(items) => setMenu((prev) => (prev ? { ...prev, items } : prev))}
                  onCategoriesChanged={(categories) =>
                    setMenu((prev) => (prev ? { ...prev, categories } : prev))
                  }
                />
              ) : (
                <div className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-white" />
              )}
            </main>
          ) : (
            <main className="px-4 pb-16 pt-5 sm:px-6 lg:px-6 xl:px-10">
              {menu?.kisinia ? (
                <KisiniaManager
                  config={menu.kisinia}
                  currency={currency}
                  onSaved={(kisinia) => setMenu((prev) => (prev ? { ...prev, kisinia } : prev))}
                />
              ) : (
                <div className="h-96 animate-pulse rounded-3xl border border-slate-200 bg-white" />
              )}
            </main>
          )}

          {/* Footer */}
          <footer className="mt-auto border-t border-slate-200/60 px-6 py-5 text-center xl:px-10">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
              Willis Lounge · Office CRM
            </p>
          </footer>
        </div>
      </div>

      <ToastHost />

      {/* Order detail drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 z-40 bg-ink-900/45 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full flex-col bg-white shadow-sheet sm:max-w-md"
            >
              <div className="shrink-0">
                <div
                  className={`h-1.5 w-full ${
                    selectedOrder.status === 'new'
                      ? 'bg-brand-500'
                      : selectedOrder.status === 'preparing'
                        ? 'bg-amber-400'
                        : selectedOrder.status === 'ready'
                          ? 'bg-emerald-500'
                          : selectedOrder.status === 'cancelled'
                            ? 'bg-rose-400'
                            : 'bg-slate-300'
                  }`}
                />
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <OrderSourceBadge order={selectedOrder} />
                    <div className="min-w-0">
                      <p className="font-display truncate font-extrabold text-ink-900">
                        {selectedOrder.code}
                      </p>
                      <p className="truncate text-xs text-ink-400">
                        {selectedOrder.customer} · {timeAgo(selectedOrder.createdAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    aria-label="Close"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-ink-500 transition hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {selectedOrder.table == null && (
                  <div className="border-b border-slate-100 bg-amber-50/70 px-5 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                      {selectedOrder.type === 'delivery' ? 'Delivery details' : 'Takeaway details'}
                    </p>
                    {selectedOrder.phone && (
                      <p className="mt-1 text-[13px] font-bold text-ink-900">
                        <Phone className="mr-1 inline h-3.5 w-3.5" />
                        {selectedOrder.phone}
                      </p>
                    )}
                    {selectedOrder.address && (
                      <p className="mt-0.5 text-[12.5px] text-ink-600">
                        <MapPin className="mr-1 inline h-3.5 w-3.5" />
                        {selectedOrder.address}
                      </p>
                    )}
                  </div>
                )}
                {/* Progress steps */}
                {selectedOrder.status === 'cancelled' ? (
                  <div className="border-b border-slate-100 bg-rose-50 px-5 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-rose-600">
                      This order was cancelled
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-5 py-3">
                    {FLOW.map((s, i) => {
                      const idx = FLOW.indexOf(selectedOrder.status)
                      const done = idx >= i
                      const current = idx === i
                      return (
                        <div key={s} className="flex flex-1 items-center gap-1">
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition ${
                                done
                                  ? current
                                    ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                                    : 'bg-brand-100 text-brand-700'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                            </span>
                            <span
                              className={`whitespace-nowrap text-[9px] font-bold uppercase tracking-wide ${
                                current ? 'text-brand-700' : 'text-slate-400'
                              }`}
                            >
                              {STATUS_META[s].label}
                            </span>
                          </div>
                          {i < FLOW.length - 1 && (
                            <div
                              className={`mb-3.5 h-0.5 flex-1 rounded-full ${done ? 'bg-brand-300' : 'bg-slate-100'}`}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                  <StatusPill status={selectedOrder.status} />
                  <div className="text-right">
                    <p className="text-[9.5px] font-bold uppercase tracking-widest text-ink-400">Total</p>
                    <p className="font-display text-lg font-bold tabular-nums text-ink-900">
                      {money(currency, selectedOrder.total)}
                    </p>
                  </div>
                </div>

                {selectedOrder.note && (
                  <div className="mt-3 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
                    <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">
                        Kitchen note
                      </p>
                      <p className="mt-0.5 text-sm leading-snug text-amber-800">{selectedOrder.note}</p>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
                    Items ({selectedOrder.items.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {selectedOrder.items.map((it, idx) => (
                      <div key={idx} className="rounded-2xl border border-slate-100 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-ink-800">
                            {it.qty}× {it.name}
                          </span>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-500">
                            {money(currency, it.price * it.qty)}
                          </span>
                        </div>
                        {it.note && (
                          <p className="mt-1 text-xs italic text-amber-700">
                            Preference: {it.note}
                          </p>
                        )}
                        {it.kisinia && (
                          <p className="mt-1 text-xs leading-relaxed text-ink-400">
                            {it.kisinia.picks.length
                              ? it.kisinia.picks.map((p) => `${p.qty}× ${p.name}`).join(' · ')
                              : "Kitchen's choice"}
                            {it.kisinia.overflow > 0 && (
                              <span className="font-semibold text-brand-600">
                                {' '}
                                · +{money(currency, it.kisinia.overflow)} extra
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <div className="shrink-0 border-t border-slate-100 px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:pb-3.5">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        move(selectedOrder, 'cancelled')
                        setSelectedOrder(null)
                      }}
                      className="btn-ghost flex-1 text-rose-600"
                    >
                      Cancel order
                    </button>
                    <button
                      onClick={() => {
                        const n = NEXT[selectedOrder.status]
                        if (n) move(selectedOrder, n)
                        setSelectedOrder(null)
                      }}
                      className="btn-primary flex-1"
                    >
                      {NEXT_LABEL[selectedOrder.status]}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ---------- Sidebar (shared desktop + mobile) ---------- */

function SidebarContent({
  view,
  onNavigate,
  nav,
  sound,
  onToggleSound,
  onLock,
  openCount,
}: {
  view: ViewKey
  onNavigate: (k: ViewKey) => void
  nav: readonly { key: string; label: string; icon: any; count: number }[]
  sound: boolean
  onToggleSound: () => void
  onLock: () => void
  openCount: number
}) {
  return (
    <div className="flex h-full w-[272px] flex-col bg-gradient-to-b from-[#14352F] via-[#0C2A25] to-[#051F1B] px-4 py-6 text-white shadow-sheet">
      <div className="flex items-center gap-2.5 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-300 to-brand-500 text-brand-900 shadow-brand">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="font-display text-[15px] font-extrabold leading-none">Willis Lounge</p>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-white/40">
            Office CRM
          </p>
        </div>
      </div>

      {/* Live status */}
      <div className="mt-7 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] px-3.5 py-3">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-white/90">Live sync active</p>
          <p className="text-[10px] text-white/40">{openCount} open order(s) right now</p>
        </div>
        <Activity className="h-3.5 w-3.5 shrink-0 text-emerald-300/70" />
      </div>

      <p className="mt-6 px-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/30">
        Workspace
      </p>
      <nav className="mt-2 flex flex-1 flex-col gap-1 overflow-y-auto hide-scroll">
        {nav.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key as ViewKey)}
              className={`group flex items-center justify-between rounded-2xl px-3 py-2.5 text-sm transition-all duration-200 ${
                active
                  ? 'bg-white text-brand-900 shadow-lift'
                  : 'text-white/55 hover:bg-white/[0.07] hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                    active
                      ? 'bg-brand-600 text-white shadow-brand'
                      : 'bg-white/[0.08] text-white/70 group-hover:bg-white/15'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className={active ? 'font-bold' : 'font-medium'}>{item.label}</span>
              </span>
              {item.count ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    active ? 'bg-brand-100 text-brand-800' : 'bg-white/10 text-white/70'
                  }`}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          )
        })}
      </nav>

      <div className="mt-4 flex flex-col gap-2 px-1">
        <button
          onClick={onToggleSound}
          className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.08]">
              {sound ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </span>
            <span className="font-medium">{sound ? 'Sound alerts on' : 'Sound muted'}</span>
          </span>
          <span
            className={`flex h-4 w-7 items-center rounded-full p-0.5 transition ${
              sound ? 'bg-brand-400/80' : 'bg-white/15'
            }`}
          >
            <span
              className={`h-3 w-3 rounded-full bg-white transition-transform ${sound ? 'translate-x-3' : ''}`}
            />
          </span>
        </button>
        <button
          onClick={onLock}
          className="flex items-center justify-between rounded-2xl px-3 py-2.5 text-xs text-white/60 transition hover:bg-white/[0.07] hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.08]">
              <Lock className="h-4 w-4" />
            </span>
            <span className="font-medium">Lock office</span>
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
        <a
          href="#/"
          className="flex items-center justify-between rounded-2xl bg-white px-3 py-3 text-sm font-bold text-brand-900 shadow-lift transition hover:-translate-y-0.5 hover:shadow-sheet"
        >
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <UtensilsCrossed className="h-4 w-4" />
            </span>
            Customer view
          </span>
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  )
}

/* ---------- Small shared components ---------- */

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
  tone: 'brand' | 'amber' | 'emerald' | 'sky'
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600 ring-brand-100',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  }
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white/90 p-3.5 shadow-card backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-slate-200 transition-colors group-hover:text-slate-400" />
      </div>
      <p className="mt-2.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-400">{label}</p>
      <p className="font-display mt-0.5 truncate text-xl font-bold tabular-nums text-ink-900">
        {value}
      </p>
      {hint && <p className="text-[10px] font-medium text-ink-400">{hint}</p>}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button onClick={onClick} className={`tab-pill ${active ? 'tab-active' : 'tab-idle'}`}>
      {children}
    </button>
  )
}

const OrderCard = forwardRef<
  HTMLElement,
  {
    order: Order
    currency: string
    onAdvance: () => void
    onCancel: () => void
  }
>(function OrderCard({ order, currency, onAdvance, onCancel }, ref) {
  const next = NEXT[order.status]
  const isNew = order.status === 'new'
  const cancelled = order.status === 'cancelled'
  const accent =
    order.status === 'new'
      ? 'bg-brand-500'
      : order.status === 'preparing'
        ? 'bg-amber-400'
        : order.status === 'ready'
          ? 'bg-emerald-500'
          : order.status === 'cancelled'
            ? 'bg-rose-400'
            : 'bg-slate-300'
  const minutes = Math.floor((Date.now() - order.createdAt) / 60000)
  const settled = cancelled || order.status === 'delivered'
  const urgent = !settled && minutes >= 15
  const late = !settled && minutes >= 8 && !urgent
  const itemCount = order.items.reduce((s, it) => s + it.qty, 0)
  const shown = order.items.slice(0, 3)
  const rest = order.items.length - shown.length

  return (
    <motion.article
      ref={ref}
      layout
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className={`group relative overflow-hidden rounded-2xl border bg-white pl-1.5 transition-all duration-200 ${
        cancelled
          ? 'border-rose-200 opacity-70'
          : isNew
            ? 'border-brand-200 shadow-[0_16px_34px_-20px_rgba(22,56,50,0.45)] hover:-translate-y-0.5 hover:shadow-card'
            : 'border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card'
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} />

      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <OrderSourceBadge order={order} />
              <span className="font-display text-[15px] font-semibold tracking-tight text-ink-900">
                {order.code}
              </span>
              {isNew && (
                <span className="chip bg-brand-600 px-1.5 py-0 text-[9px] font-extrabold text-white">
                  NEW
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-400">
              <span className="max-w-[150px] truncate text-ink-500">{order.customer}</span>
              <span className="text-ink-300">·</span>
              <Clock
                className={`h-3 w-3 ${
                  urgent ? 'text-rose-500' : late ? 'text-amber-500' : 'text-ink-300'
                }`}
              />
              <span
                className={
                  urgent ? 'font-semibold text-rose-600' : late ? 'font-semibold text-amber-600' : ''
                }
              >
                {timeAgo(order.createdAt)}
              </span>
            </p>
            {order.table == null && order.address && (
              <p className="mt-1 truncate text-[11px] font-semibold text-amber-700">
                <MapPin className="mr-0.5 inline h-3 w-3" />
                {order.address}
              </p>
            )}
            {order.table == null && order.phone && (
              <p className="truncate text-[11px] text-ink-500">
                <Phone className="mr-0.5 inline h-3 w-3" />
                {order.phone}
              </p>
            )}
          </div>
          <StatusPill status={order.status} />
        </div>

        <ul className="mt-3 flex flex-col gap-1.5 border-t border-slate-100 pt-2.5">
          {shown.map((it, idx) => {
            const ItemIcon = getIcon(it.icon)
            if (it.kisinia) {
              return (
                <li
                  key={`${it.id}-${idx}`}
                  className="rounded-lg border border-brand-100 bg-brand-50/60 px-2 py-1.5"
                >
                  <div className="flex items-start justify-between gap-2 text-[12.5px]">
                    <span className="flex min-w-0 items-center gap-1.5 text-ink-700">
                      <ItemIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                      <span className="shrink-0 font-semibold text-ink-800">{it.qty}×</span>
                      <span className="truncate">{it.name}</span>
                      <span className="chip shrink-0 border border-brand-200 bg-white px-1.5 py-0 text-[9px] text-brand-700">
                        Kisinia
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-ink-500">
                      {money(currency, it.price * it.qty)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 pl-5 text-[11px] leading-snug text-ink-500">
                    {it.kisinia.picks.length
                      ? it.kisinia.picks.map((p) => `${p.qty}× ${p.name}`).join(', ')
                      : "Kitchen's choice"}
                    {it.kisinia.overflow > 0 && (
                      <span className="text-brand-700">
                        {' '}
                        · +{money(currency, it.kisinia.overflow)} extra
                      </span>
                    )}
                  </p>
                </li>
              )
            }
            return (
              <li
                key={`${it.id}-${idx}`}
                className="flex items-start justify-between gap-2 text-[12.5px]"
              >
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-ink-600">
                    <ItemIcon className="h-3.5 w-3.5 shrink-0 text-ink-400" />
                    <span className="shrink-0 font-semibold text-ink-800">{it.qty}×</span>
                    <span className="truncate">{it.name}</span>
                  </span>
                  {it.note && (
                    <span className="mt-0.5 block pl-5 text-[10.5px] italic leading-snug text-amber-700">
                      {it.note}
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-ink-400">
                  {money(currency, it.price * it.qty)}
                </span>
              </li>
            )
          })}
          {rest > 0 && (
            <li className="pl-5 text-[11px] font-semibold text-ink-400">
              +{rest} more line{rest > 1 ? 's' : ''}
            </li>
          )}
        </ul>

        {order.note && (
          <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11.5px] leading-snug text-amber-800 ring-1 ring-amber-100">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <span className="line-clamp-2">{order.note}</span>
          </p>
        )}

        <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-2.5">
          <div>
            <p className="text-[9.5px] font-bold uppercase tracking-widest text-ink-300">
              Total · {itemCount} item{itemCount === 1 ? '' : 's'}
            </p>
            <p className="font-display text-lg font-semibold tabular-nums text-ink-900">
              {money(currency, order.total)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {!settled && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onCancel()
                }}
                className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
              >
                Cancel
              </button>
            )}
            {next && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAdvance()
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-ink-900 px-3 py-1.5 text-[11.5px] font-bold text-white transition-all hover:bg-black active:scale-95"
              >
                {NEXT_LABEL[order.status]}
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
            {order.status === 'delivered' && (
              <ChevronRight className="h-4 w-4 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-500" />
            )}
          </div>
        </div>
      </div>
    </motion.article>
  )
})

function beep() {
  try {
    const ctx = new AudioContext()
    const now = ctx.currentTime
    const notes = [880, 1174.66]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + i * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.18, now + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.28)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.12)
      osc.stop(now + i * 0.12 + 0.3)
    })
    setTimeout(() => ctx.close(), 800)
  } catch {
    /* audio not available */
  }
}
