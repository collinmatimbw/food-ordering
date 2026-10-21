import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { buildApi } from './core.js'
import { getStorage } from './storage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const storage = getStorage()
const api = buildApi({ storage })

// Uploads served from the data dir when using disk/local storage
if (typeof storage.serveUploads === 'function') {
  storage.serveUploads(app)
}

// Mount API core
app.use(api)

// Production: serve built SPA
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Food Point API running on http://localhost:${PORT}`)
})
