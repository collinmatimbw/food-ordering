import { buildApi } from '../server/core.js'
import { getStorage } from '../server/storage.js'

const app = buildApi({ storage: getStorage() })

export default function handler(req, res) {
  return app(req, res)
}
