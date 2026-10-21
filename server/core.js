import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import multer from 'multer'

const STATUSES = ['new', 'preparing', 'ready', 'delivered', 'cancelled']

const KISINIA_ID = '__kisinia__'
const MAX_KISINIA_QTY = 10
const MAX_PICK_QTY = 12
const COMBO_ID = '__combo__'

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

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export function buildApi({ storage }) {
  const app = express()
  const corsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  app.use(
    cors(
      corsOrigins.length
        ? {
            origin: (origin, cb) => {
              if (!origin || corsOrigins.includes(origin)) cb(null, true)
              else cb(null, false)
            },
          }
        : undefined
    )
  )
  app.use(express.json())

  // Multer setup for memory storage (serverless) with fallback metadata
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) cb(null, true)
      else cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'))
    },
  })

  const httpErrHandler = (err, _req, res, next) => {
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
  }

  let menuState = null
  let ordersState = null

  async function ensureLoaded() {
    if (!menuState) {
      menuState = await storage.loadMenu()
    }
    if (!ordersState) {
      ordersState = await storage.loadOrders()
    }
  }

  function persistMenu() {
    storage.saveMenu(menuState).catch((err) => console.error('Failed to persist menu:', err))
  }
  function persistOrders() {
    storage.saveOrders(ordersState).catch((err) => console.error('Failed to persist orders:', err))
  }

  function orderCode() {
    return (
      'SV-' +
      crypto.randomBytes(2).toString('hex').toUpperCase() +
      '-' +
      String(ordersState.orders.length + 101).padStart(3, '0')
    )
  }

  function quoteKisinia(sizeId, picks) {
    const cfg = menuState.kisinia
    if (!cfg || !cfg.enabled) return null
    const isCombo = sizeId === COMBO_ID
    const size = isCombo ? null : cfg.sizes.find((s) => s.id === sizeId)
    if (!isCombo && !size) return null

    const compMap = new Map(cfg.components.map((c) => [c.id, c]))
    const resolvedPicks = []
    const portions = []

    for (const [compId, rawQty] of Object.entries(picks || {})) {
      const comp = compMap.get(compId)
      if (!comp || !comp.available) return null
      const qty = parseInt(rawQty, 10)
      if (!Number.isFinite(qty) || qty < 1 || qty > MAX_PICK_QTY) return null
      resolvedPicks.push({ name: comp.name, qty, price: comp.price })
      for (let i = 0; i < qty; i++) portions.push(comp.price)
    }

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
    const itemMap = new Map(menuState.items.map((i) => [i.id, i]))
    let subtotal = 0
    const resolved = []

    for (const line of items) {
      if (line && line.id === KISINIA_ID) {
        const qty = Math.max(1, Math.min(MAX_KISINIA_QTY, parseInt(line.qty, 10) || 1))
        const quote = quoteKisinia(line.sizeId, line.picks)
        if (!quote) continue
        subtotal += quote.unitPrice * qty
        resolved.push({
          id: KISINIA_ID,
          name: `${menuState.kisinia.title} · ${quote.sizeName}`,
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
    if (!menuState.categories.some((c) => c.id === category))
      return { error: 'Please choose a valid category.' }

    return { name, description, price, category, icon, image, tags }
  }

  function sanitizeKisinia(body) {
    const enabled = Boolean(body.enabled)
    const title = String(body.title || '').trim().slice(0, 40)
    const blurb = String(body.blurb || '').trim().slice(0, 160)
    if (!title) return { error: 'Kisinia title is required.' }

    const sizes = Array.isArray(body.sizes) ? body.sizes : []
    if (sizes.length < 1 || sizes.length > 5) return { error: 'Keep between 1 and 5 size options.' }

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
    if (components.length < 1 || components.length > 40) return { error: 'Keep between 1 and 40 components.' }

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

  app.get("/uploads/:name", (req,res)=>{
    const name = req.params.name;
    if (process.env.SUPABASE_PUBLIC_URL) {
      const baseUrl = process.env.SUPABASE_PUBLIC_URL.replace(/\/$/, "");
      return res.redirect(302, baseUrl + "/" + name);
    }
    res.status(404).end();
  });

  // Upload route (memory storage -> storage.putUpload)
  app.post('/api/uploads', upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No image file received.' })
      const result = await storage.putUpload({
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      })
      res.status(201).json(result)
    } catch (err) {
      console.error('Upload failed:', err)
      res.status(500).json({ error: err && err.message ? err.message : 'Upload failed.' })
    }
  })

  app.get('/api/health', async (_req, res) => {
    try {
      const info =
        typeof storage.ping === 'function'
          ? await storage.ping()
          : { driver: 'local', ok: true }
      res.json({ ok: true, storage: info, time: new Date().toISOString() })
    } catch (err) {
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'ping failed' })
    }
  })

  app.get('/api/menu', async (_req, res) => {
    await ensureLoaded()
    res.json(menuState)
  })

  app.get('/api/config', async (_req, res) => {
    await ensureLoaded()
    res.json({
      ...menuState.restaurant,
      categories: menuState.categories,
      statuses: STATUSES,
    })
  })

  app.post('/api/menu/items', async (req, res) => {
    await ensureLoaded()
    const clean = sanitizeItem(req.body || {})
    if (clean.error) return res.status(400).json({ error: clean.error })

    const item = {
      id: 'it-' + crypto.randomBytes(3).toString('hex'),
      ...clean,
      gradient: GRADIENTS[menuState.items.length % GRADIENTS.length],
      available: true,
    }

    menuState.items.push(item)
    persistMenu()
    res.status(201).json(item)
  })

  app.patch('/api/menu/items/:id', async (req, res) => {
    await ensureLoaded()
    const item = menuState.items.find((i) => i.id === req.params.id)
    if (!item) return res.status(404).json({ error: 'Item not found' })

    const body = req.body || {}

    if (body.name !== undefined) {
      const name = String(body.name).trim().slice(0, 60)
      if (!name) return res.status(400).json({ error: 'Name cannot be empty.' })
      item.name = name
    }
    if (body.description !== undefined) item.description = String(body.description).trim().slice(0, 160)
    if (body.price !== undefined) {
      const price = Math.round(Number(body.price))
      if (!Number.isFinite(price) || price < 0) return res.status(400).json({ error: 'A valid price is required.' })
      item.price = price
    }
    if (body.category !== undefined) {
      if (!menuState.categories.some((c) => c.id === body.category))
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
    res.json(item)
  })

  app.delete('/api/menu/items/:id', async (req, res) => {
    await ensureLoaded()
    const idx = menuState.items.findIndex((i) => i.id === req.params.id)
    if (idx === -1) return res.status(404).json({ error: 'Item not found' })

    const [removed] = menuState.items.splice(idx, 1)
    persistMenu()
    res.json({ ok: true, id: removed.id })
  })

  app.put('/api/kisinia', async (req, res) => {
    await ensureLoaded()
    const clean = sanitizeKisinia(req.body || {})
    if (clean.error) return res.status(400).json({ error: clean.error })

    menuState.kisinia = clean.value
    persistMenu()
    res.json(menuState.kisinia)
  })

  app.get('/api/orders', async (_req, res) => {
    await ensureLoaded()
    const sorted = [...ordersState.orders].sort((a, b) => b.createdAt - a.createdAt)
    res.json(sorted)
  })

  app.get('/api/orders/:code', async (req, res) => {
    await ensureLoaded()
    const order = ordersState.orders.find((o) => o.code.toLowerCase() === req.params.code.toLowerCase())
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json(order)
  })

  app.post('/api/orders', async (req, res) => {
    await ensureLoaded()
    const { table, customer, items, note } = req.body || {}

    const tableNum = parseInt(table, 10)
    if (!Number.isFinite(tableNum) || tableNum < 1 || tableNum > menuState.restaurant.tables) {
      return res.status(400).json({ error: `Please choose a table between 1 and ${menuState.restaurant.tables}.` })
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

    ordersState.orders.push(order)
    persistOrders()
    res.status(201).json(order)
  })

  app.patch('/api/orders/:code/status', async (req, res) => {
    await ensureLoaded()
    const order = ordersState.orders.find((o) => o.code.toLowerCase() === String(req.params.code).toLowerCase())
    if (!order) return res.status(404).json({ error: 'Order not found' })

    const { status } = req.body || {}
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    order.status = status
    order.updatedAt = Date.now()
    persistOrders()
    res.json(order)
  })

  // Serve blob/uploaded files if storage provides static handler
  if (storage.serveUploads) {
    storage.serveUploads(app)
  }

  app.use(httpErrHandler)

  return app
}
