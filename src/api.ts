import type {
  MenuResponse,
  MenuItem,
  Order,
  OrderStatus,
  OrderType,
  KisiniaConfig,
} from './types'

export const API_ORIGIN = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const BASE = `${API_ORIGIN}/api`

/** Resolve a possibly-relative upload path against the API origin. */
export function resolveAssetUrl(url?: string): string | undefined {
  if (!url) return url
  if (/^https?:\/\//i.test(url)) return url
  return API_ORIGIN + url
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`)
  return data as T
}

export const fetchMenu = () => request<MenuResponse>(`${BASE}/menu`)

export const fetchOrders = () => request<Order[]>(`${BASE}/orders`)

export const fetchOrder = (code: string) => request<Order>(`${BASE}/orders/${code}`)

/** One line of the order payload: a dish or a kisinia platter. */
export type OrderLineInput =
  | { id: string; qty: number; note?: string }
  | {
      id: '__kisinia__'
      sizeId: string
      picks: Record<string, number>
      qty: number
      note?: string
    }

export const placeOrder = (payload: {
  table?: number | null
  type?: OrderType
  phone?: string
  address?: string
  customer: string
  items: OrderLineInput[]
  note?: string
}) =>
  request<Order>(`${BASE}/orders`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

/** Look up a remote order with the code + phone used when ordering. */
export const trackOrder = (code: string, phone: string) =>
  request<Order>(`${BASE}/orders/track?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`)

export const updateOrderStatus = (code: string, status: OrderStatus) =>
  request<Order>(`${BASE}/orders/${code}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

/* Menu management */
export interface MenuInput {
  name: string
  description: string
  price: number
  category: string
  icon: string
  tags: string[]
}

export const createMenuItem = (payload: MenuInput) =>
  request<MenuItem>(`${BASE}/menu/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateMenuItem = (id: string, payload: Partial<MenuInput> & { available?: boolean }) =>
  request<MenuItem>(`${BASE}/menu/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

export const deleteMenuItem = (id: string) =>
  request<{ ok: boolean }>(`${BASE}/menu/items/${id}`, { method: 'DELETE' })

/** Remove a category. Fails on the server if it still has dishes. */
export const deleteMenuCategory = (id: string) =>
  request<{ ok: boolean }>(`${BASE}/menu/categories/${encodeURIComponent(id)}`, { method: 'DELETE' })

/** Upload a dish photo; resolves with the stored image URL (e.g. /uploads/…). */
export const uploadImage = async (file: File): Promise<string> => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}/uploads`, { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any)?.error || `Upload failed (${res.status})`)
  return resolveAssetUrl((data as any).url as string) as string
}

/** Save the kisinia platter config (office). */
export const saveKisinia = (config: KisiniaConfig) =>
  request<KisiniaConfig>(`${BASE}/kisinia`, {
    method: 'PUT',
    body: JSON.stringify(config),
  })

export function subscribe(_onEvent: (type: string, data: unknown) => void): () => void {
  return () => {}
}
