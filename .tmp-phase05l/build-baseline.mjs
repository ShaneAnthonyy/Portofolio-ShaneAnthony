import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile } from 'node:fs/promises'
const root = new URL('../', import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1')
const saved = new Map(await Promise.all([
  ['src/App.jsx', 'App.jsx.before'],
  ['src/components/AquariumDivePrototype.jsx', 'AquariumDivePrototype.jsx.before'],
].map(async ([file, snapshot]) => [file, await readFile(new URL(snapshot, import.meta.url), 'utf8')])))
await build({ root, configFile: false, publicDir: false, plugins: [
  { name: 'phase05l-before', enforce: 'pre', load(id) {
    const name = id.replaceAll('\\', '/').replace(root, '')
    return saved.get(name)
  } }, react(),
], build: {outDir: '.tmp-phase05l/baseline-dist', emptyOutDir: true} })
