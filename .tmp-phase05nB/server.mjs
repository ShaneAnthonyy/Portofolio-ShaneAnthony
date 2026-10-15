import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve('.')
const PAGE = `<!doctype html><html><head><meta charset="utf-8"><title>05N-B golem compare</title><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script></head><body style="margin:0;background:#1c2b33"><img id="ref" src="/public/aquarium/environment/golem_reference.jpg" style="position:absolute;left:8px;top:8px;width:300px;image-rendering:pixelated"><script type="module">import * as THREE from "three"; import {GLTFLoader} from "/node_modules/three/examples/jsm/loaders/GLTFLoader.js"; window.THREE=THREE; window.GLTFLoader=GLTFLoader; window.__ready=true;</script></body></html>`
http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost')
  if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return}
  if(url.pathname==='/') { res.setHeader('Content-Type','text/html'); res.end(PAGE); return }
  const rel=decodeURIComponent(url.pathname).slice(1)
  const file=path.resolve(root,rel)
  if(!file.startsWith(root+path.sep)||!['node_modules/three/','public/'].some(p=>rel.startsWith(p))) {res.writeHead(403).end();return}
  try {const data=await readFile(file);res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(data)} catch {res.writeHead(404).end()}
}).listen(4179,'127.0.0.1',()=>console.log('05NB diagnostics http://127.0.0.1:4179'))
