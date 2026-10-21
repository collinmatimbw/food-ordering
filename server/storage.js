import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'
import express from 'express'
import { put, head } from '@vercel/blob'
import * as SupabaseMod from '@supabase/supabase-js'
const _cc = SupabaseMod.createClient || SupabaseMod.default && (SupabaseMod.default.createClient || SupabaseMod.default)
const createClient = function(){ if(typeof _cc!=='function') throw new Error('no'); return _cc.apply(null, arguments) }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data')
const MENU_FILE = path.join(DATA_DIR, 'menu.json')
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const BUNDLED_SEED = path.join(__dirname, 'seed')
const SEED_DIR = fs.existsSync(BUNDLED_SEED) ? BUNDLED_SEED : path.join(__dirname, 'data')

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
} catch (err) {
  console.error('Failed to create data dir:', err)
}

// Seed the persistent data dir from the bundled defaults on first boot.
function seedIfMissing() {
  for (const [name, fallbackDir] of [
    ['menu.json', SEED_DIR],
    ['orders.json', SEED_DIR],
  ]) {
    const dest = path.join(DATA_DIR, name)
    const src = path.join(fallbackDir, name)
    try {
      if (!fs.existsSync(dest) && fs.existsSync(src)) {
        fs.copyFileSync(src, dest)
      }
    } catch (err) {
      console.error(`Failed to seed ${name}:`, err)
    }
  }

  // Copy bundled uploads into the data dir when it is still empty.
  const seedUploads = path.join(SEED_DIR, 'uploads')
  try {
    if (fs.existsSync(seedUploads) && fs.readdirSync(UPLOAD_DIR).length === 0) {
      for (const name of fs.readdirSync(seedUploads)) {
        fs.copyFileSync(path.join(seedUploads, name), path.join(UPLOAD_DIR, name))
      }
    }
  } catch (err) {
    console.error('Failed to seed uploads:', err)
  }
}
seedIfMissing()

function readJsonLocal(file) {
  let text = fs.readFileSync(file, 'utf-8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return JSON.parse(text)
}

const isServerless = !!process.env.BLOB_READ_WRITE_TOKEN || !!process.env.VERCEL
const driver = (process.env.STORAGE_DRIVER || '').toLowerCase()
const useSupabase =
  driver !== 'disk' &&
  driver !== 'blob' &&
  !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

let supabaseClient = null
if (useSupabase) { try { supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) } catch { supabaseClient = null } }

const MENU_BLOB = 'food-point/menu.json'
const ORDERS_BLOB = 'food-point/orders.json'

async function readBlobJson(pathname, fallback) {
  try {
    const meta = await head(pathname)
    if (!meta || !meta.url) throw new Error('no head')
    const res = await fetch(meta.url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`blob get ${res.status}`)
    const data = await res.json()
    return data
  } catch (e) {
    if (fallback !== undefined) return fallback
    throw e
  }
}

async function writeBlobJson(pathname, data) {
  const body = Buffer.from(JSON.stringify(data, null, 2), 'utf-8')
  await put(pathname, body, { access: 'public', contentType: 'application/json', addRandomSuffix: false })
}

function makeLocalStorage() {
  let menuCache = null
  let ordersCache = null

  return {
    async loadMenu() {
      if (!menuCache) menuCache = readJsonLocal(MENU_FILE)
      return menuCache
    },
    async saveMenu(menu) {
      menuCache = menu
      fs.writeFile(MENU_FILE, JSON.stringify(menu, null, 2), (err) => {
        if (err) console.error('Failed to persist menu:', err)
      })
    },
    async loadOrders() {
      if (!ordersCache) {
        try {
          ordersCache = readJsonLocal(ORDERS_FILE)
        } catch {
          ordersCache = { orders: [] }
        }
      }
      return ordersCache
    },
    async saveOrders(db) {
      ordersCache = db
      fs.writeFile(ORDERS_FILE, JSON.stringify(db, null, 2), (err) => {
        if (err) console.error('Failed to persist orders:', err)
      })
    },
    async putUpload({ buffer, originalname, mimetype }) {
      const ext = (path.extname(originalname || '') || '.jpg')
        .toLowerCase()
        .replace(/[^.a-z0-9]/g, '')
        .slice(0, 8) || '.jpg'
      const name = `dish-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
      const dest = path.join(UPLOAD_DIR, name)
      fs.writeFileSync(dest, buffer)
      return { url: `/uploads/${name}`, name: originalname, size: buffer.length }
    },
    serveUploads(app) {
      app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', immutable: true }))
    },
  }
}

function makeBlobStorage() {
  return {
    async loadMenu() {
      try {
        const data = await readBlobJson(MENU_BLOB)
        return data
      } catch {
        try {
          return readJsonLocal(MENU_FILE)
        } catch {
          return { restaurant: {}, categories: [], items: [], kisinia: { enabled: false } }
        }
      }
    },
    async saveMenu(menu) {
      await writeBlobJson(MENU_BLOB, menu)
    },
    async loadOrders() {
      try {
        const data = await readBlobJson(ORDERS_BLOB)
        if (!data || !Array.isArray(data.orders)) return { orders: [] }
        return data
      } catch {
        return { orders: [] }
      }
    },
    async saveOrders(db) {
      await writeBlobJson(ORDERS_BLOB, db)
    },
    async putUpload({ buffer, originalname, mimetype }) {
      const ext = (path.extname(originalname || '') || '.jpg')
        .toLowerCase()
        .replace(/[^.a-z0-9]/g, '')
        .slice(0, 8) || '.jpg'
      const name = `food-point/uploads/dish-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
      const blob = await put(name, buffer, { access: 'public', contentType: mimetype || 'application/octet-stream', addRandomSuffix: false })
      return { url: blob.url, name: originalname, size: buffer.length }
    },
    serveUploads() {
      // uploads served directly via blob URLs
    },
  }
}

function makeSupabaseStorage() {
  const bucket = process.env.SUPABASE_BUCKET || 'food-point-uploads'
  return {
    async loadMenu() {
      try {
        const { data, error } = await supabaseClient.storage.from(bucket).download('data/menu.json')
        if (error || !data) throw error || new Error('no menu')
        return JSON.parse(await data.text())
      } catch {
        try {
          return readJsonLocal(MENU_FILE)
        } catch {
          return { restaurant: {}, categories: [], items: [], kisinia: { enabled: false } }
        }
      }
    },
    async saveMenu(menu) {
      const body = Buffer.from(JSON.stringify(menu, null, 2), 'utf-8')
      const { error } = await supabaseClient.storage.from(bucket).upload('data/menu.json', body, { contentType: 'application/json', upsert: true })
      if (error) throw new Error(error.message)
    },
    async loadOrders() {
      try {
        const { data, error } = await supabaseClient.storage.from(bucket).download('data/orders.json')
        if (error || !data) throw error || new Error('no orders')
        const parsed = JSON.parse(await data.text())
        if (!parsed || !Array.isArray(parsed.orders)) return { orders: [] }
        return parsed
      } catch {
        try {
          return readJsonLocal(ORDERS_FILE)
        } catch {
          return { orders: [] }
        }
      }
    },
    async saveOrders(db) {
      const body = Buffer.from(JSON.stringify(db, null, 2), 'utf-8')
      const { error } = await supabaseClient.storage.from(bucket).upload('data/orders.json', body, { contentType: 'application/json', upsert: true })
      if (error) throw new Error(error.message)
    },
    async putUpload({ buffer, originalname, mimetype }) {
      const ext = (path.extname(originalname || '') || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8) || '.jpg'
      const name = `dish-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`
      const { error } = await supabaseClient.storage.from(bucket).upload(name, buffer, { contentType: mimetype || 'application/octet-stream', upsert: false })
      if (error) throw new Error(error.message)
      if (process.env.SUPABASE_PUBLIC_URL) return { url: process.env.SUPABASE_PUBLIC_URL.replace(/\/$/, '') + '/' + name, name: originalname, size: buffer.length }
      const { data } = supabaseClient.storage.from(bucket).getPublicUrl(name)
      return { url: data.publicUrl, name: originalname, size: buffer.length }
    },
    serveUploads() {},
  }
}

export function getStorage() {
  if (driver === 'disk') return makeLocalStorage()
  if (driver === 'blob') return makeBlobStorage()
  if (useSupabase && supabaseClient) {
    return makeSupabaseStorage()
  }
  if (isServerless) return makeBlobStorage()
  return makeLocalStorage()
}

export function getStorageLegacy() {
  if (useSupabase && supabaseClient) {
    const base = isServerless ? makeBlobStorage() : makeLocalStorage()
    base.putUpload = async ({ buffer, originalname, mimetype }) => {
      const bucket = process.env.SUPABASE_BUCKET || 'food-point-uploads'
      const ext2 = (path.extname(originalname || '') || '.jpg').toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 8) || '.jpg'
      const name2 = `dish-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext2}`
      const { error } = await supabaseClient.storage.from(bucket).upload(name2, buffer, { contentType: mimetype || 'application/octet-stream', upsert: false })
      if (error) throw new Error(error.message)
      if (process.env.SUPABASE_PUBLIC_URL) return { url: process.env.SUPABASE_PUBLIC_URL.replace(/\/$/, '') + '/' + name2, name: originalname, size: buffer.length }
      const { data } = supabaseClient.storage.from(bucket).getPublicUrl(name2)
      return { url: data.publicUrl, name: originalname, size: buffer.length }
    }
    return base
  }
  if (isServerless) return makeBlobStorage()
  return makeLocalStorage()
}
export { isServerless }

