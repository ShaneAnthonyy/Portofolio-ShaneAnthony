import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
const root = path.resolve('.')
http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost')
  if(url.pathname==='/favicon.ico'){res.writeHead(204).end();return}
  if(url.pathname==='/') {
    res.setHeader('Content-Type','text/html')
    res.end('<!doctype html><html><head><title>Phase 05I diagnostics</title><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script></head><body style="margin:0;background:#173b3b"><script type="module">import * as THREE from "three"; import {GLTFLoader} from "/node_modules/three/examples/jsm/loaders/GLTFLoader.js"; window.THREE=THREE; window.GLTFLoader=GLTFLoader;</script></body></html>')
    return
  }
  const rel=decodeURIComponent(url.pathname).slice(1)
  const file=path.resolve(root,rel)
  if(!file.startsWith(root+path.sep)||!['.tmp-phase05i/','node_modules/three/','public/'].some(p=>rel.startsWith(p))) {res.writeHead(403).end();return}
  try {const data=await readFile(file);res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type',({'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(data)} catch {res.writeHead(404).end()}
}).listen(4175,'127.0.0.1',()=>console.log('Phase 05I diagnostics http://127.0.0.1:4175'))
