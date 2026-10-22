export type OrderStatus = 'new' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export type OrderType = 'dine_in' | 'delivery' | 'takeaway'

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  icon: string
  image?: string
  category: string
  tags: string[]
  rating?: number
  prepMinutes?: number
  gradient: string
  available: boolean
  sidesIncluded?: number
}

export interface MenuCategory {
  id: string
  name: string
  icon: string
}

export interface KisiniaSize {
  id: string
  name: string
  people: number
  price: number
  slots: number
}

export interface KisiniaComponent {
  id: string
  name: string
  price: number
  icon: string
  available: boolean
}

export interface KisiniaConfig {
  enabled: boolean
  title: string
  blurb: string
  sizes: KisiniaSize[]
  components: KisiniaComponent[]
}

export interface MenuResponse {
  restaurant: { name: string; tagline: string; currency: string; tables: number }
  kisinia?: KisiniaConfig
  categories: MenuCategory[]
  items: MenuItem[]
}

export interface CartLine {
  id: string
  qty: number
  note?: string
}

/** A kisinia platter line in the cart (client side). */
export interface KisiniaCartLine {
  sizeId: string
  /** component id -> portion count */
  picks: Record<string, number>
  qty: number
}

export interface OrderItem extends CartLine {
  name: string
  icon: string
  price: number
  /** resolved kisinia details when this line is a platter */
  kisinia?: {
    sizeId: string
    sizeName: string
    slots: number
    picks: { name: string; qty: number; price: number }[]
    overflow: number
  }
}

export interface Order {
  code: string
  type?: OrderType
  table: number | null
  phone?: string
  address?: string
  customer: string
  items: OrderItem[]
  note: string
  subtotal: number
  service: number
  total: number
  status: OrderStatus
  createdAt: number
  updatedAt: number
}
