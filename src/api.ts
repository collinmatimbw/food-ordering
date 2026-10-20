import type {
  MenuResponse,
  MenuItem,
  Order,
  OrderStatus,
  KisiniaConfig,
} from './types'

const BASE = '/api'

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
  table: number
  customer: string
  items: OrderLineInput[]
  note?: string
}) =>
  request<Order>(`${BASE}/orders`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

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

/** Upload a dish photo; resolves with the stored image URL (e.g. /uploads/…). */
export const uploadImage = async (file: File): Promise<string> => {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${BASE}/uploads`, { method: 'POST', body: fd })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any)?.error || `Upload failed (${res.status})`)
  return (data as any).url as string
}

/** Save the kisinia platter config (office). */
export const saveKisinia = (config: KisiniaConfig) =>
  request<KisiniaConfig>(`${BASE}/kisinia`, {
    method: 'PUT',
    body: JSON.stringify(config),
  })

export function subscribe(onEvent: (type: string, data: unknown) => void): () => void {
  const source = new EventSource(`${BASE}/stream`)

  const handler = (type: string) => (e: MessageEvent) => {
    try {
      onEvent(type, JSON.parse(e.data))
    } catch {
      /* ignore malformed frames */
    }
  }

  source.addEventListener('order:new', handler('order:new'))
  source.addEventListener('order:updated', handler('order:updated'))
  source.addEventListener('menu:updated', handler('menu:updated'))

  return () => source.close()
}
