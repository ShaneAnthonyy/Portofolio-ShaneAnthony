import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
const base = path.resolve('.tmp-phase05l/baseline-dist'), assets = path.resolve('public')
http.createServer(async (req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (name === '/favicon.ico') return res.writeHead(204).end()
  for (const root of [base, assets]) {
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name))
    if (!file.startsWith(root + path.sep)) continue
    try {
      const data = await readFile(file)
      res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.gltf':'model/gltf+json','.glb':'model/gltf-binary','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.mp3':'audio/mpeg','.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream')
      return res.end(data)
    } catch {}
  }
  res.writeHead(404).end()
}).listen(4176, '127.0.0.1', () => console.log('Phase 05L preserved baseline http://127.0.0.1:4176'))
