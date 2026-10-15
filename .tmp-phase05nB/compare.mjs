import { writeFile, mkdir } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
const CDP = 9229
const base = new URL('./', import.meta.url)
await mkdir(new URL('./comparisons', base), { recursive: true })
const v = await fetch(`http://127.0.0.1:${CDP}/json/version`).then(r => r.json())
const openSocket = (url) => new Promise((res, rej) => {
  const ws = new WebSocket(url)
  ws.addEventListener('open', () => res(ws), { once: true })
  ws.addEventListener('error', rej, { once: true })
})
const browserWs = await openSocket(v.webSocketDebuggerUrl)
let bid = 0
const bp = new Map()
browserWs.addEventListener('message', e => {
  const m = JSON.parse(e.data); const p = bp.get(m.id)
  if (p) { bp.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result) }
})
const bsend = (method, params = {}) => new Promise((res, rej) => {
  const id = ++bid; bp.set(id, { resolve: res, reject: rej })
  browserWs.send(JSON.stringify({ id, method, params }))
})
const { browserContextId } = await bsend('Target.createBrowserContext', { disposeOnDetach: true })
const { targetId } = await bsend('Target.createTarget', { url: 'about:blank', browserContextId })
const tabs = await fetch(`http://127.0.0.1:${CDP}/json`).then(r => r.json())
const tab = tabs.find(t => t.id === targetId)
const ws = await openSocket(tab.webSocketDebuggerUrl)
let nid = 0
const pend = new Map()
const errors = []
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(m.params.exceptionDetails))
  if (!m.id) return
  const p = pend.get(m.id); if (!p) return
  pend.delete(m.id); clearTimeout(p.timer)
  m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result)
})
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++nid
  pend.set(id, { resolve: res, reject: rej, timer: setTimeout(() => { pend.delete(id); rej(new Error('Timeout ' + method)) }, 60000) })
  ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 2000))
  return r.result.value
}
const until = async (expr, timeout = 30000) => {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) { if (await evaluate(expr)) return; await delay(250) }
  throw new Error('until timeout: ' + expr)
}
await send('Page.enable')
await send('Page.navigate', { url: 'http://127.0.0.1:4179/' })
await until('window.__ready === true')
const result = await evaluate(`(async () => {
  const out = { models: [], anim: {}, attach: {} }
  const load = async (url) => {
    const gltf = await new GLTFLoader().loadAsync(url)
    return gltf
  }
  const files = {
    prev: '/public/aquarium/environment/golem_animated.glb',
    v1: '/public/aquarium/environment/golem_animated-05n.glb',
    v2: '/public/aquarium/environment/golem_animated-05nB.glb',
    chicken: '/public/aquarium/environment/chicken_jockey_animated-05n.glb',
  }
  for (const [key, url] of Object.entries(files)) {
    const gltf = await load(url)
    let tris = 0, meshes = 0
    gltf.scene.traverse(n => { if (n.isMesh) { meshes++; tris += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3 } })
    const bb = new THREE.Box3().setFromObject(gltf.scene)
    out.models.push({ key, anims: gltf.animations.map(a => ({ name: a.name, duration: a.duration, tracks: a.tracks.length })), meshes, tris,
      bounds: { min: bb.min.toArray(), max: bb.max.toArray() } })
  }
  const chk = await load(files.chicken)
  const mixer = new THREE.AnimationMixer(chk.scene)
  const byName = Object.fromEntries(chk.animations.map(a => [a.name, a]))
  const sample = (clipName, times) => {
    mixer.stopAllAction()
    const action = mixer.clipAction(byName[clipName])
    action.play()
    const rows = []
    for (const t of times) {
      mixer.setTime(t)
      chk.scene.updateMatrixWorld(true)
      const nodes = {}
      chk.scene.traverse(n => { nodes[n.name] = n.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(4)) })
      rows.push({ t, nodes: Object.fromEntries(['Chicken_Leg_Left','Chicken_Leg_Right','Rider_Leg_Left','Rider_Leg_Right','rider_knee_Left','rider_shoe_Left','Rider_Root','Chicken_Body'].filter(k => nodes[k]).map(k => [k, nodes[k]])) })
    }
    return rows
  }
  out.anim.chicken = {
    idle: sample('idle', [0, 1.0, 2.0]),
    walk: sample('walk', [0, 0.5, 1.0]),
    run: sample('run', [0, 0.275, 0.55]),
  }
  const g = await load(files.v2)
  const gm = new THREE.AnimationMixer(g.scene)
  const gb = Object.fromEntries(g.animations.map(a => [a.name, a]))
  const gs = {}
  for (const [name, clip] of Object.entries(gb)) {
    gm.stopAllAction(); gm.clipAction(clip).play()
    const row = []
    for (const t of [0, clip.duration / 2, clip.duration * 0.999]) {
      gm.setTime(t)
      g.scene.updateMatrixWorld(true)
      const n = {}
      g.scene.traverse(x => { n[x.name] = x.getWorldPosition(new THREE.Vector3()).toArray().map(v => +v.toFixed(4)) })
      row.push({ t: +t.toFixed(3), Arm_Left: n.Arm_Left, Arm_Right: n.Arm_Right, Leg_Left: n.Leg_Left, Leg_Right: n.Leg_Right, Head: n.Head })
    }
    gs[name] = { duration: clip.duration, samples: row }
  }
  out.anim.golemV2 = gs
  return out
})()`)
await writeFile(new URL('./comparisons/validation.json', base), JSON.stringify({ result, errors }, null, 2))
console.log(JSON.stringify(result.models, null, 1))
console.log('ERRORS', JSON.stringify(errors))
const shot = async (file, setup) => {
  await evaluate(setup)
  await delay(400)
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  await writeFile(new URL(file, base), Buffer.from(data, 'base64'))
}
await send('Emulation.setDeviceMetricsOverride', { width: 1500, height: 700, deviceScaleFactor: 1, mobile: false })
const RENDER = (a, b, c, angle, h) => `(async () => {
  document.body.innerHTML = ''
  const T = window.THREE
  const r = window.__r ??= new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  r.setSize(1500, 700); r.outputColorSpace = T.SRGBColorSpace
  if (!r.domElement.parentNode) document.body.appendChild(r.domElement)
  const scene = new T.Scene(); scene.background = new T.Color('#24363f')
  scene.add(new T.HemisphereLight(0xd9f5ef, 0x37595e, 2.2))
  const key = new T.DirectionalLight(0xfff1dd, 3.0); key.position.set(3, 5, 6); scene.add(key)
  const fill = new T.DirectionalLight(0xbcd0ff, 0.7); fill.position.set(-4, 2, 3); scene.add(fill)
  const L = new GLTFLoader()
  const show = async (url, x, glow) => {
    const gltf = await L.loadAsync(url)
    const root = gltf.scene
    const bb = new T.Box3().setFromObject(root)
    const size = bb.getSize(new T.Vector3()); const c = bb.getCenter(new T.Vector3())
    root.position.sub(c); root.position.x += x; root.position.y += -bb.min.y + c.y - size.y / 2 + ${(h ?? 2.6)} / 2 - ${(h ?? 2.6)} / 2
    root.rotation.y = Math.PI
    const g = new T.Group(); g.add(root)
    const ground = new T.Box3().setFromObject(root)
    root.position.y -= ground.min.y
    scene.add(g)
    return g
  }
  const A = await show(${JSON.stringify(a)}, -3.4); const B = await show(${JSON.stringify(b)}, 0); const C = await show(${JSON.stringify(c)}, 3.4)
  const cam = new T.PerspectiveCamera(30, 1500 / 700, 0.01, 200)
  const an = ${angle}
  cam.position.set(Math.sin(an) * 9.5, 3.4, Math.cos(an) * 9.5); cam.lookAt(0, 2.4, 0)
  r.render(scene, cam)
})()`
await shot('./comparisons/golem-front.png', RENDER('/public/aquarium/environment/golem_animated.glb', '/public/aquarium/environment/golem_animated-05n.glb', '/public/aquarium/environment/golem_animated-05nB.glb', 0))
await shot('./comparisons/golem-threequarter.png', RENDER('/public/aquarium/environment/golem_animated.glb', '/public/aquarium/environment/golem_animated-05n.glb', '/public/aquarium/environment/golem_animated-05nB.glb', 0.7))
await bsend('Target.closeTarget', { targetId })
await bsend('Target.disposeBrowserContext', { browserContextId })
console.log('DONE')
process.exit(0)
