// Pull the current live menu/orders/images from the deployed API and write a
// seed bundle that Render copies into its persistent disk on first boot.
//
// Usage:
//   node scripts/migrate-to-render.mjs [SOURCE_API_BASE]
// Default source: https://food-ordering-sigma-ashen.vercel.app
//
// Output: server/data/menu.json, server/data/orders.json, server/data/uploads/*

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'server', 'data')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')

const SOURCE = (process.argv[2] || 'https://food-ordering-sigma-ashen.vercel.app').replace(/\/$/, '')

function extFromUrl(u, fallback = '.jpg') {
  try {
    const clean = u.split('?')[0]
    const e = path.extname(clean).toLowerCase()
    if (e && e.length <= 6) return e
  } catch {}
  return fallback
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

async function downloadImage(url, outDir) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const base = path.basename(url.split('?')[0]) || `img-${Date.now()}`
  const name = base.includes('.') ? base : base + extFromUrl(url)
  const dest = path.join(outDir, name)
  fs.writeFileSync(dest, buf)
  return `/uploads/${name}`
}

async function main() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  console.log(`Pulling from ${SOURCE}`)

  const menu = await getJson(`${SOURCE}/api/menu`)
  const ordersRaw = await getJson(`${SOURCE}/api/orders`)
  const orders = Array.isArray(ordersRaw) ? { orders: ordersRaw } : ordersRaw

  // Re-host any Supabase/remote images onto the local uploads dir.
  let moved = 0
  let kept = 0
  for (const item of menu.items || []) {
    const img = item.image
    if (!img) continue
    if (img.startsWith('/uploads/')) {
      kept++
      continue
    }
    if (/^https?:\/\//i.test(img)) {
      try {
        const local = await downloadImage(img, UPLOAD_DIR)
        item.image = local
        moved++
        console.log(`  image ${item.id}: ${img.slice(0, 60)}… -> ${local}`)
      } catch (err) {
        console.warn(`  image ${item.id}: failed (${err.message}); keeping remote URL`)
      }
    }
  }

  fs.writeFileSync(path.join(DATA_DIR, 'menu.json'), JSON.stringify(menu, null, 2), 'utf8')
  fs.writeFileSync(path.join(DATA_DIR, 'orders.json'), JSON.stringify(orders, null, 2), 'utf8')

  console.log(`\nDone.`)
  console.log(`  menu items : ${(menu.items || []).length}`)
  console.log(`  orders     : ${(orders.orders || []).length}`)
  console.log(`  images     : ${moved} downloaded, ${kept} already local`)
  console.log(`  wrote to   : ${DATA_DIR}`)
  console.log(`\nCommit server/data/** so Render seeds its disk on first boot.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
