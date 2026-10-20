import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const MENU_FILE = path.join(DATA_DIR, 'menu.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')

function readJson(file) {
  let text = fs.readFileSync(file, 'utf-8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // strip BOM
  return JSON.parse(text)
}

const app = express()
app.use(cors())
app.use(express.json())

/* ------------------------------------------------------------------ */
/*  Dish photo uploads                                                 */
/* ------------------------------------------------------------------ */
import multer from 'multer'

const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = (path.extname(file.originalname || '') || '.jpg')
        .toLowerCase()
        .replace(/[^.a-z0-9]/g, '')
        .slice(0, 8) || '.jpg'
      cb(null, `dish-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`)
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) cb(null, true)
    else cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'))
  },
})

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', immutable: true }))

app.post('/api/uploads', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image file received.' })
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size,
  })
})

// JSON errors for upload failures (wrong type / too large)
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err)
  const message =
    err instanceof multer.MulterError
      ? err.code === 'LIMIT_FILE_SIZE'
        ? 'Photo must be under 5 MB.'
        : 'Upload failed.'
      : err instanceof Error && /image/i.test(err.message)
        ? err.message
        : null
  if (message) return res.status(400).json({ error: message })
  next(err)
})

/* ------------------------------------------------------------------ */
/*  In-memory store (hydrated from disk)                               */
/* ------------------------------------------------------------------ */
let menu = readJson(MENU_FILE)
let db = { orders: [] }
try {
  db = readJson(ORDERS_FILE)
} catch {
  db = { orders: [] }
}

function persistOrders() {
  fs.writeFile(ORDERS_FILE, JSON.stringify(db, null, 2), (err) => {
    if (err) console.error('Failed to persist orders:', err)
  })
}

/* ------------------------------------------------------------------ */
/*  Realtime: Server-Sent Events                                       */
/* ------------------------------------------------------------------ */
const clients = new Set()

app.get('/api/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  res.flushHeaders?.()
  res.write('retry: 3000\n\n')

  clients.add(res)
  req.on('close', () => clients.delete(res))
})

function broadcast(type, payload) {
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`
  for (const client of clients) {
    try {
      client.write(message)
    } catch {
      clients.delete(client)
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const STATUSES = ['new', 'preparing', 'ready', 'delivered', 'cancelled']

function orderCode() {
  return (
    'SV-' +
    crypto.randomBytes(2).toString('hex').toUpperCase() +
    '-' +
    String(db.orders.length + 101).padStart(3, '0')
  )
}

/* ------------------------------------------------------------------ */
/*  Kisinia platter pricing (server owns the price)                    */
/* ------------------------------------------------------------------ */
const KISINIA_ID = '__kisinia__'
const MAX_KISINIA_QTY = 10
const MAX_PICK_QTY = 12

/**
 * Price a kisinia platter: size price includes `slots` portions.
 * Free portions are assigned to the most expensive picks first; the
 * rest are charged at their component price.
 * Returns null when the size/picks are invalid.
 */
const COMBO_ID = '__combo__' // "food combo" path: price = sum of components

function quoteKisinia(sizeId, picks) {
  const cfg = menu.kisinia
  if (!cfg || !cfg.enabled) return null
  const isCombo = sizeId === COMBO_ID
  const size = isCombo ? null : cfg.sizes.find((s) => s.id === sizeId)
  if (!isCombo && !size) return null

  const compMap = new Map(cfg.components.map((c) => [c.id, c]))
  const resolvedPicks = []
  const portions = [] // one entry per portion, for slot allocation

  for (const [compId, rawQty] of Object.entries(picks || {})) {
    const comp = compMap.get(compId)
    if (!comp || !comp.available) return null
    const qty = parseInt(rawQty, 10)
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_PICK_QTY) return null
    resolvedPicks.push({ name: comp.name, qty, price: comp.price })
    for (let i = 0; i < qty; i++) portions.push(comp.price)
  }

  // Food combo: customer picks the dishes, price = sum of components.
  if (isCombo) {
    if (resolvedPicks.length === 0) return null
    const unitPrice = resolvedPicks.reduce((s, p) => s + p.price * p.qty, 0)
    return {
      sizeId: COMBO_ID,
      sizeName: 'Food combo',
      slots: portions.length,
      picks: resolvedPicks,
      overflow: 0,
      unitPrice,
    }
  }

  // Platter size, uncustomised: kitchen decides the food, base price only.
  if (resolvedPicks.length === 0) {
    return {
      sizeId: size.id,
      sizeName: size.name,
      slots: size.slots,
      picks: [],
      overflow: 0,
      unitPrice: size.price,
    }
  }

  // Free slots go to the most expensive portions; cheapest get charged.
  portions.sort((a, b) => b - a)
  let overflow = 0
  portions.forEach((price, i) => {
    if (i >= size.slots) overflow += price
  })

  return {
    sizeId: size.id,
    sizeName: size.name,
    slots: size.slots,
    picks: resolvedPicks,
    overflow,
    unitPrice: size.price + overflow,
  }
}

function computeTotals(items) {
  const itemMap = new Map(menu.items.map((i) => [i.id, i]))
  let subtotal = 0
  const resolved = []

  for (const line of items) {
    // Kisinia platter line
    if (line && line.id === KISINIA_ID) {
      const qty = Math.max(1, Math.min(MAX_KISINIA_QTY, parseInt(line.qty, 10) || 1))
      const quote = quoteKisinia(line.sizeId, line.picks)
      if (!quote) continue
      subtotal += quote.unitPrice * qty
      resolved.push({
        id: KISINIA_ID,
        name: `${menu.kisinia.title} · ${quote.sizeName}`,
        icon: 'UtensilsCrossed',
        price: quote.unitPrice,
        qty,
        note: typeof line.note === 'string' ? line.note.slice(0, 140) : '',
        kisinia: quote,
      })
      continue
    }

    const item = itemMap.get(line.id)
    if (!item || !item.available) continue
    const qty = Math.max(1, Math.min(20, parseInt(line.qty, 10) || 1))
    subtotal += item.price * qty
    resolved.push({
      id: item.id,
      name: item.name,
      icon: item.icon || 'Utensils',
      price: item.price,
      qty,
      note: typeof line.note === 'string' ? line.note.slice(0, 140) : '',
    })
  }

  const service = resolved.length ? Math.round(subtotal * 0.05 * 100) / 100 : 0
  const total = Math.round((subtotal + service) * 100) / 100
  return { resolved, subtotal, service, total }
}

/* ------------------------------------------------------------------ */
/*  Menu API                                                           */
/* ------------------------------------------------------------------ */
app.get('/api/menu', (_req, res) => {
  res.json(menu)
})

app.get('/api/config', (_req, res) => {
  res.json({
    ...menu.restaurant,
    categories: menu.categories,
    statuses: STATUSES,
  })
})

/* ------------------------------------------------------------------ */
/*  Menu management (office)                                           */
/* ------------------------------------------------------------------ */
function persistMenu() {
  fs.writeFile(MENU_FILE, JSON.stringify(menu, null, 2), (err) => {
    if (err) console.error('Failed to persist menu:', err)
  })
}

const GRADIENTS = [
  'from-amber-400 to-orange-600',
  'from-emerald-500 to-teal-700',
  'from-emerald-400 to-teal-600',
  'from-brand-400 to-brand-700',
  'from-yellow-300 to-amber-600',
  'from-lime-400 to-emerald-700',
  'from-sky-400 to-blue-700',
  'from-brand-500 to-brand-800',
]

function sanitizeItem(body) {
  const name = String(body.name || '').trim().slice(0, 60)
  const description = String(body.description || '').trim().slice(0, 160)
  const price = Math.round(Number(body.price))
  const category = String(body.category || '').trim()
  const icon = String(body.icon || 'Utensils').trim().slice(0, 40)
  let image = typeof body.image === 'string' ? body.image.trim() : ''
  if (image && !/^https?:\/\/|^\/uploads\//i.test(image)) image = ''
  if (image.length > 500) image = image.slice(0, 500)
  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim().slice(0, 24)).filter(Boolean).slice(0, 3)
    : []

  if (!name) return { error: 'Item name is required.' }
  if (!Number.isFinite(price) || price < 0) return { error: 'A valid price is required.' }
  if (!menu.categories.some((c) => c.id === category))
    return { error: 'Please choose a valid category.' }

  return { name, description, price, category, icon, image, tags }
}

// Add a menu item
app.post('/api/menu/items', (req, res) => {
  const clean = sanitizeItem(req.body || {})
  if (clean.error) return res.status(400).json({ error: clean.error })

  const item = {
    id: 'it-' + crypto.randomBytes(3).toString('hex'),
    ...clean,
    gradient: GRADIENTS[menu.items.length % GRADIENTS.length],
    available: true,
  }

  menu.items.push(item)
  persistMenu()
  broadcast('menu:updated', { items: menu.items, kisinia: menu.kisinia })

  res.status(201).json(item)
})

// Update a menu item (price, name, availability, etc.)
app.patch('/api/menu/items/:id', (req, res) => {
  const item = menu.items.find((i) => i.id === req.params.id)
  if (!item) return res.status(404).json({ error: 'Item not found' })

  const body = req.body || {}

  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 60)
    if (!name) return res.status(400).json({ error: 'Name cannot be empty.' })
    item.name = name
  }
  if (body.description !== undefined)
    item.description = String(body.description).trim().slice(0, 160)
  if (body.price !== undefined) {
    const price = Math.round(Number(body.price))
    if (!Number.isFinite(price) || price < 0)
      return res.status(400).json({ error: 'A valid price is required.' })
    item.price = price
  }
  if (body.category !== undefined) {
    if (!menu.categories.some((c) => c.id === body.category))
      return res.status(400).json({ error: 'Please choose a valid category.' })
    item.category = String(body.category)
  }
  if (body.icon !== undefined) item.icon = String(body.icon).trim().slice(0, 40) || 'Utensils'
  if (body.image !== undefined) {
    let image = typeof body.image === 'string' ? body.image.trim() : ''
    if (image && !/^https?:\/\/|^\/uploads\//i.test(image)) image = ''
    item.image = image.slice(0, 500)
  }
  if (body.tags !== undefined && Array.isArray(body.tags))
    item.tags = body.tags.map((t) => String(t).trim().slice(0, 24)).filter(Boolean).slice(0, 3)
  if (body.available !== undefined) item.available = Boolean(body.available)

  persistMenu()
  broadcast('menu:updated', { items: menu.items, kisinia: menu.kisinia })

  res.json(item)
})

// Delete a menu item
app.delete('/api/menu/items/:id', (req, res) => {
  const idx = menu.items.findIndex((i) => i.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Item not found' })

  const [removed] = menu.items.splice(idx, 1)
  persistMenu()
  broadcast('menu:updated', { items: menu.items, kisinia: menu.kisinia })

  res.json({ ok: true, id: removed.id })
})

/* ------------------------------------------------------------------ */
/*  Kisinia builder config (office edits)                              */
/* ------------------------------------------------------------------ */
function sanitizeKisinia(body) {
  const enabled = Boolean(body.enabled)
  const title = String(body.title || '').trim().slice(0, 40)
  const blurb = String(body.blurb || '').trim().slice(0, 160)
  if (!title) return { error: 'Kisinia title is required.' }

  const sizes = Array.isArray(body.sizes) ? body.sizes : []
  if (sizes.length < 1 || sizes.length > 5)
    return { error: 'Keep between 1 and 5 size options.' }

  const cleanSizes = []
  for (const s of sizes) {
    const id = String(s.id || '').trim().slice(0, 24)
    const name = String(s.name || '').trim().slice(0, 30)
    const people = parseInt(s.people, 10)
    const price = Math.round(Number(s.price))
    const slots = parseInt(s.slots, 10)
    if (!id || !name) return { error: 'Every size needs an id and a name.' }
    if (!Number.isFinite(price) || price < 0) return { error: `Invalid price for ${name}.` }
    if (!Number.isFinite(people) || people < 1 || people > 50)
      return { error: `Invalid people count for ${name}.` }
    if (!Number.isFinite(slots) || slots < 1 || slots > 50)
      return { error: `Invalid slot count for ${name}.` }
    cleanSizes.push({ id, name, people, price, slots })
  }

  const components = Array.isArray(body.components) ? body.components : []
  if (components.length < 1 || components.length > 40)
    return { error: 'Keep between 1 and 40 components.' }

  const cleanComponents = []
  for (const c of components) {
    const id = String(c.id || '').trim().slice(0, 24)
    const name = String(c.name || '').trim().slice(0, 40)
    const price = Math.round(Number(c.price))
    const icon = String(c.icon || 'Utensils').trim().slice(0, 40)
    if (!id || !name) return { error: 'Every component needs an id and a name.' }
    if (!Number.isFinite(price) || price < 0) return { error: `Invalid price for ${name}.` }
    cleanComponents.push({ id, name, price, icon, available: c.available !== false })
  }

  if (cleanSizes.some((s, i) => cleanSizes.findIndex((x) => x.id === s.id) !== i))
    return { error: 'Size ids must be unique.' }
  if (cleanComponents.some((c, i) => cleanComponents.findIndex((x) => x.id === c.id) !== i))
    return { error: 'Component ids must be unique.' }

  return { value: { enabled, title, blurb, sizes: cleanSizes, components: cleanComponents } }
}

app.put('/api/kisinia', (req, res) => {
  const clean = sanitizeKisinia(req.body || {})
  if (clean.error) return res.status(400).json({ error: clean.error })

  menu.kisinia = clean.value
  persistMenu()
  broadcast('menu:updated', { items: menu.items, kisinia: menu.kisinia })

  res.json(menu.kisinia)
})


/* ------------------------------------------------------------------ */
/*  Orders API                                                         */
/* ------------------------------------------------------------------ */
app.get('/api/orders', (_req, res) => {
  const sorted = [...db.orders].sort((a, b) => b.createdAt - a.createdAt)
  res.json(sorted)
})

app.get('/api/orders/:code', (req, res) => {
  const order = db.orders.find(
    (o) => o.code.toLowerCase() === req.params.code.toLowerCase()
  )
  if (!order) return res.status(404).json({ error: 'Order not found' })
  res.json(order)
})

app.post('/api/orders', (req, res) => {
  const { table, customer, items, note } = req.body || {}

  const tableNum = parseInt(table, 10)
  if (!Number.isFinite(tableNum) || tableNum < 1 || tableNum > menu.restaurant.tables) {
    return res.status(400).json({ error: `Please choose a table between 1 and ${menu.restaurant.tables}.` })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty.' })
  }

  const { resolved, subtotal, service, total } = computeTotals(items)
  if (resolved.length === 0) {
    return res.status(400).json({ error: 'No valid items in cart.' })
  }

  const order = {
    code: orderCode(),
    table: tableNum,
    customer: String(customer || 'Guest').slice(0, 40),
    items: resolved,
    note: typeof note === 'string' ? note.slice(0, 300) : '',
    subtotal,
    service,
    total,
    status: 'new',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  db.orders.push(order)
  persistOrders()
  broadcast('order:new', order)

  res.status(201).json(order)
})

app.patch('/api/orders/:code/status', (req, res) => {
  const order = db.orders.find(
    (o) => o.code.toLowerCase() === String(req.params.code).toLowerCase()
  )
  if (!order) return res.status(404).json({ error: 'Order not found' })

  const { status } = req.body || {}
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  order.status = status
  order.updatedAt = Date.now()
  persistOrders()
  broadcast('order:updated', order)

  res.json(order)
})

/* ------------------------------------------------------------------ */
/*  Production: serve built SPA                                        */
/* ------------------------------------------------------------------ */
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`
  Food Point API running on http://localhost:${PORT}`)
  console.log(`  Realtime stream on /api/stream
`)
})
