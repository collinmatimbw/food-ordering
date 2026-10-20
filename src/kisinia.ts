import type { KisiniaConfig, KisiniaComponent } from './types'

export const KISINIA_ID = '__kisinia__'
export const MAX_PICK_QTY = 12

/**
 * Sentinel sizeId for the "food combo" path: the customer picks the
 * dishes themselves and pays the sum of the components (no base price).
 */
export const COMBO_ID = '__combo__'

export interface KisiniaQuote {
  sizeId: string
  sizeName: string
  slots: number
  picks: { name: string; qty: number; price: number }[]
  overflow: number
  unitPrice: number
  totalPortions: number
}

/**
 * Same rule the server uses.
 *
 * Two exclusive building paths:
 *  - `sizeId === COMBO_ID`  → food combo: unitPrice = Σ(component price × qty).
 *  - otherwise              → platter size: unitPrice = size price (+ overflow
 *    when the customer customised more portions than the size includes).
 * A size platter with no picks is valid — the kitchen decides the food.
 * Returns null when the config/size/picks are invalid.
 */
export function quoteKisinia(
  config: KisiniaConfig | undefined,
  sizeId: string,
  picks: Record<string, number>
): KisiniaQuote | null {
  if (!config || !config.enabled) return null
  const isCombo = sizeId === COMBO_ID
  const size = isCombo ? undefined : config.sizes.find((s) => s.id === sizeId)
  if (!isCombo && !size) return null

  const compMap = new Map(config.components.map((c) => [c.id, c]))
  const resolved: KisiniaQuote['picks'] = []
  const portions: number[] = []

  for (const [compId, rawQty] of Object.entries(picks)) {
    const comp = compMap.get(compId)
    if (!comp || !comp.available) return null
    const qty = Math.floor(Number(rawQty))
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_PICK_QTY) return null
    resolved.push({ name: comp.name, qty, price: comp.price })
    for (let i = 0; i < qty; i++) portions.push(comp.price)
  }

  if (isCombo) {
    if (resolved.length === 0) return null
    const unitPrice = resolved.reduce((s, p) => s + p.price * p.qty, 0)
    return {
      sizeId: COMBO_ID,
      sizeName: 'Food combo',
      slots: portions.length,
      picks: resolved,
      overflow: 0,
      unitPrice,
      totalPortions: portions.length,
    }
  }

  // Platter-size path: no custom picks is valid (kitchen's choice).
  if (resolved.length === 0) {
    return {
      sizeId: size!.id,
      sizeName: size!.name,
      slots: size!.slots,
      picks: [],
      overflow: 0,
      unitPrice: size!.price,
      totalPortions: 0,
    }
  }

  portions.sort((a, b) => b - a)
  let overflow = 0
  portions.forEach((price, i) => {
    if (i >= size!.slots) overflow += price
  })

  return {
    sizeId: size!.id,
    sizeName: size!.name,
    slots: size!.slots,
    picks: resolved,
    overflow,
    unitPrice: size!.price + overflow,
    totalPortions: portions.length,
  }
}

/**
 * Which portions are actually charged extra (cheapest charged first).
 * Returns componentId -> number of charged portions, e.g. { ugali: 1 }.
 * Never applies to the food-combo path or to uncustomised platters.
 */
export function overflowCharges(
  config: KisiniaConfig | undefined,
  sizeId: string,
  picks: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {}
  if (!config || sizeId === COMBO_ID) return result
  const size = config.sizes.find((s) => s.id === sizeId)
  if (!size) return result
  const compMap = new Map(config.components.map((c) => [c.id, c]))

  const portions: { compId: string; price: number }[] = []
  for (const [compId, rawQty] of Object.entries(picks)) {
    const comp = compMap.get(compId)
    if (!comp || !comp.available) continue
    const qty = Math.floor(Number(rawQty))
    if (!Number.isFinite(qty) || qty < 1) continue
    for (let i = 0; i < qty; i++) portions.push({ compId, price: comp.price })
  }

  portions.sort((a, b) => b.price - a.price)
  for (let i = size.slots; i < portions.length; i++) {
    const id = portions[i].compId
    result[id] = (result[id] ?? 0) + 1
  }
  return result
}

/** Stable cart key so identical platters merge into one line. */
export function kisiniaKey(sizeId: string, picks: Record<string, number>): string {
  const parts = Object.entries(picks)
    .filter(([, q]) => q > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, q]) => `${id}x${q}`)
  return parts.length ? `${sizeId}|${parts.join('|')}` : `${sizeId}|base`
}

/** Compact summary like "2× Kuku, 1× Chips" (for cart/office display). */
export function picksSummary(
  components: KisiniaComponent[],
  picks: Record<string, number>
): string {
  const map = new Map(components.map((c) => [c.id, c.name]))
  return Object.entries(picks)
    .filter(([, q]) => q > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, q]) => `${q}× ${map.get(id) ?? id}`)
    .join(', ')
}
