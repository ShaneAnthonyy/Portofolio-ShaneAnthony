import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js'
import Hero from './Hero.jsx'
import { createScrollSign } from './MinecraftScrollSign.js'
import useSectionProgress from '../hooks/useSectionProgress.js'
import { resolveQuality, effectivePixelRatio } from '../animation/quality.js'

// Shared WebGL dive layer for the portfolio; ?webgl-poc=1 keeps an isolated debug entry.
//
// ART PASS: required slots (tank/floor/rocks/kelp) attempt /aquarium/*.glb
// loads and keep explicitly-marked TEMPORARY primitive fallbacks on miss or
// validation failure. Optional slots (coral/fish) fail silently and stay
// absent. Assumes Y-up authoring (glTF standard).

// Camera checkpoints: position + lookAt target each.
const KEYS = [
  { p: 0.0, pos: [0, 2.5, 12], tgt: [0, 2.2, 0] }, // P0 front view
  { p: 0.3, pos: [0, 4.5, 9.5], tgt: [0, 2.0, 0] }, // P1 above + closer
  { p: 0.55, pos: [0, 8.5, 9.5], tgt: [0, 1.5, -1] }, // P2 exit rise: higher+farther, tank lower third
  { p: 0.75, pos: [0, 7.0, 7.5], tgt: [0, 1.8, -2] }, // P3 takeover: above/away, sky dominant
  { p: 1.0, pos: [0, 2.5, 0.5], tgt: [0, 2.0, -6] }, // P4 underwater
]

const smooth = (t) => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t
// Phase 12R: shared clamp (was a per-fish per-frame closure in swimOne).
const clampQ = (v, lo, hi) => (lo == null || hi == null ? v : Math.min(hi, Math.max(lo, v)))

function sampleKeys(progress) {
  const p = Math.min(Math.max(progress, 0), 1)
  let i = 0
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const local = (p - a.p) / (b.p - a.p || 1)
  const e = smooth(Math.min(Math.max(local, 0), 1))
  return {
    pos: a.pos.map((v, k) => lerp(v, b.pos[k], e)),
    tgt: a.tgt.map((v, k) => lerp(v, b.tgt[k], e)),
  }
}

function phaseOf(p) {
  if (p < 0.3) return 'FRONT'
  if (p < 0.55) return 'RISE'
  if (p < 0.75) return 'TOP'
  if (p < 0.96) return 'ENTER'
  return 'REVEAL'
}

// Backdrop mode: per-section environment goals around the P4 baseline.
// d = camera offset from P4 pos; fog/light are multipliers. All ±15%.
// Backdrop-only fish scale (~40% reduction vs PoC) so the fish reads
// secondary to the Hero title. PoC scale is untouched.
const FISH_BACKDROP_SCALE = 0.6;

const SECTION_MOD = {
  home: { d: [0, 0.9, 6.0], fog: 1.0, light: 1.0 },
  about: { d: [0, 0.3, 0.6], fog: 0.9, light: 1.0 },
  skills: { d: [0, 0, -0.4], fog: 1.1, light: 1.0 },
  projects: { d: [0, 0, -0.6], fog: 1.15, light: 0.95 },
  certificates: { d: [0, 0, 0.3], fog: 1.0, light: 0.9 },
  contact: { d: [0, 0.2, 0.5], fog: 0.95, light: 0.85 },
}
const P4_POS = [0, 2.5, 0.5]
const P4_TGT = [0, 2.0, -6]

// Downscale oversized textures via 2D canvas (no dependencies).
// Falls back to originals on any error. Call before first render.
function downscaleTextures(root, maxDim, disposables) {
  const seen = new Set()
  try {
    root.traverse((n) => {
      if (!n.isMesh || !n.material) return
      const mats = Array.isArray(n.material) ? n.material : [n.material]
      mats.forEach((m) => {
        ;['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'].forEach((key) => {
          const tex = m[key]
          if (!tex || !tex.image || seen.has(tex)) return
          seen.add(tex)
          const w = tex.image.width
          const h = tex.image.height
          if (!w || !h || (w <= maxDim && h <= maxDim)) return
          const s = maxDim / Math.max(w, h)
          const cv = document.createElement('canvas')
          cv.width = Math.max(1, Math.round(w * s))
          cv.height = Math.max(1, Math.round(h * s))
          cv.getContext('2d').drawImage(tex.image, 0, 0, cv.width, cv.height)
          const nt = new THREE.CanvasTexture(cv)
          nt.colorSpace = tex.colorSpace
          // Phase 12R-fix: preserve upload semantics. GLB textures arrive
          // with flipY=false (glTF top-left UV origin); a default
          // CanvasTexture is flipY=true and would sample atlases mirrored
          // (visible as corrupted tree foliage). Same for mipmap generation.
          nt.flipY = tex.flipY
          nt.generateMipmaps = tex.generateMipmaps
          nt.wrapS = tex.wrapS
          nt.wrapT = tex.wrapT
          nt.magFilter = tex.magFilter
          nt.minFilter = tex.minFilter
          nt.anisotropy = tex.anisotropy
          m[key] = nt
          disposables.push(nt)
        })
      })
    })
  } catch (err) {
    /* keep original textures */
  }
}

// ---- Open-air dive environment (sky dome + ground + table) ----
// Shared by the integrated dive and PoC; not created in backdrop mode.
function measureRoot(root) {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  const vals = [size.x, size.y, size.z, center.x, center.y, center.z]
  if (!vals.every(Number.isFinite)) return null
  return { size, center }
}

// Uniform fit scale into target dims + unit guard (rejects cm/mm blows).
// Returns scale or null with reason.
function fitScale(dims, target) {
  const maxDim = Math.max(dims.x, dims.y, dims.z)
  const expMax = Math.max(target[0], target[1], target[2])
  if (maxDim > expMax * 4 || maxDim < expMax * 0.05) {
    return { s: 0, ok: false, reason: `scale out of range (${maxDim.toFixed(2)} vs ~${expMax})` }
  }
  return { s: Math.min(target[0] / dims.x, target[1] / dims.y, target[2] / dims.z), ok: true }
}

function inTankBounds(x, y, z) {
  return Math.abs(x) <= 7 && y >= -3 && y <= 9 && Math.abs(z) <= 7
}

// Depth grading: darken a loaded template in place (no new materials).
// Skips transparent materials so glass/water highlights survive.
function gradeSlot(root, factor) {
  root.traverse((n) => {
    if (!n.isMesh || !n.material) return
    const mats = Array.isArray(n.material) ? n.material : [n.material]
    mats.forEach((m) => {
      if (!m.transparent && m.color) m.color.multiplyScalar(factor)
    })
  })
}

// HD voxel shading (scene-only; sky MeshBasicMaterials never pass through).
// One shared clock, one injector, per-variant program cache keys.
const shadeU = { uTime: { value: 0 } }
// Water volume uniforms, written by seatWater(): inner XZ rect (waterline)
// plus surface/floor Y (depth gradient). Shared by reference everywhere.
const waterU = {
  rect: { value: new THREE.Vector4(-4, -2, 4, 2) },
  topY: { value: 4 },
  botY: { value: 0 },
}
// Water debug preview (?water-debug=1, DEV only): solid teal volume +
// white waterline so placement reads in one screenshot. Off = 0.
const WATER_DEBUG =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('water-debug')
    ? 1
    : 0
// Terrain-local horizon atmosphere: fixed theme tints sampled once from the
// sky assets (day warm horizon / night cool horizon). No per-frame sampling.
const horizonU = {
  day: { value: new THREE.Color(0xf7c787) },
  night: { value: new THREE.Color(0x6070b4) },
  k: { value: 0 },
}
const HORIZON_START = 25
const HORIZON_END = 55
const HORIZON_CAP = 0.75
function shadeMat(mat, { caustic = 0, fresnel = 0, fresnelColor = [0.45, 0.65, 0.75], depth = false, horizon = null } = {}) {
  if (!mat || !mat.isMeshStandardMaterial) return mat
  const key = `shade-c${caustic.toFixed(3)}-f${fresnel.toFixed(2)}-d${depth ? 1 : 0}-h${horizon ? 1 : 0}`
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShadeTime = shadeU.uTime
    if (depth) {
      shader.uniforms.uVolTop = waterU.topY
      shader.uniforms.uVolBot = waterU.botY
    }
    if (horizon) {
      shader.uniforms.uHorDay = horizonU.day
      shader.uniforms.uHorNight = horizonU.night
      shader.uniforms.uHorK = horizonU.k
    }
    shader.vertexShader =
      'varying vec3 vShadeW;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n vShadeW = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      )
    let fs = 'varying vec3 vShadeW;\nuniform float uShadeTime;\n' + shader.fragmentShader
    if (horizon) {
      fs = 'uniform vec3 uHorDay;\nuniform vec3 uHorNight;\nuniform float uHorK;\n' + fs
      fs = fs.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          // Terrain-local atmospheric blend (hill only): distance × low-
          // height gate, smoothstepped, dithered against banding. Mixes
          // albedo toward the theme horizon tint pre-lighting so the haze
          // stays sun-coherent instead of glowing.
          float hdist = distance(cameraPosition, vShadeW);
          float hdf = smoothstep(${horizon.start.toFixed(1)}, ${horizon.end.toFixed(1)}, hdist);
          float hhf = 1.0 - 0.65 * smoothstep(-1.0, 1.5, vShadeW.y);
          float hb = hdf * hhf * ${horizon.cap.toFixed(2)};
          hb += (fract(sin(dot(vShadeW.xz, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.02;
          vec3 htint = mix(uHorDay, uHorNight, uHorK);
          diffuseColor.rgb = mix(diffuseColor.rgb, htint, clamp(hb, 0.0, 0.8));
        }`
      )
    }
    if (depth) {
      fs = 'uniform float uVolTop;\nuniform float uVolBot;\n' + fs
      fs = fs.replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        {
          float wdepth = clamp((uVolTop - vShadeW.y) / max(uVolTop - uVolBot, 0.001), 0.0, 1.0);
          diffuseColor.rgb *= mix(1.0, 0.88, wdepth * 0.5);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.94, 1.0) + vec3(0.0, 0.02, 0.035), wdepth * 0.45);
        }`
      )
    }
    if (caustic > 0) {
      fs = fs.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec2 cuv = vShadeW.xz * 0.9 + vec2(uShadeTime * 0.015, uShadeTime * 0.011);
          float cw = sin(cuv.x * 3.4 + uShadeTime * 0.05) * sin(cuv.y * 2.9 - uShadeTime * 0.04)
                   + 0.5 * sin((cuv.x + cuv.y) * 5.2 + uShadeTime * 0.03)
                   + 0.25 * sin((cuv.x * 1.3 - cuv.y * 2.2) + uShadeTime * 0.035);
          float ca = smoothstep(0.80, 1.20, abs(cw)) * ${caustic.toFixed(3)};
          totalEmissiveRadiance += vec3(0.55, 0.78, 0.85) * ca;
        }`
      )
    }
    if (fresnel > 0) {
      fs = fs.replace(
        '#include <opaque_fragment>',
        `{
          vec3 shV = normalize(vViewPosition);
          float shF = pow(1.0 - abs(dot(normalize(normal), shV)), 3.0);
          outgoingLight += vec3(${fresnelColor.join(', ')}) * (shF * ${fresnel.toFixed(2)});
        }
        #include <opaque_fragment>`
      )
    }
    shader.fragmentShader = fs
  }
  mat.customProgramCacheKey = () => key
  return mat
}
// Water surface for MeshBasicMaterial: radial feather + analytic view
// fresnel (plane normal is world +/-Y; cameraPosition is built in) +
// slow shimmer. Everything folds into diffuseColor (Basic is unlit).
function shadeWater(mat) {
  if (!mat || !mat.isMeshBasicMaterial) return mat
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShadeTime = shadeU.uTime
    shader.uniforms.uWaterRect = waterU.rect
    shader.vertexShader =
      'varying vec3 vShadeW;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n vShadeW = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      )
    let fs = 'varying vec3 vShadeW;\nuniform float uShadeTime;\nuniform vec4 uWaterRect;\n' + shader.fragmentShader
    fs = fs.replace(
      '#include <alphamap_fragment>',
      `#include <alphamap_fragment>
      {
        float rad = clamp(length(vShadeW.xz * vec2(0.125, 0.25)), 0.0, 1.0);
        diffuseColor.a *= mix(1.0, 0.55, smoothstep(0.2, 0.75, rad));
        vec3 wv = normalize(cameraPosition - vShadeW);
        float wf = pow(1.0 - abs(wv.y), 2.0);
        diffuseColor.a = clamp(diffuseColor.a * (0.85 + 0.3 * wf), 0.0, 1.0);
      }`
    )
    fs = fs.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        vec2 wuv = vShadeW.xz * 0.45 + vec2(uShadeTime * 0.020, -uShadeTime * 0.014);
        float ws = sin(wuv.x * 2.3 + uShadeTime * 0.07) * sin(wuv.y * 1.9 - uShadeTime * 0.05);
        diffuseColor.rgb += vec3(0.10, 0.22, 0.26) * (smoothstep(0.2, 1.0, abs(ws)) * 0.10);
        // Soft optical edge near the inner walls, strongest at grazing angles.
        vec2 ew = min(vShadeW.xz - uWaterRect.xy, uWaterRect.zw - vShadeW.xz);
        float edgeMask = 1.0 - smoothstep(0.0, 0.28, min(ew.x, ew.y));
        vec3 we2 = normalize(cameraPosition - vShadeW);
        float wf2 = pow(1.0 - abs(we2.y), 2.0);
        diffuseColor.rgb += vec3(0.35, 0.55, 0.60) * (edgeMask * (0.15 + 0.85 * wf2) * 0.05);
      }`
    )
    shader.fragmentShader = fs
  }
  mat.customProgramCacheKey = () => 'shade-water-basic'
  return mat
}
// Water volume for MeshBasicMaterial: vertical alpha gradient (clear top,
// denser bottom), teal shift downward, derivative-based edge Fresnel
// (no normal chunks in Basic), micro shimmer. All into diffuseColor.
function shadeVolume(mat) {
  if (!mat || !mat.isMeshBasicMaterial) return mat
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShadeTime = shadeU.uTime
    shader.uniforms.uVolTop = waterU.topY
    shader.uniforms.uVolBot = waterU.botY
    shader.vertexShader =
      'varying vec3 vShadeW;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n vShadeW = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      )
    let fs =
      'varying vec3 vShadeW;\nuniform float uShadeTime;\nuniform float uVolTop;\nuniform float uVolBot;\n' +
      shader.fragmentShader
    fs = fs.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      {
        float wdepth = clamp((uVolTop - vShadeW.y) / max(uVolTop - uVolBot, 0.001), 0.0, 1.0);
        float wshape = smoothstep(0.0, 1.0, wdepth);
        diffuseColor.a *= mix(0.35, 1.0, wshape);
        // Floor owns the bottom: fade the last stretch so no floating
        // translucent plane reads as a horizontal line.
        diffuseColor.a *= mix(0.2, 1.0, smoothstep(1.0, 0.82, wdepth));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.78, 0.95, 1.0) + vec3(0.0, 0.025, 0.04), wshape * 0.5);
        vec3 fdx = dFdx(vShadeW);
        vec3 fdy = dFdy(vShadeW);
        vec3 fn = normalize(cross(fdx, fdy));
        vec3 fv = normalize(cameraPosition - vShadeW);
        float vf = pow(1.0 - abs(dot(fn, fv)), 3.0);
        diffuseColor.rgb += vec3(0.35, 0.60, 0.68) * (vf * 0.10);
        float vs = sin(dot(vShadeW.xz, vec2(2.1, 1.7)) + uShadeTime * 0.05);
        diffuseColor.rgb += vec3(0.20, 0.35, 0.40) * (smoothstep(0.6, 1.0, abs(vs)) * 0.03);
      }`
    )
    shader.fragmentShader = fs
  }
  mat.customProgramCacheKey = () => 'shade-volume-basic'
  return mat
}
// One-time procedural canvas (no downloads): a soft radial contact blob.
let blobTex = null
function getBlobTexture() {
  if (blobTex) return blobTex
  const S = 128
  const cv = document.createElement('canvas')
  cv.width = cv.height = S
  const g = cv.getContext('2d')
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  gr.addColorStop(0, 'rgba(0,0,0,0.55)')
  gr.addColorStop(0.6, 'rgba(0,0,0,0.25)')
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, S, S)
  blobTex = new THREE.CanvasTexture(cv)
  return blobTex
}
// Elliptical table contact shadow (normalized radial falloff; the plane's
// non-uniform footprint scale turns it elliptical). Cached singleton texture.
let tableShadowTex = null
function getTableShadowTexture() {
  if (tableShadowTex) return tableShadowTex
  const W = 256
  const H = 128
  const cv = document.createElement('canvas')
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')
  const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2)
  gr.addColorStop(0, 'rgba(255,255,255,1)')
  gr.addColorStop(0.45, 'rgba(255,255,255,0.45)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, W, H)
  tableShadowTex = new THREE.CanvasTexture(cv)
  return tableShadowTex
}
// Soft contact disc (child of the receiving group so fades/visibility apply).
function contactDisc(radius, opacity) {
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2)
  const mat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity,
    map: getBlobTexture(),
    depthWrite: false,
  })
  const m = new THREE.Mesh(geo, mat)
  m.rotation.x = -Math.PI / 2
  m.renderOrder = 2
  return m
}

function buildScene({ hideFarRocks, liteWater = false } = {}) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x06121f)
  scene.fog = new THREE.FogExp2(0x06121f, 0.02)

  const ambient = new THREE.AmbientLight(0x9dc4e2, 0.3)
  const hemi = new THREE.HemisphereLight(0x9fd4e8, 0x8a7a52, 0.5)
  scene.add(ambient)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xdff2ff, 0.75)
  // Side/front key: shadows fall visibly left from the P0 camera instead of
  // hiding behind the installation. Elevation unchanged (~47°), soft pools.
  sun.position.set(6.5, 8.5, 4.5)
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0xffd9b0, 0.15)
  fill.position.set(4, 6, 5)
  scene.add(fill)
  const lightsBase = [
    [ambient, 0.3],
    [hemi, 0.5],
    [sun, 0.75],
    [fill, 0.15],
  ]

  const disposables = []
  const temp = { tank: [], floor: [], rocks: [], kelp: [], fish: [], water: [] }
  const mesh = (slot, geo, mat) => {
    disposables.push(geo, mat)
    const m = new THREE.Mesh(geo, mat)
    temp[slot].push(m)
    return m
  }
  const trackLoaded = (root, maxDim = 2048) => {
    downscaleTextures(root, maxDim, disposables)
    root.traverse((n) => {
      if (n.geometry && !disposables.includes(n.geometry)) disposables.push(n.geometry)
      if (n.material) {
        const mats = Array.isArray(n.material) ? n.material : [n.material]
        mats.forEach((m) => {
          if (!disposables.includes(m)) disposables.push(m)
        })
      }
    })
  }
  const retireTemp = (slot) => {
    temp[slot].forEach((o) => {
      if (o.parent) o.parent.remove(o)
      o.traverse((n) => {
        if (n.geometry) {
          n.geometry.dispose()
          const gi = disposables.indexOf(n.geometry)
          if (gi >= 0) disposables.splice(gi, 1)
        }
        if (n.material) {
          const mats = Array.isArray(n.material) ? n.material : [n.material]
          mats.forEach((m) => {
            m.dispose()
            const mi = disposables.indexOf(m)
            if (mi >= 0) disposables.splice(mi, 1)
          })
        }
      })
    })
    temp[slot].length = 0
  }

  // ---- TEMPORARY primitives: replaced per-slot as GLBs land + validate ----
  // TEMP tank shell (glass walls + dark frame).
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xbfdce8,
    transparent: true,
    opacity: 0.1,
    roughness: 0.05,
    metalness: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  // Phase 12R: lite keeps plain glass (no fresnel program).
  if (!liteWater) shadeMat(glassMat, { fresnel: 0.35 })
  const wallGeoX = new THREE.BoxGeometry(8, 5, 0.06)
  const wallGeoZ = new THREE.BoxGeometry(0.06, 5, 4)
  const back = mesh('tank', wallGeoX, glassMat)
  back.position.set(0, 2.5, -2)
  const front = mesh('tank', wallGeoX, glassMat)
  front.position.set(0, 2.5, 2)
  const left = mesh('tank', wallGeoZ, glassMat)
  left.position.set(-4, 2.5, 0)
  const right = mesh('tank', wallGeoZ, glassMat)
  right.position.set(4, 2.5, 0)
  // Structure always wins: glass tints over water, frame wins over glass.
  ;[back, front, left, right].forEach((w) => {
    w.renderOrder = 9
  })
  scene.add(back, front, left, right)

  const frameMat = new THREE.MeshStandardMaterial({ color: 0x232b33, roughness: 0.32, metalness: 0.35 })
  const postGeo = new THREE.BoxGeometry(0.18, 5.2, 0.18)
  const rimXGeo = new THREE.BoxGeometry(8.3, 0.18, 4.3)
  const rimZGeo = new THREE.BoxGeometry(0.18, 0.18, 4.3)
  disposables.push(postGeo, rimXGeo, rimZGeo, frameMat)
  const frame = new THREE.Group()
  temp.tank.push(frame)
  ;[[-4, -2], [4, -2], [-4, 2], [4, 2]].forEach(([x, z]) => {
    const post = new THREE.Mesh(postGeo, frameMat)
    post.position.set(x, 2.5, z)
    frame.add(post)
  })
  ;[0.05, 4.95].forEach((y) => {
    const rimX = new THREE.Mesh(rimXGeo, frameMat)
    rimX.position.set(0, y, 0)
    frame.add(rimX)
    ;[-4, 4].forEach((x) => {
      const rimZ = new THREE.Mesh(rimZGeo, frameMat)
      rimZ.position.set(x, y, 0)
      frame.add(rimZ)
    })
  })
  frame.traverse((o) => {
    if (o.isMesh) o.renderOrder = 10
  })
  scene.add(frame)

  // TEMP floor (sand slab, top at y=0).
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x8a7a58, roughness: 1 })
  // Phase 12R: lite keeps a plain sand material (no caustic program).
  if (!liteWater) shadeMat(floorMat, { caustic: 0.06, depth: true })
  const floor = mesh(
    'floor',
    new THREE.BoxGeometry(8, 0.3, 4),
    floorMat
  )
  floor.position.y = -0.15
  scene.add(floor)

  // Water surface plane at y=4. Rectangular edge feather: opaque core
  // with ~12% falloff on all four edges (fixed-function alpha, no
  // shader). Linear colorspace is correct for alpha maps.
  const alphaCanvas = document.createElement('canvas')
  alphaCanvas.width = 512
  alphaCanvas.height = 256
  const actx = alphaCanvas.getContext('2d')
  actx.fillStyle = '#ffffff'
  actx.fillRect(0, 0, 512, 256)
  actx.globalCompositeOperation = 'destination-out'
  const edgeFade = (x0, y0, x1, y1, fx, fy, fw, fh) => {
    const g = actx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, 'rgba(0,0,0,1)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    actx.fillStyle = g
    actx.fillRect(fx, fy, fw, fh)
  }
  edgeFade(0, 0, 61, 0, 0, 0, 61, 256) // left
  edgeFade(512, 0, 451, 0, 451, 0, 61, 256) // right
  edgeFade(0, 0, 0, 31, 0, 0, 512, 31) // top
  edgeFade(0, 256, 0, 225, 0, 225, 512, 31) // bottom
  const waterAlphaTex = new THREE.CanvasTexture(alphaCanvas)
  waterAlphaTex.wrapS = waterAlphaTex.wrapT = THREE.ClampToEdgeWrapping
  disposables.push(waterAlphaTex)
  // Lighting-independent water surface: stays readable at any camera angle.
  const waterMat = new THREE.MeshBasicMaterial({
    color: WATER_DEBUG ? 0x7fe8f5 : 0x3b8fa8,
    transparent: true,
    opacity: 0.35,
    alphaMap: waterAlphaTex,
    side: THREE.DoubleSide,
    depthWrite: false,
    toneMapped: false,
  })
  // Phase 12R: lite water is the plain translucent material above —
  // no shimmer/fresnel/edge programs, same footprint and opacity.
  if (!liteWater) shadeWater(waterMat)
  const water = mesh('water', new THREE.PlaneGeometry(8, 4), waterMat)
  water.rotation.x = -Math.PI / 2
  water.position.y = 4
  water.renderOrder = 3
  scene.add(water)

  // Water volume: thin transparent inner box (TOP clear -> teal bottom).
  // Sized seated by seatWater(); BackSide keeps fish crisp (single far layer).
  const waterVolMat = new THREE.MeshBasicMaterial({
    color: WATER_DEBUG ? 0x2f8a90 : 0x2f7890,
    transparent: true,
    opacity: WATER_DEBUG ? 0.15 : 0.045,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
  })
  // Phase 12R: lite volume is the plain translucent box above.
  if (!liteWater) shadeVolume(waterVolMat)
  const waterVolume = mesh('water', new THREE.BoxGeometry(1, 1, 1), waterVolMat)
  waterVolume.position.set(0, 2, 0)
  waterVolume.scale.set(8, 4, 4)
  waterVolume.renderOrder = 2
  scene.add(waterVolume)

  // TEMP rocks (per-piece value variation + caustics).
  const rockGeo = new THREE.DodecahedronGeometry(0.55, 0)
  disposables.push(rockGeo)
  const rockDefs = [
    { p: [-2.6, 0.69, -0.8], s: 1.35 },
    { p: [2.2, 0.63, -1.2], s: 0.95 },
    { p: [0.6, 0.59, 0.6], s: 0.75 },
    { p: [-3.5, 0.8, -8], s: 2.2, far: true },
    { p: [4, 1.1, -9], s: 2.8, far: true },
  ]
  const rockTone = [0x515c67, 0x5a6470, 0x49525c]
  rockDefs.forEach(({ p, s, far }, i) => {
    if (far && hideFarRocks) return // Open-air dive: external rocks removed
    const rm = new THREE.MeshStandardMaterial({
      color: far ? 0x2c3e52 : rockTone[i % rockTone.length],
      roughness: 0.9,
      flatShading: true,
    })
    // Phase 12R: lite keeps plain rock (no caustic program).
    if (!liteWater) shadeMat(rm, { caustic: 0.05, depth: true })
    disposables.push(rm)
    const r = new THREE.Mesh(rockGeo, rm)
    temp.rocks.push(r)
    r.position.set(...p)
    r.scale.setScalar(s)
    r.rotation.set(p[0], p[2], 0)
    scene.add(r)
  })

  // TEMP kelp (two-tone greens + caustics).
  const kelpGeo = new THREE.ConeGeometry(0.22, 1.4, 6)
  disposables.push(kelpGeo)
  const kelpDefs = [
    [-3.0, 0.5, 3.9],
    [3.0, -0.2, 3.2],
    [-0.8, 1.2, 2.5],
  ]
  const kelpTone = [0x25643f, 0x2e7347, 0x1f5736]
  kelpDefs.forEach(([x, z, h], i) => {
    const km = new THREE.MeshStandardMaterial({
      color: kelpTone[i % kelpTone.length],
      roughness: 0.7,
      flatShading: true,
    })
    // Phase 12R: lite keeps plain kelp (no caustic program).
    if (!liteWater) shadeMat(km, { caustic: 0.05, depth: true })
    disposables.push(km)
    const k = new THREE.Mesh(kelpGeo, km)
    temp.kelp.push(k)
    k.position.set(x, h / 2, z)
    k.scale.y = h / 1.4
    scene.add(k)
  })

  // TEMP fish placeholder (cone body + box tail).
  const fishMat = new THREE.MeshStandardMaterial({ color: 0xe8853d, roughness: 0.7 })
  const fish = new THREE.Group()
  const bodyGeo = new THREE.ConeGeometry(0.28, 0.9, 8)
  const tailGeo = new THREE.BoxGeometry(0.08, 0.35, 0.25)
  disposables.push(bodyGeo, tailGeo, fishMat)
  temp.fish.push(fish)
  const body = new THREE.Mesh(bodyGeo, fishMat)
  body.rotation.z = -Math.PI / 2
  const tail = new THREE.Mesh(tailGeo, fishMat)
  tail.position.x = -0.55
  fish.add(body, tail)
  fish.position.set(0, 2.6, 0)
  scene.add(fish)

  return { scene, water, waterMat, waterVolMat, disposables, temp, rockDefs, kelpDefs, trackLoaded, retireTemp, lightsBase }
}

export default function AquariumDivePrototype({ backdrop = false, integrated = false, onHealthy, onFail, onReturnComplete, onProgress, probeRef = null, children, diveProgress, introComplete = false, returningToP0 = false, qualityMode = 'normal' } = {}) {
  const mountRef = useRef(null)
  const heroRevealRef = useRef(null)
  const [debug, setDebug] = useState({ p: 0, phase: 'FRONT' })
  const [heroMounted, setHeroMounted] = useState(false)
  const fishBaseX = useRef(null)
  // Shared scroll state (singleton: zero added listeners). Read via ref
  // inside rAF so the render loop never drives React state per frame.
  const prog = useSectionProgress()
  const progRef = useRef(prog)
  progRef.current = prog
  const diveProgressRef = useRef(diveProgress)
  diveProgressRef.current = diveProgress
  // Return-to-P0 mirror (DIVE AGAIN): temporary visual rewind in the
  // existing tick. Not a replay — no auto-dive follows.
  const returningRef = useRef(returningToP0)
  returningRef.current = returningToP0
  const sceneCommandRef = useRef(null)
  const backdropRef = useRef(backdrop)
  const integratedRef = useRef(integrated)
  // Phase 12: adaptive quality. INIT (antialias) is read once at renderer
  // construction; RUNTIME applies live without recreating renderer/scene.
  const qualityModeRef = useRef(qualityMode)
  qualityModeRef.current = qualityMode
  const runtimeApplyRef = useRef(null)
  const cbRef = useRef({ onHealthy, onFail, onReturnComplete, onProgress })
  cbRef.current = { onHealthy, onFail, onReturnComplete, onProgress }

  useLayoutEffect(() => {
    if (!integratedRef.current || !prog.reduced || !sceneCommandRef.current) return
    sceneCommandRef.current(diveProgressRef.current ?? prog.dive)
  }, [prog.reduced, prog.dive, diveProgress])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false

    // Phase 13C: real readiness. Every fetch the active mode starts is
    // tracked; each contributes only when it settles (placed OR handled
    // absence). 100% additionally requires confirmed rendered frames.
    // All starts below run synchronously, so every settle observes the
    // final total. No timers, no interpolation. Declared here (before
    // first use) so no call can execute before initialization.
    const readiness = { total: 0, settled: 0, frames: 0, healthy: false }
    // Phase 14B: DEV-probe settle log (one entry per tracked fetch, bounded).
    // Written only; read by DiveProbe at 2Hz. Zero cost when probe absent
    // (array push per settle, no per-frame work).
    const readyT0 = performance.now()
    const settleLog = []
    const pendingStarts = new Map()
    const emit = (p) => {
      try {
        cbRef.current.onProgress && cbRef.current.onProgress(p)
      } catch { /* progress is advisory only */ }
    }
    const maybeHealthy = () => {
      if (cancelled || readiness.healthy) return
      if (readiness.settled < readiness.total) return
      if (readiness.frames < 3) return
      readiness.healthy = true
      emit(1)
      try {
        cbRef.current.onHealthy && cbRef.current.onHealthy()
      } catch { /* advisory only */ }
    }
    const noteSettle = (promise, ok) => {
      if (!cancelled) {
        const started = pendingStarts.get(promise)
        pendingStarts.delete(promise)
        settleLog.push({
          label: started ? started.label : 'asset',
          ms: performance.now() - (started ? started.start : readyT0),
          ok: ok !== false,
        })
        if (flog && started && settleLog.length <= 30) {
          try {
            flog(`settle ${started.label} ${(performance.now() - started.start).toFixed(0)}ms`)
          } catch { /* logging only */ }
        }
      }
      if (cancelled || readiness.healthy) return
      readiness.settled += 1
      const total = Math.max(readiness.total, 1)
      emit(0.15 + (0.7 * Math.min(readiness.settled, total)) / total)
      maybeHealthy()
    }
    const track = (promise, label = 'asset') => {
      readiness.total += 1
      pendingStarts.set(promise, { label, start: performance.now() })
      promise.then(
        () => noteSettle(promise, true),
        () => noteSettle(promise, false),
      )
      return promise
    }

    let renderer = null
    // Phase 12: INIT-time quality (antialias is construction-only and is
    // never toggled live — the renderer is created once, never recreated).
    const initQuality = resolveQuality(qualityModeRef.current)
    const qState = {
      mode: qualityModeRef.current,
      runtime: initQuality.runtime,
      frame: 0,
      lastW: 0,
      lastH: 0,
      lastDebugAt: 0,
      lastDebugPhase: '',
      applied: true,
    }
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: initQuality.init.antialias,
        powerPreference: initQuality.init.powerPreference,
        stencil: false,
      })
    } catch (err) {
      cbRef.current.onFail && cbRef.current.onFail(err)
      return
    }
    runtimeApplyRef.current = (nextMode) => {
      if (nextMode === qState.mode && qState.applied) return
      qState.applied = true
      const q = resolveQuality(nextMode)
      qState.mode = nextMode
      qState.runtime = q.runtime
      renderer.setPixelRatio(effectivePixelRatio(q.runtime))
      const wantShadow = q.runtime.shadows && !backdropRef.current
      if (renderer.shadowMap.enabled !== wantShadow) {
        renderer.shadowMap.enabled = wantShadow
        if (sceneData && sceneData.scene) {
          sceneData.scene.traverse((o) => {
            if (o.material) {
              const mats = Array.isArray(o.material) ? o.material : [o.material]
              mats.forEach((m) => { m.needsUpdate = true })
            }
          })
        }
      }
      if (sceneData && sceneData.lightsBase && sceneData.lightsBase[2]) {
        sceneData.lightsBase[2][0].castShadow = wantShadow
      }
      // Leaving lite's direct-render path: drop lite-sized plates so the
      // next transition rebuilds at full quality. Entering lite: release
      // the plates now so no full-res RT memory sits idle.
      if (trans) {
        const isLite = nextMode === 'lite'
        if (isLite || trans.liteSized) {
          trans.sceneRT.dispose()
          trans.skyRT.dispose()
          trans = null
        }
      }
      onFrame(mount.clientWidth, mount.clientHeight, true)
      if (reduced) rerender()
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.setPixelRatio(effectivePixelRatio(qState.runtime))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    mount.appendChild(renderer.domElement)
    emit(0.08)

    const sceneData = buildScene({ hideFarRocks: !backdropRef.current, liteWater: !qState.runtime.waterHigh })
    const { scene, waterMat, waterVolMat, disposables, temp, rockDefs, kelpDefs, trackLoaded, retireTemp, lightsBase } = sceneData
    emit(0.15)
    // Minecraft "SCROLL ME" sign: world-space prop, right of the tank.
    // World parent (furniture, not tank contents); nothing scrolls in DOM.
    const sign = createScrollSign(THREE, disposables)
    sign.group.position.set(sign.base.x, sign.base.y, sign.base.z)
    sign.group.rotation.y = sign.base.yaw
    scene.add(sign.group)
    // Dive-installation scroll cue: visible with the aquarium, fading as
    // the installation dissolves. Reads dive progress only (no new
    // listener, no React state). Backdrop mode has no dive: always shown.
    const updateSign = (tSec, diveP) => {
      const wide = mount.clientWidth >= 720
      if (backdropRef.current) {
        sign.group.visible = wide

        sign.group.position.set(
          sign.base.x,
          sign.base.y,
          sign.base.z
        )

        sign.group.rotation.set(
          0,
          sign.base.yaw,
          0
        )

        sign.mats.forEach((m) => {
          m.opacity = 1
        })

        return
      }

      const hidden = returningRef.current || !wide || diveP >= 0.94
      const fade = hidden
        ? 0
        : 1 - smooth(
            Math.min(
              Math.max((diveP - 0.78) / 0.16, 0),
              1
            )
          )

      sign.group.visible = fade > 0.02

      sign.group.position.set(
        sign.base.x,
        sign.base.y,
        sign.base.z
      )

      sign.group.rotation.set(
        0,
        sign.base.yaw,
        0
      )

      sign.mats.forEach((m) => {
        m.opacity = fade
      })

      if (SMOOTH_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(
          '[smooth-debug] SIGN STATE: diveP=%s signVisible=%s fade=%s position=%s scale=%s',
          Number(diveP).toFixed(3),
          sign.group.visible,
          fade.toFixed(3),
          JSON.stringify(
            sign.group.position.toArray().map((v) => Number(v.toFixed(3)))
          ),
          JSON.stringify(
            sign.group.scale.toArray().map((v) => Number(v.toFixed(3)))
          )
        )
      }
    }
    const WATER_VOL_LIGHT = new THREE.Color(0x3c8ea5)
    const WATER_VOL_DARK = new THREE.Color(0x24586d)
    const _waterC = new THREE.Color()
    const camera = new THREE.PerspectiveCamera(
      45,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      0.1,
      300
    )

    const baseBg = new THREE.Color(0x06121f)
    const deepBg = new THREE.Color(0x052033)
    const tmpBg = new THREE.Color()
    const loadedGroups = {}

    // Aquarium space: tank + contents share one parent so the fish inherits
    // the tank coordinate system instead of floating as world-space.
    // Scene -> AquariumRoot -> Tank/Floor/Rocks/Kelp/Coral/Fish.
    // Table/ground/sky stay in scene (furniture, not tank contents).
    const aquariumRoot = new THREE.Group()
    aquariumRoot.name = 'AquariumRoot'
    scene.add(aquariumRoot)
    // Aquarium-interior light layer: objects keep layer 0 (camera/shadows
    // unchanged) and gain layer 1, which only the hemi fill illuminates.
    const enableAquaLayer = (group) => {
      if (!group) return
      group.traverse((o) => {
        o.layers.enable(1)
      })
    }
    // Move TEMP aquarium primitives under the root (identity parent: same pose).
    Object.values(temp).forEach((arr) => {
      arr.forEach((o) => {
        if (o.parent === scene) {
          scene.remove(o)
          aquariumRoot.add(o)
        }
      })
    })
    enableAquaLayer(aquariumRoot)
    const AQUA_SCENE_NAMES = new Set(['tank.glb', 'floor.glb', 'rocks.glb', 'kelp.glb', 'coral', 'fish-a', 'fish-b', 'fish-c', 'butterfly-koi-a', 'butterfly-koi-b', 'shrimp-a', 'shrimp-b'])
    const aquaParentFor = (name) => (AQUA_SCENE_NAMES.has(name) ? aquariumRoot : scene)
    // Fish school: each inner root carries its own placement inside the
    // identity outer group. Animating inner roots avoids the old
    // double-transform (outer at 0 + inner offset).
    const fishList = [] // { node, cfg, rotY, base, range }
    const koiList = [] // { node, cfg, rotY, base, range } — butterfly koi, PoC only
    // Phase 12R: cached school array (was spread-allocated every frame).
    // Rebuilt only when school membership changes (async GLB landings).
    let schoolCache = null
    const tempFallback = {
      node: null,
      cfg: { s: 1, ox: 0, oy: 0, oz: 0, rotY: 0, speed: 0.5, bob: 0.15, sway: 0.6, depth: 0.2, phase: 0 },
      base: null,
      range: null,
    }
    const GROUND_Y0 = -1.65

    // Reveal pass (p >= 0.96): subordinate the scene without extra passes.
    // Lights dim, fog deepens slightly. Fish untouched: any world-space
    // offset here would eject it from the tank.
    const applyRevealVisuals = (k) => {
      lightsBase.forEach(([light, base]) => {
        light.intensity = base * (1 - 0.45 * k)
      })
      scene.fog.density += 0.05 * k
    }
    const revealK = (p) => smooth(Math.min(Math.max((p - 0.96) / 0.03, 0), 1))

    // Liquid reveal transition (single renderer/canvas, no composer).
    // p<0.62: direct scene render. 0.62-0.94: refractive scene->sky
    // dissolve via two full-res plates + one quad pass. p>=0.94: sky only.
    // Materials are never faded; the install set is only shown/hidden, so
    // glass/frame can never linger as a translucent ghost.
    let lastP = 0
    let trans = null
    // Grayscale interior-mask preview (?mask-debug=1, DEV only). Off = 0.
    const MASK_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('mask-debug')
        ? 1
        : 0
    // Sign visibility diagnostics (?smooth-debug=1, DEV only). Log-only
    // SIGN STATE per frame; no visible UI, no production noise.
    const SMOOTH_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('smooth-debug')
        ? 1
        : 0
    // Koi console diagnostics (?koi-debug=1, DEV only). No visible UI.
    const KOI_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('koi-debug')
        ? 1
        : 0
    // Shrimp console diagnostics (?shrimp-debug=1, DEV only). No visible UI.
    const SHRIMP_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('shrimp-debug')
        ? 1
        : 0
    // Tree console diagnostics (?tree-debug=1, DEV only). No visible UI.
    const TREE_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('tree-debug')
        ? 1
        : 0
    // Tree shadow-frustum diagnostics (?tree-shadow-debug=1, DEV only).
    // Log-only containment per tree; no material mutation, no visible UI.
    const TREE_SHADOW_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('tree-shadow-debug')
        ? 1
        : 0
    // Motion diagnostics (?motion-debug=1, DEV only). One console line:
    // fauna/flora counts + animation-loop active. No visible UI.
    const MOTION_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('motion-debug')
        ? 1
        : 0
    // Meadow diagnostics (?grass-debug=1, DEV only). Console: cluster /
    // instance counts, terrain sample range, material variants. No UI.
    const GRASS_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('grass-debug')
        ? 1
        : 0
    // Sky diagnostics (?sky-debug=1, DEV only). Console: active theme,
    // texture dims, plate scale, viewport ratio. No visible UI.
    const SKY_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('sky-debug')
        ? 1
        : 0
    // Horizon diagnostics (?horizon-debug=1, DEV only). Console: sky +
    // viewport aspect, cover scale, y-offset, terrain height range, and
    // the fog-driven horizon blend factor. No visible UI.
    const HORIZON_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('horizon-debug')
        ? 1
        : 0
    // Hilltop terrain diagnostics (?hill-debug=1, DEV only). Logs plateau
    // bounds + height range and wireframes the terrain. Off by default.
    const HILL_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('hill-debug')
        ? 1
        : 0
    // Table contact-shadow diagnostics (?table-shadow-debug=1, DEV only).
    // Renders the shadow plane cyan-white at 0.35 for footprint inspection.
    const TABLE_SHADOW_DEBUG =
      import.meta.env.DEV &&
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('table-shadow-debug')
        ? 1
        : 0
    const _rect = new THREE.Vector4(0.5, 0.5, 0.5, 0.5)
    const _pv = new THREE.Vector3()
    const _shadowWorld = new THREE.Vector3()
    // Project the tank inner cavity (excludes frame) to screen UV.
    // Returns false when unusable -> caller disables distortion that frame.
    const tankRectUV = () => {
      const inner = tankInnerBox()
      if (!inner) return false
      camera.updateMatrixWorld()
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (let i = 0; i < 8; i++) {
        _pv
          .set(
            i & 1 ? inner.max.x : inner.min.x,
            i & 2 ? inner.max.y : inner.min.y,
            i & 4 ? inner.max.z : inner.min.z
          )
          .applyMatrix4(camera.matrixWorldInverse)
        if (_pv.z > -0.05) return false // corner behind camera: mask off
        _pv.applyMatrix4(camera.projectionMatrix)
        const ux = _pv.x * 0.5 + 0.5
        const uy = _pv.y * 0.5 + 0.5
        if (ux < minX) minX = ux
        if (uy < minY) minY = uy
        if (ux > maxX) maxX = ux
        if (uy > maxY) maxY = uy
      }
      _rect.set(minX, minY, maxX, maxY)
      return true
    }
    const installSet = () => {
      const out = [aquariumRoot, tableGroupRef.current, poc.tableShadowGroup, poc.ground, poc.rig, poc.aquaFill, poc.aquaHemi, titleState.group, sign.group]
      if (poc.aquaSpot && poc.aquaSpot.target) out.push(poc.aquaSpot.target)
      return out.filter(Boolean)
    }
    const setInstallVisible = (v) => {
      installSet().forEach((o) => {
        // The sign owns its own dive-fade via updateSign; the install
        // lifecycle only ever hides it (dissolve/exit), never forces show.
        if (v && o === sign.group) return
        o.visible = v
      })
    }
    const ensureTransition = () => {
      if (trans) return trans
      const size = renderer.getDrawingBufferSize(new THREE.Vector2())
      const rtScale = qState.runtime.transitionScale || 1
      const samples = qState.runtime.transitionSamples || 0
      const mkRT = () => {
        const rt = new THREE.WebGLRenderTarget(Math.max(1, Math.round(size.x * rtScale)), Math.max(1, Math.round(size.y * rtScale)), { depthBuffer: true, samples })
        rt.texture.minFilter = THREE.LinearFilter
        rt.texture.magFilter = THREE.LinearFilter
        return rt
      }
      const sceneRT = mkRT()
      const skyRT = mkRT()
      const quadCam = new THREE.Camera()
      const quadScene = new THREE.Scene()
      const quadGeo = new THREE.BufferGeometry()
      quadGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
      quadGeo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2))
      const quadMat = new THREE.ShaderMaterial({
        uniforms: {
          tScene: { value: sceneRT.texture },
          tSky: { value: skyRT.texture },
          uDistort: { value: 0 },
          uDissolve: { value: 0 },
          uTime: { value: 0 },
          uAspect: { value: 1 },
          uTankRect: { value: new THREE.Vector4(0.5, 0.5, 0.5, 0.5) },
          uDebugMask: { value: 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }
        `,
        fragmentShader: `
          varying vec2 vUv;
          uniform sampler2D tScene;
          uniform sampler2D tSky;
          uniform float uDistort;
          uniform float uDissolve;
          uniform float uTime;
          uniform float uAspect;
          uniform vec4 uTankRect;
          uniform float uDebugMask;
          float hash21(vec2 p) {
            p = fract(p * vec2(123.34, 456.21));
            p += dot(p, p + 45.32);
            return fract(p.x * p.y);
          }
          float vnoise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            f = f * f * (3.0 - 2.0 * f);
            float a = hash21(i);
            float b = hash21(i + vec2(1.0, 0.0));
            float c = hash21(i + vec2(0.0, 1.0));
            float d = hash21(i + vec2(1.0, 1.0));
            return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
          }
          float fbm(vec2 p) {
            return vnoise(p) * 0.6 + vnoise(p * 2.13 + 11.7) * 0.4;
          }
          // Interior cavity mask: 1 inside the tank opening, 0 on the frame
          // and outside. Feather keeps the boundary invisible.
          float softRectMask(vec2 uv, vec4 r, float feather) {
            vec2 d = min(uv - r.xy, r.zw - uv);
            return smoothstep(0.0, feather, min(d.x, d.y));
          }
          void main() {
            vec2 uv = vUv;
            vec2 auv = vec2(uv.x * uAspect, uv.y);
            float interior = softRectMask(uv, uTankRect, 0.035);
            if (uDebugMask > 0.5) {
              gl_FragColor = vec4(vec3(interior), 1.0);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
              return;
            }
            float t = uTime;
            float n1 = fbm(auv * 3.0 + vec2(t * 0.08, t * 0.05));
            float n2 = fbm(auv * 3.0 + vec2(4.7, 9.2) - vec2(t * 0.06, t * 0.04));
            vec2 refr = (vec2(n1, n2) - 0.5) * (0.006 + 0.019 * uDistort) * uDistort * vec2(0.7, 1.0);
            vec4 sceneSharp = texture2D(tScene, uv);
            vec4 sceneRefr = texture2D(tScene, uv + refr * interior);
            vec4 sceneCol = mix(sceneSharp, sceneRefr, interior);
            vec4 skyCol = texture2D(tSky, uv);
            float mn = fbm(auv * 2.5 + vec2(t * 0.02, -t * 0.015));
            float edge = mix(1.25, -0.25, uDissolve);
            float mask = smoothstep(edge - 0.22, edge + 0.08, mn);
            sceneCol.rgb = mix(sceneCol.rgb, sceneCol.rgb * 0.92 + vec3(0.020, 0.035, 0.050), uDissolve * 0.35 * (1.0 - mask));
            gl_FragColor = mix(sceneCol, skyCol, mask);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
        depthTest: false,
        depthWrite: false,
      })
      quadScene.add(new THREE.Mesh(quadGeo, quadMat))
      trans = { sceneRT, skyRT, quadScene, quadCam, quadMat, liteSized: qState.mode === 'lite' }
      disposables.push(sceneRT, skyRT, quadGeo, quadMat)
      return trans
    }
    const renderFrame = (p, tSec) => {
      // Phase 12: lite skips the refractive dissolve plates (direct render)
      // but keeps the p>=0.94 install cut so the reveal still lands.
      if (qState.mode === 'lite') {
        setInstallVisible(p < 0.94)
        renderer.render(scene, camera)
        return
      }
      if (backdropRef.current || p < 0.62) {
        setInstallVisible(true)
        renderer.render(scene, camera)
        return
      }
      if (p >= 0.94) {
        setInstallVisible(false)
        renderer.render(scene, camera)
        return
      }
      const tr = ensureTransition()
      const u = tr.quadMat.uniforms
      u.uDistort.value = smooth(Math.min(Math.max((p - 0.62) / 0.22, 0), 1))
      u.uDissolve.value = smooth(Math.min(Math.max((p - 0.80) / 0.14, 0), 1))
      u.uTime.value = tSec % 3600
      u.uAspect.value = camera.aspect || 1
      if (tankRectUV()) u.uTankRect.value.copy(_rect)
      else u.uTankRect.value.set(0.5, 0.5, 0.5, 0.5)
      u.uDebugMask.value = MASK_DEBUG
      setInstallVisible(true)
      renderer.setRenderTarget(tr.sceneRT)
      renderer.render(scene, camera)
      setInstallVisible(false)
      renderer.setRenderTarget(tr.skyRT)
      renderer.render(scene, camera)
      setInstallVisible(true)
      renderer.setRenderTarget(null)
      renderer.render(tr.quadScene, tr.quadCam)
    }

    const applyProgress = (p) => {
      const { pos, tgt } = sampleKeys(p)
      // Phase 15A: narrow-portrait pullback. Desktop camera distance fits
      // an 8-unit tank in landscape, but at phone aspect (~0.46) the same
      // frustum crops the tank and title. Dolly back along the view axis
      // (angles/FOV/KEYS untouched), easing to 1.0 before P4 so the
      // underwater endpoint stays pixel-identical. Tablet/desktop unaffected.
      let px = pos[0], py = pos[1], pz = pos[2]
      const aspectNow = camera.aspect || 1
      if (aspectNow < 0.7) {
        const k = 1 + 0.35 * (1 - smooth(Math.min(Math.max((p - 0.7) / 0.2, 0), 1)))
        px = tgt[0] + (pos[0] - tgt[0]) * k
        py = tgt[1] + (pos[1] - tgt[1]) * k
        pz = tgt[2] + (pos[2] - tgt[2]) * k
      }
      camera.position.set(px, py, pz)
      camera.lookAt(...tgt)
      // Staged ENTER: explicit surface knots, then submerged. P0 water
      // rests near-invisible; pre-ENTER values hold from p=0.70 up.
      const surfStops = [
        [0.0, 0.15],
        [0.7, 0.35],
        [0.8, 0.42],
        [0.84, 0.5],
        [0.86, 0.55],
      ]
      let surf = 0.15
      for (let i = 0; i < surfStops.length - 1; i++) {
        const p0 = surfStops[i][0]
        const v0 = surfStops[i][1]
        const p1 = surfStops[i + 1][0]
        const v1 = surfStops[i + 1][1]
        if (p >= p0 && p <= p1) {
          surf = lerp(v0, v1, smooth((p - p0) / (p1 - p0)))
          break
        }
        if (p > p1) surf = v1
      }
      const kSub = smooth(Math.min(Math.max((p - 0.86) / 0.14, 0), 1))
      const kEnter = smooth(Math.min(Math.max((p - 0.75) / 0.25, 0), 1))
      waterMat.opacity = lerp(surf, 0.65, kSub)
      scene.fog.density = lerp(0.02, 0.075, kEnter)
      tmpBg.copy(baseBg).lerp(deepBg, kEnter)
      scene.background = tmpBg
      scene.fog.color.copy(tmpBg)
    }

    const applyCompact = (w) => {
      // Mobile: thin decorative density, same camera path.
      const compact = w < 720
      if (temp.kelp[2]) temp.kelp[2].visible = !compact
      const kelp = loadedGroups.kelp
      if (kelp) kelp.children.forEach((c, i) => {
        c.visible = compact ? i < 2 : true
      })
      const coral = loadedGroups.coral
      if (coral) coral.children.forEach((c, i) => {
        c.visible = compact ? i < 2 : true
      })
    }

    const loader = new GLTFLoader()

    // Dev-only fish-slot diagnostics. Production stays silent.
    const FISH_DEBUG = import.meta.env.DEV
    const flog = (...a) => {
      if (FISH_DEBUG) console.log('[fish-poc]', ...a)
    }
    const dlog = (tag, ...a) => {
      if (FISH_DEBUG) console.log(tag, ...a)
    }
    const fmtV = (v) => `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`

    const loadRequired = (name, url, place, opts = {}) => {
      const log = opts.log ? (...a) => dlog('[floor-poc]', ...a) : () => {}
      log('load start', new URL(url, window.location.href).href)
      return track(
        loader
          .loadAsync(url)
          .then((gltf) => {
          if (cancelled) return
          const res = place(gltf.scene)
          if (!res.ok) {
            console.warn(`[dive-poc] ${name} rejected (${res.reason}) — keeping TEMP primitive`)
            log('TEMP_FLOOR_VISIBLE', res.reason || 'validation rejected')
            return
          }
          log('retire temp.floor len', temp[res.slot] ? temp[res.slot].length : 'n/a')
          const retired = res.slot && temp[res.slot] ? temp[res.slot].slice() : []
          retireTemp(res.slot)
          aquaParentFor(name).add(res.group)
          // Phase 12R: cap GLB texture dims before first upload (lite 512).
          trackLoaded(res.group, qState.runtime.texCap)
          if (aquaParentFor(name) === aquariumRoot) enableAquaLayer(res.group)
          if (res.ref) loadedGroups[res.ref] = res.group
          if (name === 'tank.glb') loadedGroups.tank = res.group
          if (lastP >= 0.94) res.group.visible = false
          log('temp.floor len after', temp[res.slot] ? temp[res.slot].length : 'n/a')
          if (retired.some((o) => o.parent)) {
            log('BOTH_FLOOR_VISIBLE', 'retired mesh still in scene')
          } else {
            log('FLOOR_GLTF_ACTIVE')
          }
          if (reduced) rerender()
        })
        .catch(() => {
          console.warn(`[dive-poc] ${name} missing/unreadable — keeping TEMP primitive`)
          log('TEMP_FLOOR_VISIBLE', 'loader rejected')
        }),
        name
      )
    }

    // Optional-silent: absent stays absent, no fallback, no noise.
    // A place-result naming `slot` retires that TEMP primitive on success.
    // Pass { log: true } to enable dev-only diagnostics for one call.
    const loadOptional = (name, url, place, opts = {}) => {
      const log = opts.log ? flog : () => {}
      log('load start', new URL(url, window.location.href).href)
      return track(
        loader
          .loadAsync(url)
          .then((gltf) => {
          if (cancelled) return
          const res = place(gltf.scene)
          if (!res.ok) {
            log('FISH_TEMP_FALLBACK', res.reason || 'validation rejected')
            return
          }
          if (res.slot) retireTemp(res.slot)
          aquaParentFor(name).add(res.group)
          // Phase 12R: cap GLB texture dims before first upload (lite 512).
          trackLoaded(res.group, qState.runtime.texCap)
          if (aquaParentFor(name) === aquariumRoot) enableAquaLayer(res.group)
          loadedGroups[name] = res.group
          if (lastP >= 0.94) res.group.visible = false
          log('FISH_GLTF_ACTIVE')
          applyCompact(mount.clientWidth)
          if (reduced) rerender()
        })
        .catch((err) => {
          log('loader error', err?.message || err)
          log('FISH_TEMP_FALLBACK', 'loader rejected')
          /* silent by design (unless opts.log) */
        }),
        name
      )
    }

    // ---- Open-air dive environment (distant sky dome + matte ground + table) ----
    // The backdrop branch never creates these.
    let themeObs = null
    const tableGroupRef = { current: null }
    const poc = {
      skyDay: null, skyNight: null, skyDayMat: null, skyNightMat: null,
      ground: null, k: 0, tgt: 0,
      rig: null, aquaRect: null, aquaSpot: null, aquaFill: null, aquaHemi: null,
      waterBoundsHelper: null, waterBoundsBox: null,
    }
    const AQUA_WARM = new THREE.Color(0xfff4df)
    const AQUA_COOL = new THREE.Color(0xe8f0ff)
    // Cinematic 3D title state (scene-level group, not under aquariumRoot).
    const titleState = { group: null, mat: null, baseY: 0, baseS: 1, baseZ: 0 }
    const TITLE_LIGHT = new THREE.Color(0xfff8e8)
    const TITLE_DARK = new THREE.Color(0xf2f7ff)
    const _titleC = new THREE.Color()
    const _aquaC = new THREE.Color()
    const _aquaV = new THREE.Vector3()
    // 1 large focal + 1 medium + 1 small; offsets are fractions of the
    // live safe-volume W/H/D around its center (see placeFishes).
    const FISH_CFG = [
      { s: 1.0, ox: 0.18, oy: 0.18, oz: 0.05, rotY: 0, speed: 0.5, bob: 0.1, sway: 0.12, depth: 0.1, phase: 0.0 },
      { s: 0.6, ox: -0.22, oy: 0.3, oz: -0.2, rotY: Math.PI - 0.25, speed: 0.42, bob: 0.07, sway: 0.1, depth: 0.08, phase: 2.1 },
      { s: 0.49, ox: -0.05, oy: -0.18, oz: 0.18, rotY: 0.55, speed: 0.38, bob: 0.06, sway: 0.08, depth: 0.12, phase: 4.0 },
    ]
    // Butterfly koi: same record shape/center convention as FISH_CFG.
    // A outer-left/front, B outer-right/back; slow ornamental motion.
    const KOI_CFG = [
      { s: 1.0, ox: -0.2, oy: 0.15, oz: 0.18, rotY: -0.15, speed: 0.25, bob: 0.06, sway: 0.08, depth: 0.06, phase: 0.8 },
      { s: 0.9, ox: 0.27, oy: 0.06, oz: -0.2, rotY: Math.PI + 0.18, speed: 0.21, bob: 0.05, sway: 0.07, depth: 0.05, phase: 3.0 },
    ]
    // Floor-walking shrimp (PoC only): region centers + roam radii in
    // aquarium-local units; base Y sits just into the sand (~0.375).
    const SHRIMP_CFG = [
      { cx: -1.7, cz: 1.0, r: 0.45, floorY: 0.375, speed: 0.12, phase: 0.3 },
      { cx: 1.8, cz: 0.9, r: 0.45, floorY: 0.375, speed: 0.09, phase: 1.7 },
    ]
    const shrimpList = [] // { node, cfg, heading, walk, floorY }
    const kelpSway = [] // { pivot, phase } — kelp GLB clones, base-pivot sway
    const treeSway = [] // { root, phase, amp } — tree clone inner roots
    let motionLogged = false
    const _pocC = new THREE.Color()
    const _pocD = new THREE.Color()
    const _horC = new THREE.Vector3()
    const POC_DAY = {
      sun: [new THREE.Color(0xffe8c8), 2.2],
      hemiSky: new THREE.Color(0xbfd9ff), hemiGround: new THREE.Color(0x8a7a52), hemi: 0.9,
      amb: [new THREE.Color(0xcfe0ee), 0.5],
      fill: [new THREE.Color(0xffd9b0), 0.4],
      exposure: 1.0, fog: new THREE.Color(0xc8d4de),
    }
    const POC_NIGHT = {
      sun: [new THREE.Color(0x9db8ff), 0.35],
      hemiSky: new THREE.Color(0x33415e), hemiGround: new THREE.Color(0x1a1f2a), hemi: 0.25,
      amb: [new THREE.Color(0x2a3a55), 0.15],
      fill: [new THREE.Color(0x6a86b8), 0.1],
      exposure: 0.85, fog: new THREE.Color(0x0a1628),
    }
    const POC_DEEP = new THREE.Color(0x052033)
    const POC_SKY_DIM = new THREE.Color(0xe2e8ec)
    const nightLiftMaterials = []
    const nightLiftSeen = new WeakSet()
    const trackNightLift = (material, factor) => {
      if (!material.color || nightLiftSeen.has(material)) return
      nightLiftSeen.add(material)
      nightLiftMaterials.push([material, material.color.clone(), factor])
    }

    const tankOuterBox = () => {
      const box = new THREE.Box3()
      let found = false
      const consider = (o) => {
        if (!o) return
        o.updateMatrixWorld(true)
        box.expandByObject(o)
        found = true
      }
      if (loadedGroups.tank) consider(loadedGroups.tank)
      else (temp.tank || []).forEach(consider)
      return found ? box : null
    }
    const tankBaseY = () => {
      const b = tankOuterBox()
      return b ? b.min.y : 0.0
    }
    // Inner volume: outer glass/frame inset (matches tank.glb frame ~0.18
    // + glass ~0.06). ponytail: fixed inset heuristic, measure glass if retopologized.
    const tankInnerBox = () => {
      const b = tankOuterBox()
      if (!b) return null
      const inset = new THREE.Vector3(0.15, 0.19, 0.14)
      const inner = b.clone()
      inner.min.x += inset.x
      inner.max.x -= inset.x
      inner.min.z += inset.z
      inner.max.z -= inset.z
      inner.min.y += inset.y
      inner.max.y -= inset.y
      return inner
    }
    // Seat the dive sign from live tank bounds (P0 composition): right of
    // the tank beside the front glass, feet on the terrain, facing left
    // toward the aquarium. The gap clears the yaw-projected plank
    // half-width (~0.94 at 27°); X/Z are static afterwards, Y is re-seated
    // in seatTable() once async loads settle the ground.
    {
      const tb = tankOuterBox()
      const right = tb ? tb.max.x : 4.15
      const footY = (poc.ground ? poc.ground.position.y : GROUND_Y0) + 0.02
      sign.base = { x: right + 2.5, y: footY, z: 1.0, yaw: -0.47 }
      sign.group.position.set(sign.base.x, sign.base.y, sign.base.z)
      sign.group.rotation.y = sign.base.yaw
    }
    // (Re)seat every loaded fish from the live inner box. Called on fish
    // load and on tank load, covering either arrival order. Each node keeps
    // only its own offset (no outer-group transform); bases are nulled for
    // lazy recapture by the swim loop.
    const placeFishes = () => {
      if (!fishList.length) return
      const inner = tankInnerBox()
      const cx = inner ? (inner.min.x + inner.max.x) / 2 : 0
      const cy = inner ? (inner.min.y + inner.max.y) / 2 : 2.6
      const cz = inner ? (inner.min.z + inner.max.z) / 2 : 0
      const W = inner ? inner.max.x - inner.min.x : 7.5
      const H = inner ? inner.max.y - inner.min.y : 4.4
      const D = inner ? inner.max.z - inner.min.z : 3.7
      fishList.forEach((rec) => {
        let nx = cx + rec.cfg.ox * W
        let ny = cy + rec.cfg.oy * H
        let nz = cz + rec.cfg.oz * D
        if (inner) {
          nx = Math.min(inner.max.x, Math.max(inner.min.x, nx))
          ny = Math.min(inner.max.y, Math.max(inner.min.y, ny))
          nz = Math.min(inner.max.z, Math.max(inner.min.z, nz))
        }
        rec.node.position.set(nx, ny, nz)
        rec.node.rotation.set(0, rec.rotY, 0)
        rec.node.updateMatrixWorld(true)
        rec.base = null
        rec.range = null
      })
    }
    // Koi twin of placeFishes: same live-box center/clamp convention.
    const placeKois = () => {
      if (!koiList.length) return
      const inner = tankInnerBox()
      const cx = inner ? (inner.min.x + inner.max.x) / 2 : 0
      const cy = inner ? (inner.min.y + inner.max.y) / 2 : 2.6
      const cz = inner ? (inner.min.z + inner.max.z) / 2 : 0
      const W = inner ? inner.max.x - inner.min.x : 7.5
      const H = inner ? inner.max.y - inner.min.y : 4.4
      const D = inner ? inner.max.z - inner.min.z : 3.7
      koiList.forEach((rec) => {
        let nx = cx + rec.cfg.ox * W
        let ny = cy + rec.cfg.oy * H
        let nz = cz + rec.cfg.oz * D
        if (inner) {
          nx = Math.min(inner.max.x, Math.max(inner.min.x, nx))
          ny = Math.min(inner.max.y, Math.max(inner.min.y, ny))
          nz = Math.min(inner.max.z, Math.max(inner.min.z, nz))
        }
        rec.node.position.set(nx, ny, nz)
        rec.node.rotation.set(0, rec.rotY, 0)
        rec.node.updateMatrixWorld(true)
        rec.base = null
        rec.range = null
      })
    }
    // Seat shrimp on the sand inside their floor regions. Called on shrimp
    // load and on tank load, covering either arrival order. Heading faces
    // the tank center; walk state resets so motion restarts deterministically.
    const placeShrimps = () => {
      if (!shrimpList.length) return
      const inner = tankInnerBox()
      const m = 0.45
      const bx0 = inner ? inner.min.x + m : -3.5
      const bx1 = inner ? inner.max.x - m : 3.5
      const bz0 = inner ? inner.min.z + m : -1.5
      const bz1 = inner ? inner.max.z - m : 1.5
      shrimpList.forEach((rec) => {
        const cx = Math.min(bx1, Math.max(bx0, rec.cfg.cx))
        const cz = Math.min(bz1, Math.max(bz0, rec.cfg.cz))
        const r = Math.min(rec.cfg.r, (bx1 - bx0) / 2, (bz1 - bz0) / 2)
        rec.region = { x0: cx - r, x1: cx + r, z0: cz - r, z1: cz + r }
        rec.node.position.set(cx, rec.cfg.floorY, cz)
        rec.heading = Math.atan2(-(0 - cz), 0 - cx)
        rec.node.rotation.set(0, rec.heading, 0)
        rec.node.updateMatrixWorld(true)
        rec.walk = { mode: 0, t: -rec.cfg.phase, heading: rec.heading, dir: 1, cycle: 0 }
      })
    }
    const seatTable = () => {
      const tg = tableGroupRef.current
      const tb = tankOuterBox()
      if (!tg || !tb) return
      const tc = new THREE.Vector3()
      tb.getCenter(tc)
      tg.updateMatrixWorld(true)
      const b = new THREE.Box3().setFromObject(tg)
      const bc = new THREE.Vector3()
      b.getCenter(bc)
      // Share tank X/Z center: one physical installation, not viewport centered.
      tg.position.x += tc.x - bc.x
      tg.position.z += tc.z - bc.z
      tg.updateMatrixWorld(true)
      const b2 = new THREE.Box3().setFromObject(tg)
      // Top flush with tank underside.
      tg.position.y += tb.min.y + 0.005 - b2.max.y
      if (poc.ground) {
        tg.updateMatrixWorld(true)
        const nb = new THREE.Box3().setFromObject(tg)
        if (Number.isFinite(nb.min.y)) poc.ground.position.y = nb.min.y - 0.01
        // Re-seat the sign feet on the settled terrain (foot origin + offset).
        sign.base.y = poc.ground.position.y + 0.02
      }
      // Contact blobs ride the table group (world units: outer group is
      // unscaled), so they hide with the table at P1. Subtle by design.
      tg.updateMatrixWorld(true)
      const fb = new THREE.Box3().setFromObject(tg)
      const fw = fb.max.x - fb.min.x
      const fd = fb.max.z - fb.min.z
      const fc = new THREE.Vector3()
      fb.getCenter(fc)
      // Sun-oriented table shadows (world-space sibling group, same space as
      // terrain): a displaced footprint ellipse + one contact ellipse per
      // foot. Static layout refreshed here on table/tank load; P1 hiding
      // rides installSet, so no per-frame work is needed.
      const sun = lightsBase[2][0]
      _shadowWorld.set(sun.position.x - fc.x, 0, sun.position.z - fc.z)
      let sdx = 0
      let sdz = 0
      const sdl = Math.hypot(_shadowWorld.x, _shadowWorld.z)
      if (sdl > 1e-4) {
        sdx = -_shadowWorld.x / sdl
        sdz = -_shadowWorld.z / sdl
      }
      const sDirChanged =
        !poc.tableShadowDir ||
        Math.abs(poc.tableShadowDir.x - sdx) > 1e-4 ||
        Math.abs(poc.tableShadowDir.z - sdz) > 1e-4
      if (sDirChanged) poc.tableShadowDir = { x: sdx, z: sdz }
      const tableH = Math.max(fb.max.y - fb.min.y, 0.001)
      const soff = tableH * 0.08
      const scx = fc.x + sdx * soff
      const scz = fc.z + sdz * soff
      const terrainY = poc.ground ? poc.ground.position.y : fb.min.y - 0.01
      if (!poc.tableShadowGroup) {
        const dbg = TABLE_SHADOW_DEBUG ? 1 : 0
        const g = new THREE.Group()
        g.name = 'TableShadow'
        const geo = new THREE.PlaneGeometry(1, 1)
        const fpMat = new THREE.MeshBasicMaterial({
          color: dbg ? 0x00ffff : 0x070b0e,
          transparent: true,
          opacity: dbg ? 0.35 : 0.24,
          map: getTableShadowTexture(),
          depthWrite: false,
          toneMapped: false,
        })
        const fp = new THREE.Mesh(geo, fpMat)
        fp.rotation.x = -Math.PI / 2
        fp.renderOrder = 2
        g.add(fp)
        const footMat = new THREE.MeshBasicMaterial({
          color: dbg ? 0xffff00 : 0x05090c,
          transparent: true,
          opacity: dbg ? 0.35 : 0.21,
          map: getTableShadowTexture(),
          depthWrite: false,
          toneMapped: false,
        })
        const feet = []
        for (let i = 0; i < 4; i++) {
          const fm = new THREE.Mesh(geo, footMat)
          fm.rotation.x = -Math.PI / 2
          fm.renderOrder = 2
          g.add(fm)
          feet.push(fm)
        }
        if (dbg) {
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(),
            new THREE.Vector3(),
          ])
          const line = new THREE.Line(
            lineGeo,
            new THREE.LineBasicMaterial({ color: 0x00ffff, toneMapped: false })
          )
          g.add(line)
          poc.tableShadowLine = line
          disposables.push(lineGeo, line.material)
        }
        disposables.push(geo, fpMat, footMat)
        poc.tableShadowGroup = g
        poc.tableShadowFoot = fp
        poc.tableShadowFeet = feet
        scene.add(g)
        if (lastP >= 0.94) g.visible = false
      }
      const fp = poc.tableShadowFoot
      fp.position.set(scx, terrainY + 0.006, scz)
      fp.scale.set(fw * 1.0, fd * 0.75 * 1.175, 1)
      fp.rotation.set(-Math.PI / 2, 0, Math.atan2(-sdz, sdx))
      const footW = Math.max(fw * 0.104, 0.3)
      const footD = Math.max(fd * 0.104, 0.3)
      const fx = [fc.x - fw * 0.38, fc.x + fw * 0.38]
      const fz = [fc.z - fd * 0.38, fc.z + fd * 0.38]
      poc.tableShadowFeet.forEach((fm, i) => {
        fm.position.set(fx[i % 2], terrainY + 0.006, fz[(i / 2) | 0])
        fm.scale.set(footW, footD, 1)
      })
      if (poc.tableShadowLine) {
        const lp = poc.tableShadowLine.geometry.attributes.position
        lp.setXYZ(0, fc.x, terrainY + 0.02, fc.z)
        lp.setXYZ(1, fc.x + sdx * 3, terrainY + 0.02, fc.z + sdz * 3)
        lp.needsUpdate = true
      }
      if (!poc.tankBlob) {
        poc.tankBlob = contactDisc(0.5, 0.22)
        tg.add(poc.tankBlob)
      }
      poc.tankBlob.position.set(
        tc.x - tg.position.x,
        tb.min.y - tg.position.y + 0.003,
        tc.z - tg.position.z
      )
      poc.tankBlob.scale.set((tb.max.x - tb.min.x) * 0.98, (tb.max.z - tb.min.z) * 0.98, 1)
    }

    // Water surface + volume follow the live inner bounds (fallback = design).
    // Waterline sits at 88% of inner height (~12% air gap). Also feeds the
    // waterline/volume shader uniforms (shared by reference).
    const seatWater = () => {
      const w = temp.water[0]
      const vol = temp.water[1]
      if (!w) return
      const inner = tankInnerBox()
      const W = inner ? inner.max.x - inner.min.x : 8
      const D = inner ? inner.max.z - inner.min.z : 4
      const minY = inner ? inner.min.y : 0
      const topY = inner ? minY + (inner.max.y - inner.min.y) * 0.88 : 4
      const cx = inner ? (inner.min.x + inner.max.x) / 2 : 0
      const cz = inner ? (inner.min.z + inner.max.z) / 2 : 0
      // Surface stays 0.10 inside the glass on every side.
      w.scale.set(Math.max(W - 0.2, 0.001) / 8, Math.max(D - 0.2, 0.001) / 4, 1)
      w.position.set(cx, topY, cz)
      w.updateMatrixWorld(true)
      if (vol) {
        // Box top sits 0.02 below the surface: no coplanar double-blend.
        const vTop = topY - 0.02
        const H = Math.max(vTop - minY, 0.001)
        vol.scale.set(Math.max(W - 0.16, 0.001), H, Math.max(D - 0.16, 0.001))
        vol.position.set(cx, minY + H / 2, cz)
        vol.updateMatrixWorld(true)
      }
      if (inner) {
        waterU.rect.value.set(inner.min.x, inner.min.z, inner.max.x, inner.max.z)
        waterU.topY.value = topY
        waterU.botY.value = 0
      }
      // Debug bounds helper: proves the seated volume stays inside the glass.
      if (WATER_DEBUG && vol) {
        if (!poc.waterBoundsHelper) {
          poc.waterBoundsBox = new THREE.Box3()
          poc.waterBoundsHelper = new THREE.Box3Helper(poc.waterBoundsBox, 0xffff00)
          aquariumRoot.add(poc.waterBoundsHelper)
          disposables.push(poc.waterBoundsHelper)
        }
        poc.waterBoundsBox.setFromObject(vol)
      }
    }
    seatWater()

    // Aquarium LED rig follows the measured tank bounds (scene-level group;
    // tank group transform is identity with offsets on the inner root, so a
    // recompute tracks content better than parenting). No shadows: illumination only.
    const seatAquariumLight = () => {
      if (!poc.rig || !poc.aquaRect) return
      const box = new THREE.Box3()
      let found = false
      const consider = (o) => {
        if (!o) return
        o.updateMatrixWorld(true)
        box.expandByObject(o)
        found = true
      }
      if (loadedGroups.tank) consider(loadedGroups.tank)
      else (temp.tank || []).forEach(consider)
      if (!found) return
      const size = new THREE.Vector3()
      const center = new THREE.Vector3()
      box.getSize(size)
      box.getCenter(center)
      if (![size.x, size.y, size.z, center.x, center.y, center.z, box.max.y].every(Number.isFinite)) return
      if (size.x <= 0 || size.z <= 0) return
      poc.rig.position.set(center.x, box.max.y + 0.5, center.z)
      poc.aquaRect.width = size.x * 0.75
      poc.aquaRect.height = size.z * 0.55
      poc.rig.updateMatrixWorld(true)
      _aquaV.set(center.x, center.y, center.z)
      poc.aquaRect.lookAt(_aquaV)
      // Soft interior fill: front-top, aimed into the tank. No shadows,
      // one-sided emission keeps it off the outdoor ground.
      if (poc.aquaFill) {
        poc.aquaFill.position.set(center.x, center.y + 1.2, center.z + size.z * 0.45)
        poc.aquaFill.width = size.x * 0.8
        poc.aquaFill.height = size.y * 0.6
        poc.aquaFill.updateMatrixWorld(true)
        _aquaV.set(center.x, center.y - 0.5, center.z)
        poc.aquaFill.lookAt(_aquaV)
      }
      if (poc.aquaSpot) {
        poc.aquaSpot.target.position.copy(_aquaV)
        poc.aquaSpot.target.updateMatrixWorld(true)
      }
    }

    // PoC outdoor state: sky crossfade + lights + subtle underwater veil.
    // No React state; called from rAF with dt seconds.
    const updateOutdoor = (dt, p, tSec, snap) => {
      if (!poc.skyDayMat || !poc.skyNightMat) return
      // Shared HD-shader clock (caustics/shimmer). Frozen on snap frames.
      if (!snap && Number.isFinite(tSec)) shadeU.uTime.value = tSec % 3600
      if (snap) poc.k = poc.tgt
      else poc.k += (poc.tgt - poc.k) * (1 - Math.exp(-dt / 0.35))
      if (Math.abs(poc.tgt - poc.k) < 0.001) poc.k = poc.tgt
      const k = poc.k
      for (let i = 0; i < nightLiftMaterials.length; i++) {
        const [material, baseColor, factor] = nightLiftMaterials[i]
        material.color.copy(baseColor).multiplyScalar(1 + (factor - 1) * k)
      }
      const kEnter = smooth(Math.min(Math.max((p - 0.75) / 0.25, 0), 1))
      const kReveal = revealK(p)
      // Sky: distant background layer; slight veil underwater via opacity dip
      // + tiny neutral dim only. Never recolored teal.
      const veil = 1 - 0.12 * kEnter
      poc.skyDayMat.opacity = (1 - k) * veil
      poc.skyNightMat.opacity = k * veil
      horizonU.k.value = k
      _pocC.setRGB(1, 1, 1).lerp(POC_SKY_DIM, kEnter * 0.5)
      poc.skyDayMat.color.copy(_pocC)
      poc.skyNightMat.color.copy(_pocC)
      // Lights: day/night lerp, reveal + underwater subordinate, stay readable.
      // Phase 12R: static destructure (was lightsBase.map every frame).
      const dim = (1 - 0.45 * kReveal) * (1 - 0.25 * kEnter)
      const sun = lightsBase[0][0]
      const hemi = lightsBase[1][0]
      const ambient = lightsBase[2][0]
      const fill = lightsBase[3][0]
      sun.color.copy(POC_DAY.sun[0]).lerp(POC_NIGHT.sun[0], k)
      sun.intensity = lerp(POC_DAY.sun[1], POC_NIGHT.sun[1], k) * dim
      hemi.color.copy(POC_DAY.hemiSky).lerp(POC_NIGHT.hemiSky, k)
      hemi.groundColor.copy(POC_DAY.hemiGround).lerp(POC_NIGHT.hemiGround, k)
      hemi.intensity = lerp(POC_DAY.hemi, POC_NIGHT.hemi, k) * dim
      ambient.color.copy(POC_DAY.amb[0]).lerp(POC_NIGHT.amb[0], k)
      ambient.intensity = lerp(POC_DAY.amb[1], POC_NIGHT.amb[1], k) * dim
      fill.color.copy(POC_DAY.fill[0]).lerp(POC_NIGHT.fill[0], k)
      fill.intensity = lerp(POC_DAY.fill[1], POC_NIGHT.fill[1], k) * dim
      if (renderer) renderer.toneMappingExposure = lerp(POC_DAY.exposure, POC_NIGHT.exposure, k)
      // Fog: haze by theme, deep teal by depth. Density stays on the shared
      // applyProgress curve so the ground edge stays buried.
      _pocD.copy(POC_DAY.fog).lerp(POC_NIGHT.fog, k).lerp(POC_DEEP, kEnter)
      scene.fog.color.copy(_pocD)
      // Aquarium LED: active in both themes, subtly underwater with depth.
      if (poc.aquaRect) {
        const themeMult = lerp(1.0, 0.8, k)
        // LED flat through the FRONT->TOP move (1.00 at 0.63/0.65, 0.98 at
        // 0.70); underwater release lands on the 0.85 floor at p=1.
        const ledK =
          1 - 0.02 * smooth(Math.min(Math.max((p - 0.63) / 0.07, 0), 1)) -
          0.13 * smooth(Math.min(Math.max((p - 0.7) / 0.15, 0), 1))
        const aquaMult = themeMult * ledK * (1 - 0.2 * kReveal)
        poc.aquaRect.intensity = 5 * aquaMult
        poc.aquaRect.color.copy(AQUA_WARM).lerp(AQUA_COOL, Math.min(1, k * 0.5 + kEnter * 0.5))
        if (poc.aquaSpot) {
          poc.aquaSpot.intensity = 0.65 * aquaMult
          poc.aquaSpot.color.copy(poc.aquaRect.color)
        }
        if (poc.aquaHemi) {
          poc.aquaHemi.intensity = 0.5 * ledK
        }
      }
      if (poc.aquaFill) poc.aquaFill.intensity = 0.45 + 0.08 * k
      // Title: subtle progress-driven parallax/tilt only (camera does the rest);
      // material follows the day/night blend without geometry rebuilds.
      if (titleState.group && titleState.mat) {
        titleState.group.position.y =
          titleState.baseY + 0.3 * smooth(Math.min(Math.max((p - 0.2) / 0.4, 0), 1))
        titleState.group.rotation.x = -0.04 * smooth(Math.min(Math.max((p - 0.5) / 0.15, 0), 1))
        // Cinematic departure (world-anchored; the camera does the leaving):
        // continued rise + recession + slight settle-scale across 0.45-0.90
        // so the title exits the composition before the 0.94 install cut.
        // Deterministic, no looping, no camera tracking.
        const tLeave = smooth(Math.min(Math.max((p - 0.45) / 0.45, 0), 1))
        titleState.group.position.y += 1.2 * tLeave
        titleState.group.position.z = titleState.baseZ - 1.0 * tLeave
        titleState.group.scale.setScalar(titleState.baseS * (1 - 0.2 * tLeave))
        titleState.group.rotation.x += -0.06 * tLeave
        _titleC.copy(TITLE_LIGHT).lerp(TITLE_DARK, k)
        titleState.mat.color.copy(_titleC)
        titleState.mat.emissive.copy(_titleC)
      }
      // Water volume theme response (surface/rim colors stay fixed).
      if (waterVolMat && !WATER_DEBUG) {
        _waterC.copy(WATER_VOL_LIGHT).lerp(WATER_VOL_DARK, k)
        waterVolMat.color.copy(_waterC)
      }
      // Fish school: independent bounded loops in aquarium-local space.
      // Each inner root carries only its own placement (outer stays identity).
      // Phase 12R: module-scope clamp (was a per-fish per-frame closure).
      const swimOne = (rec, tSec, snap) => {
        const fg = rec.node
        if (!fg) return
        if (!rec.base) {
          rec.base = { x: fg.position.x, y: fg.position.y, z: fg.position.z }
          const inner = tankInnerBox()
          rec.range = inner ? { min: inner.min.clone(), max: inner.max.clone() } : null
        }
        const c = rec.cfg
        const r = rec.range
        if (snap) {
          fg.position.set(rec.base.x, rec.base.y, rec.base.z)
          fg.rotation.set(0, rec.rotY != null ? rec.rotY : fg.rotation.y, 0)
        } else {
          const w1 = tSec * c.speed + c.phase
          const nx = rec.base.x + Math.sin(w1) * c.sway
          // Dual-harmonic bob: fundamental + 25% second partial breaks the
          // perfect-sine read while staying inside the cfg amplitude.
          const ny = rec.base.y + (0.75 * Math.sin(tSec * (c.speed + 0.4) + c.phase * 1.7) + 0.25 * Math.sin(tSec * (c.speed * 2.13 + 0.85) + c.phase * 2.9)) * c.bob
          const nz = rec.base.z + Math.sin(tSec * (c.speed * 0.7) + c.phase * 0.6) * c.depth
          fg.position.x = r ? clampQ(nx, r.min.x, r.max.x) : nx
          fg.position.y = r ? clampQ(ny, r.min.y, r.max.y) : ny
          fg.position.z = r ? clampQ(nz, r.min.z, r.max.z) : nz
          const baseY = rec.rotY != null ? rec.rotY : fg.rotation.y
          // Slow heading drift (±0.12 rad ≈ ±7°) + swim-frequency yaw.
          fg.rotation.y = baseY + 0.12 * Math.sin(tSec * 0.11 + c.phase * 2.3) + 0.05 * Math.sin(w1 * 2 + c.phase)
          fg.rotation.z = Math.sin(tSec * 0.7 + c.phase) * 0.03
          fg.rotation.x = Math.sin(tSec * 0.6 + c.phase) * 0.025
        }
      }
      // Floor-walking shrimp: deterministic forward/pause/back/turn cycle
      // driven by dt (no RNG, no React state). Head +X => forward (cos h, -sin h).
      const walkShrimp = (rec, dt, tSec, snap) => {
        const fg = rec.node
        if (!fg || !rec.walk || !rec.region) return
        if (snap) {
          fg.position.set((rec.region.x0 + rec.region.x1) / 2, rec.cfg.floorY, (rec.region.z0 + rec.region.z1) / 2)
          fg.rotation.set(0, rec.heading, 0)
          return
        }
        const w = rec.walk
        const c = rec.cfg
        const durs = [2 + ((c.phase * 7) % 1) * 2, 1 + ((c.phase * 13) % 1), 0.4 + ((c.phase * 5) % 1) * 0.4, 0.3 + ((c.phase * 11) % 1) * 0.3]
        w.t += dt
        if (w.t >= durs[w.mode]) {
          w.t = 0
          w.mode = (w.mode + 1) % 4
          if (w.mode === 3) {
            w.cycle += 1
            const big = w.cycle % 4 === 3
            w.dir *= -1
            w.turnFrom = w.heading
            w.turnTo = w.heading + w.dir * (big ? Math.PI / 4 : Math.PI / 18 + ((c.phase * 3 + w.cycle) % 1) * (Math.PI / 12))
          }
        }
        const p = fg.position
        if (w.mode === 0) {
          p.x += Math.cos(w.heading) * c.speed * dt
          p.z += -Math.sin(w.heading) * c.speed * dt
        } else if (w.mode === 2) {
          p.x -= Math.cos(w.heading) * c.speed * 0.5 * dt
          p.z += Math.sin(w.heading) * c.speed * 0.5 * dt
        } else if (w.mode === 3) {
          const k = Math.min(w.t / Math.max(durs[3], 1e-4), 1)
          w.heading = w.turnFrom + (w.turnTo - w.turnFrom) * k * k * (3 - 2 * k)
        }
        // Tiny sideways sway, delta-applied so it never integrates into drift.
        const lat = 0.008 * Math.sin(tSec * 3.1 + c.phase * 2.0)
        const dLat = lat - (w.lat || 0)
        w.lat = lat
        p.x += Math.sin(w.heading) * dLat
        p.z += Math.cos(w.heading) * dLat
        const rg = rec.region
        let hit = false
        if (p.x < rg.x0) { p.x = rg.x0; hit = true }
        if (p.x > rg.x1) { p.x = rg.x1; hit = true }
        if (p.z < rg.z0) { p.z = rg.z0; hit = true }
        if (p.z > rg.z1) { p.z = rg.z1; hit = true }
        if (hit && w.mode !== 3) {
          w.mode = 3
          w.t = 0
          w.cycle += 1
          w.dir *= -1
          w.turnFrom = w.heading
          w.turnTo = w.heading + w.dir * (Math.PI / 6)
        }
        p.y = Math.max(c.floorY - 0.02, c.floorY + Math.sin(tSec * 1.1 + c.phase * 2.3) * 0.015)
        fg.rotation.set(Math.sin(tSec * 0.9 + c.phase) * 0.02, w.heading, Math.sin(tSec * 1.3 + c.phase) * 0.03)
        fg.updateMatrixWorld(true)
      }
      tempFallback.node = temp.fish[0] || null
      if (!schoolCache || schoolCache.length !== fishList.length + koiList.length) {
        schoolCache = [...fishList, ...koiList]
      }
      const actives = schoolCache.length ? schoolCache : tempFallback.node ? [tempFallback] : []
      // Phase 12: lite halves motion cadence (every Nth frame) and freezes
      // kelp/tree sway; snap frames always resolve the calm static pose.
      const doMotion = snap || qState.runtime.animationFull || (qState.frame % qState.runtime.fishTickEvery === 0)
      if (doMotion) actives.forEach((rec) => swimOne(rec, tSec, snap))
      if (doMotion) shrimpList.forEach((rec) => walkShrimp(rec, dt, tSec, snap))
      // Kelp base-pivot sway + tree canopy sway: transform-only, refs
      // cached at load (no traversal). Snap resolves calm static poses.
      if (snap) {
        kelpSway.forEach((k) => k.pivot.rotation.set(0, 0, 0))
        treeSway.forEach((t) => {
          t.root.rotation.x = 0
          t.root.rotation.z = 0
        })
      } else if (Number.isFinite(tSec) && (qState.runtime.animationFull || doMotion)) {
        kelpSway.forEach((k) => {
          k.pivot.rotation.x = 0.02 * Math.sin(tSec * 0.42 + k.phase)
          k.pivot.rotation.z = 0.016 * Math.sin(tSec * 0.53 + k.phase * 1.3)
        })
        treeSway.forEach((t) => {
          t.root.rotation.x = 0.009 * t.amp * Math.sin(tSec * 0.63 + t.phase)
          t.root.rotation.z = 0.006 * t.amp * Math.sin(tSec * 0.82 + t.phase * 1.3)
        })
      }
      if (MOTION_DEBUG && !motionLogged) {
        motionLogged = true
        flog('motion fish=' + fishList.length + ' koi=' + koiList.length + ' shrimp=' + shrimpList.length + ' kelp=' + kelpSway.length + ' trees=' + treeSway.length + ' loop=active')
      }
    }

    if (!backdropRef.current) {
      // Soft real shadow for the open-air dive (backdrop lighting stays untouched).
      // Phase 12: lite disables shadows outright; normal caps at 1024.
      renderer.shadowMap.enabled = qState.runtime.shadows
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      const pocSun = lightsBase[2][0]
      pocSun.castShadow = qState.runtime.shadows
      const shadowRes = qState.runtime.shadows ? qState.runtime.shadowSize : 0
      if (qState.runtime.shadows) {
        pocSun.shadow.mapSize.set(shadowRes, shadowRes)
        pocSun.shadow.camera.left = -48
        pocSun.shadow.camera.right = 48
        pocSun.shadow.camera.top = 48
        pocSun.shadow.camera.bottom = -48
        pocSun.shadow.camera.near = 1
        pocSun.shadow.camera.far = 60
        pocSun.shadow.bias = -0.0005
        pocSun.shadow.normalBias = 0.02
        // DirectionalLightShadow never refreshes its own projection: without
        // this the frustum above is dead and shadows fall back to ±5.
        // ±48/far-60 contains the giant-tree canopy corners (worst perp
        // ~45.2 from the sun axis at A(-20,-18)); texel ~9.4cm at 1024,
        // bias untouched.
        pocSun.shadow.camera.updateProjectionMatrix()
      }

      // Minecraft cinematic sky: WORLD-SPACE curved backdrop (day/night).
      // A static cylindrical arc behind the scene — the moving camera gives
      // real parallax (clouds/sun drift naturally). No per-frame sky
      // transforms, no wallpaper behavior, no breathe/yOffset/cover math.
      // SKY GUARD: poc.worldSky is a scene-direct group — never in camera,
      // aquariumRoot, poc.ground, installSet, or any environment fade group.
      // It follows theme opacity + the skyRT plate path exclusively, so P1
      // keeps a full sky while every install object hides.
      // ponytail: same transparent + depthTest:true + depthWrite:false
      // recipe as before — a depthTest:false sky would paint over the
      // aquarium; far + depth-tested = pure distant backdrop.
      const SKY_IMG_ASPECT = 1672 / 941
      const SKY_ARC_R = 90
      const SKY_ARC = 2.531 // ~145 deg arc; length 228, height 128 (aspect-matched, no distortion)
      const SKY_ARC_H = 128
      poc.skyAspect = SKY_IMG_ASPECT
      poc.skyArcR = SKY_ARC_R
      poc.skyArc = SKY_ARC
      poc.skyArcH = SKY_ARC_H
      // Phase 12R: lite halves sky arc tessellation (still smooth at 90u radius).
      const skySeg = qState.runtime.waterHigh ? [160, 28] : [48, 8]
      const skyArcGeo = new THREE.CylinderGeometry(SKY_ARC_R, SKY_ARC_R, SKY_ARC_H, skySeg[0], skySeg[1], true, Math.PI - SKY_ARC / 2, SKY_ARC)
      const mkSkyMat = (op) => new THREE.MeshBasicMaterial({
        transparent: true, opacity: op,
        depthTest: true, depthWrite: false,
        side: THREE.BackSide, fog: false, toneMapped: false,
      })
      poc.skyDayMat = mkSkyMat(1)
      poc.skyNightMat = mkSkyMat(0)
      poc.skyDay = new THREE.Mesh(skyArcGeo, poc.skyDayMat)
      poc.skyNight = new THREE.Mesh(skyArcGeo, poc.skyNightMat)
      poc.skyDay.renderOrder = 0
      poc.skyNight.renderOrder = 1
      poc.skyDay.frustumCulled = false
      poc.skyNight.frustumCulled = false
      poc.worldSky = new THREE.Group()
      poc.worldSky.name = 'WorldSky'
      poc.worldSky.add(poc.skyDay, poc.skyNight)
      scene.add(poc.worldSky)
      disposables.push(skyArcGeo, poc.skyDayMat, poc.skyNightMat)

      const skyLoader = new THREE.TextureLoader()
      const loadSky = (url, mat) => {
        // Phase 13C: tracked settle (placed OR fallback background).
        track(
          skyLoader.loadAsync(url).then((tex) => {
          if (cancelled) return
          // Phase 12R: cap sky dims before GPU upload (lite 512).
          const cap = qState.runtime.texCap
          const sw = tex.image ? tex.image.width : 0
          const sh = tex.image ? tex.image.height : 0
          if (sw && sh && Math.max(sw, sh) > cap) {
            const s = cap / Math.max(sw, sh)
            const cv = document.createElement('canvas')
            cv.width = Math.max(1, Math.round(sw * s))
            cv.height = Math.max(1, Math.round(sh * s))
            cv.getContext('2d').drawImage(tex.image, 0, 0, cv.width, cv.height)
            const nt = new THREE.CanvasTexture(cv)
            tex.dispose()
            tex = nt
          }
          tex.colorSpace = THREE.SRGBColorSpace
          tex.minFilter = THREE.LinearMipmapLinearFilter
          tex.magFilter = THREE.LinearFilter
          tex.generateMipmaps = true
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
          // Mirror-correct the arc mapping (arc u runs toward +x, so the
          // image would read mirrored without this).
          tex.repeat.x = -1
          tex.offset.x = 1
          mat.map = tex
          mat.needsUpdate = true
          disposables.push(tex)
          if (SKY_DEBUG) {
            const iw = tex.image ? tex.image.width : 0
            const ih = tex.image ? tex.image.height : 0
            flog('sky tex ' + url + ' ' + iw + 'x' + ih + ' aspect=' + (ih ? (iw / ih).toFixed(4) : '?'))
          }
          if (reduced) rerender()
        }, () => { /* sky stays on fallback background */ }),
        url.split('/').pop()
        )
      }
      loadSky('/aquarium/sky/sky-morning.png', poc.skyDayMat)
      loadSky('/aquarium/sky/sky-night.png', poc.skyNightMat)

      // Rolling green hilltop: subdivided terrain with a flat installation
      // plateau under the aquarium; rim buried by distance + fog.
      // poc.ground stays a positioned group so seatTable/installSet keep working.
      // Phase 12R: lite uses a coarser mesh (24 vs 64 segs/side).
      const hillSeg = qState.runtime.waterHigh ? 64 : 24
      const hillGeo = new THREE.PlaneGeometry(120, 120, hillSeg, hillSeg)
      hillGeo.rotateX(-Math.PI / 2)
      const sstep = (t) => {
        const c = Math.min(Math.max(t, 0), 1)
        return c * c * (3 - 2 * c)
      }
      let hillMin = Infinity
      let hillMax = -Infinity
      let foreMin = Infinity
      let foreMax = -Infinity
      let farMin = Infinity
      let farMax = -Infinity
      {
        const pos = hillGeo.attributes.position
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i)
          const z = pos.getZ(i)
          // Rounded-rect distance outside the flat plateau (half-extents 8 x 6).
          const dx = Math.max(Math.abs(x) - 8, 0)
          const dz = Math.max(Math.abs(z) - 6, 0)
          const blend = sstep(Math.hypot(dx, dz) / 10)
          // Domain-warped broad hills (no stripes); back kept low for the sky.
          const xw = x + 1.5 * Math.sin(z * 0.06)
          const zw = z + 1.5 * Math.sin(x * 0.05)
          let h = 2.2 * Math.sin(xw * 0.045 + 1.7) * Math.sin(zw * 0.05 + 0.6)
            + 1.2 * Math.sin(xw * 0.09 + zw * 0.07 + 2.0)
          h *= 0.35 + 0.65 * sstep(z / 16 + 0.5)
          if (z > 0) h -= 0.6 * sstep(z / 20)
          const r = Math.hypot(x, z)
          h *= 1 - 0.85 * sstep((r - 40) / 20)
          // Far-field rolling silhouette (distant Minecraft hills): the
          // radial gate keeps r<15 (plateau/tank/table/near composition)
          // exactly zero; own warp + incommensurate frequencies stay
          // non-tiling; the radial rim factor also crushes this term at
          // the mesh border. Deliberately outside the back-damp/front-dip
          // rules so the back horizon actually gains relief.
          let fw = 0
          if (r > 15) {
            const gate = sstep((r - 15) / 10)
            const wx = x + 1.5 * Math.sin(z * 0.025)
            const wz = z + 1.2 * Math.sin(x * 0.03)
            fw = (0.8 * Math.sin(wx * 0.037 + 0.7)
              + 0.55 * Math.sin(wz * 0.043 + 2.1)
              + 0.25 * Math.sin((wx * 0.6 + wz) * 0.023 + 1.3))
              * gate * (1 - 0.85 * sstep((r - 40) / 20))
          }
          const y = (h + fw) * blend
          pos.setY(i, y)
          if (y < hillMin) hillMin = y
          if (y > hillMax) hillMax = y
          if (r < 15) {
            if (y < foreMin) foreMin = y
            if (y > foreMax) foreMax = y
          } else if (r >= 25) {
            if (y < farMin) farMin = y
            if (y > farMax) farMax = y
          }
        }
        pos.needsUpdate = true
        hillGeo.computeVertexNormals()
        poc.hillMin = hillMin
        poc.hillMax = hillMax
        flog('hill foreY=[' + foreMin.toFixed(3) + ',' + foreMax.toFixed(3) + '] farY=[' + farMin.toFixed(3) + ',' + farMax.toFixed(3) + '] farRelief=' + (farMax - farMin).toFixed(3))
      }
      // Second UV set for aoMap (three r186 samples aoMap.channel; 0 = uv,
      // 2 = uv2). Only assign aoMap when uv2 actually exists.
      const hillUV = hillGeo.getAttribute('uv')
      if (hillUV && hillUV.array) {
        hillGeo.setAttribute('uv2', new THREE.BufferAttribute(hillUV.array.slice(0), 2))
      }
      // Baked slope response: flat plateau renders at 1.0, steepest
      // slopes floor at 0.90 (≤10% darkening, continuous in the normal,
      // so it can never stripe). Static geometry: zero per-frame cost.
      {
        const nrm = hillGeo.getAttribute('normal')
        const tint = new Float32Array(hillGeo.attributes.position.count * 3)
        for (let i = 0; i < hillGeo.attributes.position.count; i++) {
          const upness = Math.min(Math.max(nrm.getY(i), 0), 1)
          const b = 1 - 0.1 * (1 - upness)
          tint[i * 3] = b
          tint[i * 3 + 1] = b
          tint[i * 3 + 2] = b
        }
        hillGeo.setAttribute('color', new THREE.BufferAttribute(tint, 3))
      }
      const hillMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0.92, 1.16, 0.74),
        roughness: 1.0,
        metalness: 0,
        vertexColors: true,
        // Ease the grass AO darkening (~20% indirect suppression) without
        // touching textures, UVs, or geometry. Reads meadow, never neon.
        aoMapIntensity: 0.65,
      })
      trackNightLift(hillMat, 1.12)
      // HILL ONLY: terrain-local atmospheric horizon blend. No other
      // material passes the horizon flag, so aquarium / trees / fauna /
      // table / water programs are byte-identical.
      // Phase 12R: lite hill relies on fog + vertex colors (no horizon program).
      if (qState.runtime.waterHigh) shadeMat(hillMat, { horizon: { start: HORIZON_START, end: HORIZON_END, cap: HORIZON_CAP } })
      const hillMesh = new THREE.Mesh(hillGeo, hillMat)
      hillMesh.castShadow = true
      hillMesh.receiveShadow = true
      poc.ground = new THREE.Group()
      poc.ground.name = 'HilltopGround'
      poc.ground.add(hillMesh)
      poc.ground.position.y = -1.65
      scene.add(poc.ground)
      disposables.push(hillGeo, hillMat)
      const hillTexBase = '/aquarium/terrain/grass_ground/grass_ground'
      const hillTexLoader = new THREE.TextureLoader()
      // Phase 12R: lite keeps the diffuse grass read at 512 and skips
      // the normal/rough/ao fetches entirely (user decision: keep diff).
      const hillChannels = qState.runtime.waterHigh
        ? [
            { key: 'map', suf: 'diff_2k.jpg', srgb: true, cap: 1024 },
            { key: 'normalMap', suf: 'nor_gl_2k.png', srgb: false, cap: 512, normalScale: 0.6 },
            { key: 'roughnessMap', suf: 'rough_2k.png', srgb: false, cap: 1024 },
            { key: 'aoMap', suf: 'ao_2k.jpg', srgb: false, cap: 1024 },
          ]
        : [{ key: 'map', url: '/aquarium/lite/grass_ground_lite.jpg', srgb: true, cap: Math.min(1024, qState.runtime.texCap) }]
      // Phase 15I: Lite fetches a pre-downscaled 1024 ground JPEG instead
      // of the full 2K source. The 512 runtime cap still governs upload.
      hillChannels.forEach(({ key, suf, url, srgb, cap, normalScale }) => {
        // Phase 13C: tracked settle (textured OR untextured fallback).
        track(
          hillTexLoader
            .loadAsync(url || `${hillTexBase}_${suf}`)
            .then((tex) => {
            if (cancelled) return
            try {
              let finalTex = tex
              const w = tex.image.width
              const h = tex.image.height
              if (w && h && Math.max(w, h) > cap) {
                const s = cap / Math.max(w, h)
                const cv = document.createElement('canvas')
                cv.width = Math.max(1, Math.round(w * s))
                cv.height = Math.max(1, Math.round(h * s))
                cv.getContext('2d').drawImage(tex.image, 0, 0, cv.width, cv.height)
                finalTex = new THREE.CanvasTexture(cv)
                tex.dispose()
              }
              if (srgb) finalTex.colorSpace = THREE.SRGBColorSpace
              finalTex.wrapS = finalTex.wrapT = THREE.RepeatWrapping
              finalTex.repeat.set(8, 8)
              if (key === 'aoMap') {
                if (!hillGeo.getAttribute('uv2')) return
                finalTex.channel = 2
                hillMat.aoMap = finalTex
              } else {
                hillMat[key] = finalTex
                if (key === 'normalMap' && normalScale != null && hillMat.normalScale) {
                  hillMat.normalScale.set(normalScale, normalScale)
                }
              }
              disposables.push(finalTex)
              hillMat.needsUpdate = true
              if (reduced) rerender()
            } catch (err) {
              /* channel stays untextured */
            }
          }, () => {
            /* channel stays untextured */
          }),
          `hill-${suf}`
        )
      })
      if (HILL_DEBUG) {
        let tankC = 'n/a'
        try {
          const tb = tankOuterBox()
          if (tb) {
            const c = new THREE.Vector3()
            tb.getCenter(c)
            tankC = `(${c.x.toFixed(2)}, ${c.z.toFixed(2)})`
          }
        } catch (err) {
          /* report without tank center */
        }
        console.log(
          `[hilltop] plateau x±8 z±6 blend 10, height [${hillMin.toFixed(2)}, ${hillMax.toFixed(2)}], tankCenter(x,z)=${tankC}`
        )
        hillMat.wireframe = true
      }

      // Dedicated aquarium LED: broad rect above the tank + weak spot fill.
      // Open-air dive only, no shadow casting; placement follows measured tank bounds.
      RectAreaLightUniformsLib.init()
      poc.rig = new THREE.Group()
      poc.aquaRect = new THREE.RectAreaLight(0xfff4df, 5, 6, 2.2)
      poc.rig.add(poc.aquaRect)
      poc.aquaSpot = new THREE.SpotLight(0xffffff, 0.65, 10, Math.PI / 3.6, 0.9, 2)
      poc.aquaSpot.castShadow = false
      poc.rig.add(poc.aquaSpot)
      // Soft aquarium-local fill (not a key): cool-neutral, broad, shadowless.
      poc.aquaFill = new THREE.RectAreaLight(0xe7f2ff, 0.45, 6, 3)
      scene.add(poc.aquaFill)
      // Stable interior base fill, isolated to aquarium objects via layer 1
      // (ground/table/sky stay on layer 0 and never see this light).
      poc.aquaHemi = new THREE.HemisphereLight(0xbfe7ff, 0x6b5b45, 0.5)
      poc.aquaHemi.layers.set(1)
      scene.add(poc.aquaHemi)
      scene.add(poc.aquaSpot.target)
      // Rig lives under the aquarium root so the key stays attached to the
      // tank (identity parent: world pose unchanged, seating math untouched).
      aquariumRoot.add(poc.rig)
      seatAquariumLight()

      // True 3D title above the aquarium (world-space geometry, not overlay).
      // Sized/placed from live tank bounds; dissolves with the scene plate.
      // Phase 13C: tracked settle (titled OR absent; scene valid either way).
      track(
        new FontLoader()
          .loadAsync('/aquarium/fonts/BoldsPixels.typeface.json')
          .then((font) => {
          if (cancelled) return
          const geo = new TextGeometry('LET\u2019S GO DEEPER', {
            font,
            size: 1,
            depth: 0.12,
            curveSegments: 6,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.015,
            bevelSegments: 2,
          })
          geo.center()
          geo.computeBoundingBox()
          const gb = geo.boundingBox
          const gw = Math.max(gb.max.x - gb.min.x, 0.001)
          const gh = Math.max(gb.max.y - gb.min.y, 0.001)
          const tb = tankOuterBox()
          const tankW = tb ? tb.max.x - tb.min.x : 8
          const cx = tb ? (tb.min.x + tb.max.x) / 2 : 0
          const top = tb ? tb.max.y : 5
          const front = tb ? tb.max.z : 2
          const s = (tankW * 0.68) / gw
          const mat = new THREE.MeshStandardMaterial({
            color: TITLE_LIGHT.clone(),
            roughness: 0.28,
            metalness: 0.05,
            emissive: TITLE_LIGHT.clone(),
            emissiveIntensity: 0.13,
          })
          const mesh = new THREE.Mesh(geo, mat)
          mesh.castShadow = false
          mesh.renderOrder = 2
          // Pixel drop shadow: same geometry, rigid diagonal offset (~2.5%
          // of text height), tucked microscopically behind. No scaling, so
          // every glyph keeps its exact pixel-step silhouette.
          const shadowOff = gh * 0.025
          const outlineMat = new THREE.MeshBasicMaterial({ color: 0x020305 })
          const outline = new THREE.Mesh(geo, outlineMat)
          outline.position.set(shadowOff, -shadowOff, -0.01)
          outline.castShadow = false
          outline.renderOrder = 1
          const group = new THREE.Group()
          group.add(outline)
          group.add(mesh)
          group.scale.setScalar(s)
          group.position.set(cx, top + 0.05 + (gh * s) / 2, front + 0.6)
          group.updateMatrixWorld(true)
          scene.add(group)
          disposables.push(geo, mat, outlineMat)
          titleState.group = group
          titleState.mat = mat
          titleState.baseY = group.position.y
          titleState.baseS = s
          titleState.baseZ = group.position.z
          if (lastP >= 0.94) group.visible = false
          if (reduced) rerender()
        }, () => {
          /* title stays absent; scene remains valid */
        }),
        'font-title'
      )

      const readTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
      const applyThemeTarget = () => {
        poc.tgt = readTheme() === 'dark' ? 1 : 0
        if (reduced) {
          poc.k = poc.tgt
          updateOutdoor(0, 1, 0, true)
          rerender()
        }
      }
      poc.tgt = readTheme() === 'dark' ? 1 : 0
      poc.k = poc.tgt
      themeObs = new MutationObserver(() => applyThemeTarget())
      themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

      // Stand: footprint ~1:1 with tank (XZ independent), height fills
      // tankBottom-ground gap. Top flush with tank base, feet on ground.
      // Compact Lite uses the embedded 512px table; Normal keeps source.
      const roomTableUrl = qState.runtime.extras
        ? '/aquarium/room/props/side_table/side_table_01_4k.gltf'
        : qState.mode === 'lite' && mount.clientWidth < 720
          ? '/aquarium/lite/side-table-lite.glb'
          : null
      if (roomTableUrl) loadOptional('room-table', roomTableUrl, (root) => {
        const junk = []
        root.traverse((n) => {
          if (n.isCamera || n.isLight) junk.push(n)
        })
        junk.forEach((n) => {
          if (n.parent) n.parent.remove(n)
        })
        const m = measureRoot(root)
        if (!m) return { ok: false }
        if (![m.size.x, m.size.y, m.size.z].every((v) => Number.isFinite(v) && v > 0)) {
          return { ok: false }
        }
        const tb = tankOuterBox()
        const reqW = tb ? tb.max.x - tb.min.x : 8
        const reqD = tb ? tb.max.z - tb.min.z : 4
        const tankBottom = tb ? tb.min.y : 0
        const gap = tankBottom - GROUND_Y0
        if (!Number.isFinite(gap) || gap <= 0) return { ok: false }
        const sx = reqW / m.size.x
        const sz = reqD / m.size.z
        // ponytail: XZ independent for 1:1 footprint (raw 1.22 vs tank ~2.1);
        // Y decoupled to gap fill, clamped to avoid pillar/stool extremes.
        const sy = Math.min(5, Math.max(0.5, gap / m.size.y))
        if (![sx, sy, sz].every(Number.isFinite)) return { ok: false }
        root.scale.set(sx, sy, sz)
        root.updateMatrixWorld(true)
        const b = new THREE.Box3().setFromObject(root)
        const tc = tb ? tb.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, 0, 0)
        root.position.x += tc.x - (b.min.x + b.max.x) / 2
        root.position.z += tc.z - (b.min.z + b.max.z) / 2
        root.traverse((n) => {
          if (n.isMesh) { n.castShadow = true; n.receiveShadow = true }
        })
        downscaleTextures(root, 2048, disposables)
        const group = new THREE.Group()
        group.add(root)
        tableGroupRef.current = group
        seatTable()
        if (reduced) { updateOutdoor(0, 1, 0, true); rerender() }
        return { ok: true, group }
      })
    }

    // Required: tank shell fitted to the 8x5x4 volume.
    loadRequired('tank.glb', '/aquarium/tank.glb', (root) => {
      const m = measureRoot(root)
      if (!m) return { ok: false, reason: 'non-finite bounds' }
      const f = fitScale(m.size, [8, 5, 4])
      if (!f.ok) return f
      gradeSlot(root, 0.82)
      // Graphite frame response + glass Fresnel; glass never casts shadows.
      root.traverse((n) => {
        if (!n.isMesh || !n.material) return
        const mats = Array.isArray(n.material) ? n.material : [n.material]
        mats.forEach((m) => {
          if (!m.isMeshStandardMaterial) return
          if (m.transparent) {
            // Phase 12R: lite glass stays plain (no fresnel program).
            if (qState.runtime.waterHigh) shadeMat(m, { fresnel: 0.3 })
            // Glass must never write depth: water behind it would fail the
            // depth test and vanish through the panes. Glass tints last.
            m.depthWrite = false
            n.castShadow = false
            n.renderOrder = 9
          } else {
            const lum = (m.color.r + m.color.g + m.color.b) / 3
            if (lum < 0.12) {
              m.roughness = Math.min(m.roughness, 0.32)
              m.metalness = Math.max(m.metalness, 0.3)
            }
            n.castShadow = true
            n.renderOrder = 10
          }
        })
      })
      root.scale.setScalar(f.s)
      root.updateMatrixWorld(true)
      const b = new THREE.Box3().setFromObject(root)
      root.position.x -= (b.min.x + b.max.x) / 2
      root.position.y += 2.5 - (b.min.y + b.max.y) / 2
      root.position.z -= (b.min.z + b.max.z) / 2
      root.updateMatrixWorld(true)
      const c = new THREE.Vector3()
      new THREE.Box3().setFromObject(root).getCenter(c)
      if (!inTankBounds(c.x, c.y, c.z)) return { ok: false, reason: 'placed out of tank bounds' }
      const group = new THREE.Group()
      group.add(root)
      // Tank volume changed -> reseat fishes + table/light + water.
      placeFishes()
      placeKois()
      placeShrimps()
      seatTable()
      seatWater()
      if (!backdropRef.current) {
        seatAquariumLight()
        if (reduced) { updateOutdoor(0, 1, 0, true); rerender() }
      }
      return { ok: true, slot: 'tank', group }
    })

    // Required: floor slab, top surface at y=0.
    // Phase 15H: Lite fetches the pre-downscaled derivative (512px
    // textures, identical geometry) instead of the full-res source.
    loadRequired(
      'floor.glb',
      qState.mode === 'lite' ? '/aquarium/lite/floor.glb' : '/aquarium/floor.glb',
      (root) => {
        let meshes = 0
        let kids = 0
        root.traverse((n) => {
          kids += 1
          if (n.isMesh) meshes += 1
        })
        dlog('[floor-poc]', 'loaded meshes=' + meshes + ' children=' + kids)
        root.updateMatrixWorld(true)
        const fb = new THREE.Box3().setFromObject(root)
        const fd = new THREE.Vector3()
        const fc = new THREE.Vector3()
        fb.getSize(fd)
        fb.getCenter(fc)
        const thinAxis =
          fd.x <= fd.y && fd.x <= fd.z ? 'X' : fd.y <= fd.z ? 'Y' : 'Z'
        dlog('[floor-poc]', 'pre-box size=' + fmtV(fd) + ' center=' + fmtV(fc) + ' thin axis=' + thinAxis)
        const m = measureRoot(root)
        if (!m) return { ok: false, reason: 'non-finite bounds' }
      const f = fitScale(m.size, [8, 1, 4])
      if (!f.ok) return f
      gradeSlot(root, 0.78)
      root.traverse((n) => {
        if (!n.isMesh || !n.material) return
        const mats = Array.isArray(n.material) ? n.material : [n.material]
        mats.forEach((m) => {
          if (!m.isMeshStandardMaterial || m.transparent) return
          m.roughness = 1
          // Phase 12R: lite floor stays plain (no caustic program).
          if (qState.runtime.waterHigh) shadeMat(m, { caustic: 0.06, depth: true })
        })
      })
        root.scale.setScalar(f.s)
        root.updateMatrixWorld(true)
        const b = new THREE.Box3().setFromObject(root)
        root.position.x -= (b.min.x + b.max.x) / 2
        root.position.z -= (b.min.z + b.max.z) / 2
        root.position.y -= b.min.y // base -> y=0 (slab sits on tank interior, nothing below frame)
        root.updateMatrixWorld(true)
        const nb = new THREE.Box3().setFromObject(root)
        const nd = new THREE.Vector3()
        nb.getSize(nd)
        dlog(
          '[floor-poc]',
          'normalized dims=' + fmtV(nd) +
            ' pos=(' + root.position.x.toFixed(3) + ', ' + root.position.y.toFixed(3) + ', ' + root.position.z.toFixed(3) + ')' +
            ' scale=' + f.s.toFixed(4)
        )
        const group = new THREE.Group()
        group.add(root)
        return { ok: true, slot: 'floor', group }
      },
      { log: true }
    )

    // Required: single rock unit, instanced across existing placements.
    loadRequired('rocks.glb', '/aquarium/rocks.glb', (root) => {
      // Strip export helpers so they are never cloned into instances.
      const junk = []
      root.traverse((n) => {
        if (n.isCamera || n.isLight) junk.push(n)
      })
      junk.forEach((n) => {
        if (n.parent) n.parent.remove(n)
      })
      const m = measureRoot(root)
      if (!m) return { ok: false, reason: 'non-finite bounds' }
      const f = fitScale(m.size, [1, 1, 1])
      if (!f.ok) return f
      gradeSlot(root, 0.9)
      const group = new THREE.Group()
      // Per-piece value variation + caustics. Materials are cloned per
      // placement first, then enhanced (clone() drops onBeforeCompile).
      const rockVar = [1.0, 1.07, 0.93]
      let rockIdx = 0
      rockDefs.forEach(({ p, s, far }) => {
        if (far && !backdropRef.current) return // Open-air dive: external rocks removed
        const c = root.clone()
        c.scale.setScalar(f.s * s)
        // Recenter clone on its own middle, then drop onto placement.
        c.updateMatrixWorld(true)
        const cb = new THREE.Box3().setFromObject(c)
        const cc = new THREE.Vector3()
        cb.getCenter(cc)
        c.position.x += p[0] - cc.x
        c.position.y += p[1] - cc.y
        c.position.z += p[2] - cc.z
        const vf = far ? (backdropRef.current ? 0.42 : 0.55) : rockVar[rockIdx % rockVar.length]
        rockIdx += far ? 0 : 1
        c.traverse((n) => {
          if (!n.isMesh || !n.material) return
          const tune = (mt) => {
            const mc = mt.clone()
            if (mc.color) mc.color.multiplyScalar(vf)
            if (mc.isMeshStandardMaterial && !mc.transparent) {
              mc.roughness = Math.min(Math.max(mc.roughness, 0.8), 0.95)
              // Phase 12R: lite rocks stay plain (no caustic program).
              if (qState.runtime.waterHigh) shadeMat(mc, { caustic: 0.05, depth: true })
            }
            return mc
          }
          n.material = Array.isArray(n.material) ? n.material.map(tune) : tune(n.material)
          n.castShadow = !far
          n.receiveShadow = true
        })
        // Soft contact disc where the rock meets the floor.
        const disc = contactDisc(s * 0.62, 0.22)
        disc.position.set(p[0], 0.006, p[2])
        group.add(disc)
        group.add(c)
      })
      return { ok: true, slot: 'rocks', group }
    })

    // Required: single kelp stalk, base-anchored per placement.
    loadRequired('kelp.glb', '/aquarium/kelp.glb', (root) => {
      const m = measureRoot(root)
      if (!m) return { ok: false, reason: 'non-finite bounds' }
      const f = fitScale(m.size, [0.5, 2.5, 0.5])
      if (!f.ok) return f
      gradeSlot(root, 0.8)
      const group = new THREE.Group()
      kelpDefs.forEach(([x, z, h], i) => {
        const c = root.clone()
        c.scale.set(f.s, (f.s * h) / 2.5, f.s)
        c.updateMatrixWorld(true)
        const cb = new THREE.Box3().setFromObject(c)
        c.position.x += x - (cb.min.x + cb.max.x) / 2
        c.position.z += z - (cb.min.z + cb.max.z) / 2
        c.position.y -= cb.min.y // base -> y=0
        // Two-tone greens + caustics (clone first: clone() drops onBeforeCompile).
        const vf = i % 2 ? 1.1 : 0.92
        c.traverse((n) => {
          if (!n.isMesh || !n.material) return
          const tune = (mt) => {
            const mc = mt.clone()
            if (mc.color) mc.color.multiplyScalar(vf)
            if (mc.isMeshStandardMaterial && !mc.transparent) {
              mc.roughness = Math.min(Math.max(mc.roughness, 0.55), 0.75)
              // Phase 12R: lite kelp stays plain (no caustic program).
              if (qState.runtime.waterHigh) shadeMat(mc, { caustic: 0.05, depth: true })
            }
            return mc
          }
          n.material = Array.isArray(n.material) ? n.material.map(tune) : tune(n.material)
        })
        const disc = contactDisc(0.3, 0.2)
        disc.position.set(x, 0.006, z)
        group.add(disc)
        // Base-pivot wrapper: pivot sits at the cluster footprint so sway
        // rotation keeps the root planted; world transform at angle 0 is
        // identical to the direct add.
        const pivot = new THREE.Group()
        pivot.position.set(x, 0, z)
        group.add(pivot)
        pivot.add(c)
        c.position.x -= x
        c.position.z -= z
        kelpSway.push({ pivot, phase: i * 2.1 })
      })
      return { ok: true, slot: 'kelp', group, ref: 'kelp' }
    })

    // Optional-silent: coral clusters near existing rocks.
    // Phase 12: lite skips this decorative load (absent stays absent by design).
    // Phase 15B: compact viewports keep it — 7KB fetch, thinned to 2 clusters
    // by applyCompact, same as kelp.
    if (qState.runtime.extras || mount.clientWidth < 720) loadOptional('coral', '/aquarium/coral.glb', (root) => {
      // Strip export helpers so they are never cloned into instances.
      const junk = []
      root.traverse((n) => {
        if (n.isCamera || n.isLight) junk.push(n)
      })
      junk.forEach((n) => {
        if (n.parent) n.parent.remove(n)
      })
      const m = measureRoot(root)
      if (!m) return { ok: false }
      const f = fitScale(m.size, [0.6, 0.6, 0.6])
      if (!f.ok) return { ok: false }
      gradeSlot(root, 0.85)
      // Restrained emissive lift + caustics on the shared template materials
      // (all three spot clones share them; nothing mutates per-clone).
      root.traverse((n) => {
        if (!n.isMesh || !n.material) return
        const mats = Array.isArray(n.material) ? n.material : [n.material]
        mats.forEach((m) => {
          if (!m.isMeshStandardMaterial || m.transparent) return
          m.roughness = Math.min(Math.max(m.roughness, 0.65), 0.85)
          if (m.emissive && m.color) m.emissive.copy(m.color).multiplyScalar(0.15)
          shadeMat(m, { caustic: 0.06, depth: true })
        })
      })
      const group = new THREE.Group()
      // Base Y sits on the floor top (~0.376) so clusters ground instead of bury.
      const spots = [
        [-2.2, 0.35, -0.5, 0.87],
        [2.5, 0.35, -0.9, 0.72],
        [0.9, 0.35, 0.8, 0.65],
      ]
      spots.forEach(([x, y, z, s]) => {
        const c = root.clone()
        const k = (f.s * s) / 0.6
        c.scale.setScalar(k)
        c.updateMatrixWorld(true)
        const cb = new THREE.Box3().setFromObject(c)
        c.position.x += x - (cb.min.x + cb.max.x) / 2
        c.position.z += z - (cb.min.z + cb.max.z) / 2
        c.position.y += y - cb.min.y
        const disc = contactDisc(s * 0.4, 0.2)
        disc.position.set(x, 0.006, z)
        group.add(disc)
        group.add(c)
      })
      return { ok: true, group }
    })

    // Small-fish school: three individual assets (fish_a/b/c), longest axis
    // -> travel X. Dev diagnostics enabled for these calls only.
    // Same [0.9, 0.5, 0.4] fit contract as the retired legacy clones;
    // FISH_CFG.s is length-corrected per body plan so final world sizes
    // match the old A/B/C (OLD finals: A 0.744x0.500x0.299,
    // B 0.536x0.360x0.215, C 0.387x0.260x0.156).
    // Phase 15G: Lite fetches pre-downscaled derivatives (512px textures,
    // identical geometry) instead of downloading full-res sources first.
    // Normal keeps the originals. The 512 runtime cap stays as safety net.
    const fishBase = qState.mode === 'lite' ? '/aquarium/lite' : '/aquarium'
    const FISH_SOURCES = [
      { name: 'fish-a', url: `${fishBase}/fish_a.glb`, cfg: FISH_CFG[0] },
      { name: 'fish-b', url: `${fishBase}/fish_b.glb`, cfg: FISH_CFG[1] },
      { name: 'fish-c', url: `${fishBase}/fish_c.glb`, cfg: FISH_CFG[2] },
    ]
    const FISH_OLD_FINALS = [
      [0.744, 0.5, 0.299],
      [0.536, 0.36, 0.215],
      [0.387, 0.26, 0.156],
    ]
    FISH_SOURCES.forEach(({ name, url, cfg }, fi) => {
      loadOptional(
        name,
        url,
        (root) => {
          let meshes = 0
          let kids = 0
          root.traverse((n) => {
            kids += 1
            if (n.isMesh) meshes += 1
          })
          flog('loaded meshes=' + meshes + ' children=' + kids)
          root.updateMatrixWorld(true)
          const fb = new THREE.Box3().setFromObject(root)
          const fd = new THREE.Vector3()
          const fc = new THREE.Vector3()
          fb.getSize(fd)
          fb.getCenter(fc)
          flog('pre-box size=' + fmtV(fd) + ' center=' + fmtV(fc))
          if (![fd.x, fd.y, fd.z, fc.x, fc.y, fc.z].every(Number.isFinite)) {
            return { ok: false, reason: 'non-finite bounds' }
          }
          if (fd.z > fd.x) root.rotation.y += Math.PI / 2
          const m = measureRoot(root)
          if (!m) return { ok: false, reason: 'non-finite bounds' }
          const f = fitScale(m.size, [0.9, 0.5, 0.4])
          if (!f.ok) {
            const maxDim = Math.max(m.size.x, m.size.y, m.size.z)
            return { ok: false, reason: `unit guard (maxDim=${maxDim.toFixed(3)} vs ~0.9, range 0.045-3.6)` }
          }
          // One instance per asset (materials unique per GLB; tune in place).
          // Offset lives only on this inner root (no double-transform).
          const baseScale = f.s * cfg.s * (backdropRef.current ? FISH_BACKDROP_SCALE : 1)
          root.scale.setScalar(baseScale)
          root.rotation.y += cfg.rotY
          root.updateMatrixWorld(true)
          // Center mesh on itself; placeFishes seats it in the safe volume.
          const nb = new THREE.Box3().setFromObject(root)
          const nc = new THREE.Vector3()
          const nd = new THREE.Vector3()
          nb.getSize(nd)
          nb.getCenter(nc)
          root.position.x -= nc.x
          root.position.y -= nc.y
          root.position.z -= nc.z
          root.updateMatrixWorld(true)
          const ref = FISH_OLD_FINALS[fi]
          const pct = (a, b) => (((a - b) / b) * 100).toFixed(1) + '%'
          flog(
            name + ' final=(' + nd.x.toFixed(3) + ', ' + nd.y.toFixed(3) + ', ' + nd.z.toFixed(3) + ')' +
              ' vs old=(' + ref.map((v) => v.toFixed(3)).join(', ') + ')' +
              ' dx=' + pct(nd.x, ref[0]) + ' dy=' + pct(nd.y, ref[1]) + ' dz=' + pct(nd.z, ref[2])
          )
          // Per-instance emphasis (focal brightest), same rules as before.
          root.traverse((n) => {
            if (!n.isMesh || !n.material) return
            const mats = Array.isArray(n.material) ? n.material : [n.material]
            mats.forEach((mt) => {
              if (fi === 0) {
                if (mt.emissive && mt.color) mt.emissive.copy(mt.color).multiplyScalar(0.12)
                if (typeof mt.roughness === 'number') mt.roughness = Math.min(mt.roughness, 0.45)
              } else {
                if (mt.color) mt.color.multiplyScalar(fi === 1 ? 0.9 : 0.8)
                if (typeof mt.roughness === 'number') mt.roughness = Math.min(1, mt.roughness + 0.1)
              }
            })
          })
          const group = new THREE.Group()
          group.add(root)
          fishList.push({ node: root, cfg, rotY: root.rotation.y, base: null, range: null })
          flog(
            name + ' scale=' + baseScale.toFixed(4) +
              ' rotY=' + root.rotation.y.toFixed(3)
          )
          // Seat from the live inner box (or fallback); swim loop captures
          // each base lazily in aquarium-local space on the next frame.
          placeFishes()
          return { ok: true, slot: 'fish', group }
        },
        { log: true }
      )
    })

    // Butterfly koi (PoC only): one instance per GLB, same record shape as
    // goldfish so swimOne/transition/reduced-motion apply unchanged.
    // No TEMP koi exists, so no slot is retired.
    // Phase 12: lite skips these decorative extras (essential fish_a/b/c stay).
    // Phase 15C: compact viewports keep a single representative koi-a.
    if (!backdropRef.current && (qState.runtime.extras || mount.clientWidth < 720)) {
      const KOI_SOURCES = [
        { name: 'butterfly-koi-a', url: '/aquarium/butterfly_koi_a.glb', cfg: KOI_CFG[0], glow: 0.1 },
        { name: 'butterfly-koi-b', url: '/aquarium/butterfly_koi_b.glb', cfg: KOI_CFG[1], glow: 0.04 },
      ]
      const koiSources = qState.runtime.extras ? KOI_SOURCES : KOI_SOURCES.slice(0, 1)
      koiSources.forEach(({ name, url, cfg, glow }) => {
        loadOptional(
          name,
          url,
          (root) => {
            root.updateMatrixWorld(true)
            const kb = new THREE.Box3().setFromObject(root)
            const kd = new THREE.Vector3()
            const kc = new THREE.Vector3()
            kb.getSize(kd)
            kb.getCenter(kc)
            flog(name + ' pre-box size=' + fmtV(kd) + ' center=' + fmtV(kc))
            if (![kd.x, kd.y, kd.z, kc.x, kc.y, kc.z].every(Number.isFinite)) {
              return { ok: false, reason: 'non-finite bounds' }
            }
            if (kd.z > kd.x) root.rotation.y += Math.PI / 2
            const m = measureRoot(root)
            if (!m) return { ok: false, reason: 'non-finite bounds' }
            const f = fitScale(m.size, [2.0, 0.9, 0.7])
            if (!f.ok) {
              const maxDim = Math.max(m.size.x, m.size.y, m.size.z)
              return { ok: false, reason: `unit guard (maxDim=${maxDim.toFixed(3)} vs ~2.0)` }
            }
            root.scale.setScalar(f.s * cfg.s)
            root.rotation.y += cfg.rotY
            root.updateMatrixWorld(true)
            // Center mesh on itself; placeKois seats it in the safe volume.
            const nb = new THREE.Box3().setFromObject(root)
            const nc = new THREE.Vector3()
            nb.getCenter(nc)
            root.position.x -= nc.x
            root.position.y -= nc.y
            root.position.z -= nc.z
            root.updateMatrixWorld(true)
            // Focal treatment (materials are unique per koi GLB; tune in place).
            root.traverse((n) => {
              if (!n.isMesh || !n.material) return
              const mats = Array.isArray(n.material) ? n.material : [n.material]
              mats.forEach((mt) => {
                if (mt.emissive && mt.color) mt.emissive.copy(mt.color).multiplyScalar(glow)
              })
            })
            const group = new THREE.Group()
            group.add(root)
            koiList.push({ node: root, cfg, rotY: root.rotation.y, base: null, range: null })
            flog(name + ' scale=' + (f.s * cfg.s).toFixed(4) + ' rotY=' + root.rotation.y.toFixed(3))
            if (KOI_DEBUG) {
              const db = new THREE.Box3().setFromObject(root)
              const ds = new THREE.Vector3()
              db.getSize(ds)
              flog(name + ' dims=' + fmtV(ds) + ' pos=(' + root.position.x.toFixed(2) + ', ' + root.position.y.toFixed(2) + ', ' + root.position.z.toFixed(2) + ')')
            }
            placeKois()
            return { ok: true, group }
          },
          { log: true }
        )
      })
    }

    // Floor-walking shrimp (PoC only): one instance per GLB, grounded on
    // the sand. No TEMP shrimp exists, so no slot is retired.
    // Phase 12: lite skips these decorative extras.
    // Phase 15C: compact viewports keep a single representative shrimp-a.
    if (!backdropRef.current && (qState.runtime.extras || mount.clientWidth < 720)) {
      const SHRIMP_SOURCES = [
        { name: 'shrimp-a', url: '/aquarium/shrimp_a.glb', cfg: SHRIMP_CFG[0] },
        { name: 'shrimp-b', url: '/aquarium/shrimp_b.glb', cfg: SHRIMP_CFG[1] },
      ]
      const shrimpSources = qState.runtime.extras ? SHRIMP_SOURCES : SHRIMP_SOURCES.slice(0, 1)
      shrimpSources.forEach(({ name, url, cfg }) => {
        loadOptional(
          name,
          url,
          (root) => {
            const junk = []
            root.traverse((n) => {
              if (n.isCamera || n.isLight) junk.push(n)
            })
            junk.forEach((n) => {
              if (n.parent) n.parent.remove(n)
            })
            root.updateMatrixWorld(true)
            const sb = new THREE.Box3().setFromObject(root)
            const sd = new THREE.Vector3()
            const sc = new THREE.Vector3()
            sb.getSize(sd)
            sb.getCenter(sc)
            flog(name + ' pre-box size=' + fmtV(sd) + ' center=' + fmtV(sc))
            if (![sd.x, sd.y, sd.z, sc.x, sc.y, sc.z].every(Number.isFinite)) {
              return { ok: false, reason: 'non-finite bounds' }
            }
            if (sd.z > sd.x) root.rotation.y += Math.PI / 2
            const m = measureRoot(root)
            if (!m) return { ok: false, reason: 'non-finite bounds' }
            const f = fitScale(m.size, [0.65, 0.4, 0.32])
            if (!f.ok) {
              const maxDim = Math.max(m.size.x, m.size.y, m.size.z)
              return { ok: false, reason: `unit guard (maxDim=${maxDim.toFixed(3)} vs ~0.65)` }
            }
            root.scale.setScalar(f.s)
            root.updateMatrixWorld(true)
            // Seat belly on the sand (min.y -> floorY); placeShrimps sets
            // the region position + heading and resets the walk cycle.
            const nb = new THREE.Box3().setFromObject(root)
            root.position.y += cfg.floorY - 0.02 - nb.min.y
            root.updateMatrixWorld(true)
            const group = new THREE.Group()
            group.add(root)
            shrimpList.push({ node: root, cfg, heading: 0, walk: null, region: null })
            flog(name + ' scale=' + f.s.toFixed(4))
            if (SHRIMP_DEBUG) {
              const db = new THREE.Box3().setFromObject(root)
              const ds = new THREE.Vector3()
              db.getSize(ds)
              flog(name + ' dims=' + fmtV(ds) + ' min.y=' + db.min.y.toFixed(3))
            }
            placeShrimps()
            return { ok: true, group }
          },
          { log: true }
        )
      })
    }

    // Hilltop trees (PoC only): ONE fetch of the pristine tree.glb
    // (geometry locked — runtime uniform fit only), cloned into 4 named
    // instances sharing geometry/materials. Seated on the analytic
    // terrain height in poc.ground space (immune to seatTable shifts);
    // poc.ground carries the P1 install-hide, plus a manual late guard.
    // Phase 12: lite skips trees (outdoor decor, not tank composition).
    // Phase 15J: compact viewports restore ONE decimated tree-lite clone
    // (left-near silhouette); Normal keeps all 4 from the original.
    if (!backdropRef.current && poc.ground && (qState.runtime.extras || mount.clientWidth < 720)) {
      // 4-tree frame, empty center: near pair flanks at P0, far pair
      // continues the forest (see tree_visible.js for NDC verification).
      const TREE_CFG = [
        { name: 'tree-left-near', x: -20, z: -18, s: 8.0, rotY: 0.4, ph: 0 },
        { name: 'tree-left-far', x: -12.5, z: -27, s: 5.5, rotY: 1.7, ph: 1.9 },
        { name: 'tree-right-near', x: 19, z: -18, s: 7.0, rotY: 2.5, ph: 3.8 },
        { name: 'tree-right-far', x: 12.5, z: -27, s: 5.0, rotY: 3.6, ph: 5.1 },
      ]
      const treeCfgs = qState.runtime.extras ? TREE_CFG : TREE_CFG.slice(0, 1)
      const treeUrl = qState.mode === 'lite' ? '/aquarium/lite/tree-lite.glb' : '/aquarium/environment/tree.glb'
      const sstepT = (t) => {
        const c = Math.min(Math.max(t, 0), 1)
        return c * c * (3 - 2 * c)
      }
      // Analytic copy of the hill displacement (plateau + warped hills +
      // back-damp/front-dip/radial rules); vertices are never sampled.
      const terrainHeightAt = (x, z) => {
        const dx = Math.max(Math.abs(x) - 8, 0)
        const dz = Math.max(Math.abs(z) - 6, 0)
        const blend = sstepT(Math.hypot(dx, dz) / 10)
        const xw = x + 1.5 * Math.sin(z * 0.06)
        const zw = z + 1.5 * Math.sin(x * 0.05)
        let h = 2.2 * Math.sin(xw * 0.045 + 1.7) * Math.sin(zw * 0.05 + 0.6)
          + 1.2 * Math.sin(xw * 0.09 + zw * 0.07 + 2.0)
        h *= 0.35 + 0.65 * sstepT(z / 16 + 0.5)
        if (z > 0) h -= 0.6 * sstepT(z / 20)
        const r = Math.hypot(x, z)
        h *= 1 - 0.85 * sstepT((r - 40) / 20)
        // Mirror of the geometry-loop far-wave (tree grounding must match
        // the displaced mesh exactly): radial gate, own warp, rim crush.
        let fw = 0
        if (r > 15) {
          const gate = sstepT((r - 15) / 10)
          const wx = x + 1.5 * Math.sin(z * 0.025)
          const wz = z + 1.2 * Math.sin(x * 0.03)
          fw = (0.8 * Math.sin(wx * 0.037 + 0.7)
            + 0.55 * Math.sin(wz * 0.043 + 2.1)
            + 0.25 * Math.sin((wx * 0.6 + wz) * 0.023 + 1.3))
            * gate * (1 - 0.85 * sstepT((r - 40) / 20))
        }
        return (h + fw) * blend
      }
      const placeTreeClone = (src, cfg) => {
        const root = src.clone(true)
        root.updateMatrixWorld(true)
        const tb = new THREE.Box3().setFromObject(root)
        const td = new THREE.Vector3()
        const tc = new THREE.Vector3()
        tb.getSize(td)
        tb.getCenter(tc)
        flog(cfg.name + ' pre-box size=' + fmtV(td) + ' center=' + fmtV(tc))
        if (![td.x, td.y, td.z, tc.x, tc.y, tc.z].every(Number.isFinite)) {
          flog(cfg.name + ' rejected (non-finite bounds)')
          return false
        }
        if (td.z > td.x) root.rotation.y += Math.PI / 2
        const m = measureRoot(root)
        if (!m) {
          flog(cfg.name + ' rejected (non-finite bounds)')
          return false
        }
        const f = fitScale(m.size, [3.2, 5.6, 3.2])
        if (!f.ok) {
          const maxDim = Math.max(m.size.x, m.size.y, m.size.z)
          flog(cfg.name + ` rejected (unit guard maxDim=${maxDim.toFixed(3)} vs ~5.6)`)
          return false
        }
            root.scale.setScalar(f.s * cfg.s)
            root.rotation.y += cfg.rotY
            root.updateMatrixWorld(true)
            // Hue-preserving readability lift (≈+7% green-emphasis, inside
            // the +10% ceiling): scales the sun-driven response instead of a
            // flat emissive floor, so shading depth and hue survive
            // (green foliage, brown trunk). No grading, no recolor.
            root.traverse((n) => {
              if (!n.isMesh || !n.material) return
              const mats = Array.isArray(n.material) ? n.material : [n.material]
              mats.forEach((mt) => {
                if (mt.color && !nightLiftSeen.has(mt)) {
                  mt.color.setRGB(1.07, 1.09, 1.04)
                  trackNightLift(mt, 1.05)
                }
                if (mt.emissive) mt.emissive.setRGB(0, 0, 0)
              })
            })
            // Center footprint on itself; min.y -> terrain (sunk 0.06).
        const nb = new THREE.Box3().setFromObject(root)
        const nc = new THREE.Vector3()
        nb.getCenter(nc)
        const gy = terrainHeightAt(cfg.x, cfg.z) - 0.06
        root.position.x += cfg.x - nc.x
        root.position.z += cfg.z - nc.z
        root.position.y += gy - nb.min.y
        root.updateMatrixWorld(true)
        const group = new THREE.Group()
        group.add(root)
        poc.ground.add(group)
        trackLoaded(group)
        treeSway.push({ root, phase: cfg.ph, amp: cfg.name.indexOf('far') >= 0 ? 0.6 : 1.0 })
        loadedGroups[cfg.name] = group
        if (lastP >= 0.94) group.visible = false
        flog(cfg.name + ' scale=' + (f.s * cfg.s).toFixed(4) + ' pos=(' + cfg.x.toFixed(1) + ', ' + gy.toFixed(3) + ', ' + cfg.z.toFixed(1) + ')')
        if (TREE_DEBUG) {
          const db = new THREE.Box3().setFromObject(root)
          const ds = new THREE.Vector3()
          db.getSize(ds)
          flog(cfg.name + ' dims=' + fmtV(ds) + ' min.y=' + db.min.y.toFixed(3))
          if (cfg.name === 'tree-left-near') {
            // Foliage + trunk share one GLB material (UV-separated);
            // report once: color must stay white/neutral, no grading.
            const seen = new Set()
            root.traverse((n) => {
              if (!n.isMesh || !n.material) return
              const mats = Array.isArray(n.material) ? n.material : [n.material]
              mats.forEach((mt) => {
                if (seen.has(mt.uuid)) return
                seen.add(mt.uuid)
                flog(cfg.name + ' mat=' + (mt.name || '?') + ' type=' + mt.type +
                  ' color=#' + (mt.color ? mt.color.getHexString() : '?') +
                  ' map=' + !!mt.map + ' normalMap=' + !!mt.normalMap +
                  ' mrTex=' + !!mt.metalnessMap + ' rough=' + mt.roughness +
                  ' metal=' + mt.metalness + ' vColors=' + !!mt.vertexColors +
                  ' ds=' + (mt.side === THREE.DoubleSide))
              })
            })
            flog(cfg.name + ' matCount=' + seen.size)
          }
        }
        if (TREE_SHADOW_DEBUG) {
          // Log-only shadow-frustum containment from the live world box.
          const sv = new THREE.Vector3(6.5, 8.5, 4.5)
          const dv = sv.clone().multiplyScalar(-1 / sv.length())
          const fb = new THREE.Box3().setFromObject(group)
          let worst = 0
          for (let cxi = 0; cxi < 8; cxi++) {
            const v = new THREE.Vector3(
              cxi & 1 ? fb.max.x : fb.min.x,
              cxi & 2 ? fb.max.y : fb.min.y,
              cxi & 4 ? fb.max.z : fb.min.z
            )
            worst = Math.max(worst, v.addScaledVector(dv, -v.dot(dv)).length())
          }
          flog(cfg.name + ' shadow-perp ' + worst.toFixed(1) + (worst <= 48 ? ' INSIDE' : ' OUTSIDE'))
        }
        return true
      }
      // Phase 13C: tracked settle (treed OR treeless; Normal + compact).
      track(
        loader
          .loadAsync(treeUrl)
          .then((gltf) => {
          if (cancelled) return
          const src = gltf.scene
          const junk = []
          src.traverse((n) => {
            if (n.isCamera || n.isLight) junk.push(n)
          })
          junk.forEach((n) => {
            if (n.parent) n.parent.remove(n)
          })
          src.updateMatrixWorld(true)
          const sb = new THREE.Box3().setFromObject(src)
          const sd = new THREE.Vector3()
          sb.getSize(sd)
          if (![sd.x, sd.y, sd.z].every((v) => Number.isFinite(v) && v > 0)) {
            flog('tree.glb rejected (non-finite source bounds) — no trees')
            return
          }
          flog('tree.glb src size=' + fmtV(sd))
          let okCount = 0
          treeCfgs.forEach((cfg) => {
            if (placeTreeClone(src, cfg)) okCount++
          })
          flog('trees active ' + okCount + '/' + treeCfgs.length)
          applyCompact(mount.clientWidth)
          if (reduced) rerender()
        }, () => {
          flog('tree.glb missing/unreadable — no trees')
        }),
        'tree'
      )

      // Voxel meadow tufts (PoC only): deterministic instanced grass in
      // ground-local space (P1 install-hide + seatTable ride come free with
      // poc.ground). One shared blade geometry, 3 palette materials, fully
      // static — no motion-system involvement.
      // Phase 12: lite skips the meadow (outdoor decor).
      // Phase 15B: compact viewports keep the procedural meadow/shrubs —
      // zero download, instanced static geometry, same install-hide behavior.
      if (qState.runtime.extras || mount.clientWidth < 720) {
        // Phase 15D: compact viewports render half the instances (first
        // half of the rng-scattered lists = uniform thinning, identical
        // layout). Desktop keeps full density.
        const thinCompact = mount.clientWidth < 720 ? 0.5 : 1
        const rng = (() => {
          let a = 1337
          return () => {
            a |= 0
            a = (a + 0x6d2b79f5) | 0
            let t = Math.imul(a ^ (a >>> 15), 1 | a)
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
          }
        })()
        const bladeGeo = new THREE.BoxGeometry(0.055, 1, 0.055)
        bladeGeo.translate(0, 0.5, 0)
        const grassMats = [0x2e6b34, 0x4c9a44, 0x6fae4e].map((c) => {
          const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 })
          trackNightLift(mat, 1.12)
          return mat
        })
        const dummy = new THREE.Object3D()
        const upVec = new THREE.Vector3(0, 1, 0)
        const qAlign = new THREE.Quaternion()
        const qYaw = new THREE.Quaternion()
        const qLean = new THREE.Quaternion()
        const eul = new THREE.Euler()
        const groundN = (x, z) => {
          const e = 0.35
          const dx = (terrainHeightAt(x + e, z) - terrainHeightAt(x - e, z)) / (2 * e)
          const dz = (terrainHeightAt(x, z + e) - terrainHeightAt(x, z - e)) / (2 * e)
          return new THREE.Vector3(-dx, 1, -dz).normalize()
        }
        // Deterministic patch field: two low-frequency value-noise octaves
        // make irregular dense/open blotches (no stripes/checker/checkerboard).
        const hash2 = (x, y) => {
          let h = (x * 374761393 + y * 668265263) | 0
          h = Math.imul(h ^ (h >>> 13), 1274126177)
          return ((h ^ (h >>> 16)) >>> 0) / 4294967296
        }
        const vnoise = (x, y) => {
          const xi = Math.floor(x)
          const yi = Math.floor(y)
          const xf = x - xi
          const yf = y - yi
          const s = (t) => t * t * (3 - 2 * t)
          const a = hash2(xi, yi)
          const b = hash2(xi + 1, yi)
          const c = hash2(xi, yi + 1)
          const d = hash2(xi + 1, yi + 1)
          const u = s(xf)
          const v = s(yf)
          return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
        }
        const patch = (x, z) =>
          0.55 * vnoise(x * 0.05 + 7.3, z * 0.05 + 3.1) +
          0.45 * vnoise(x * 0.13 + 1.7, z * 0.13 + 8.4)
        // Patch-weighted candidates keep the meadow filled while retaining small open pockets.
        // Tree rings stay within 1.5-5 units and receive denser grass than the open meadow.
        const slots = []
        const treeXZ = [[-20, -18], [-12.5, -27], [19, -18], [12.5, -27]]
        treeXZ.forEach(([tx, tz], ti) => {
          for (let k = 0; k < 24; k++) {
            const a = rng() * Math.PI * 2
            const r = 1.5 + Math.pow(rng(), 0.7) * 3.5
            slots.push([tx + Math.cos(a) * r, tz + Math.sin(a) * r, 0.12, ti])
          }
        })
        for (let k = 0; k < 1300; k++) {
          slots.push([-45 + rng() * 90, -40 + rng() * 52, 0.32, -1])
        }
        // Keep the aquarium/table footprint clear and a sparse corridor around it.
        let exclusionRejects = 0
        const kept = slots.filter((slot) => {
          const [x, z, baseThreshold] = slot
          if (Math.abs(x) < 7 && Math.abs(z) < 5) {
            exclusionRejects++
            return false
          }
          let nearestTree = -1
          let nearestTreeD2 = 25
          treeXZ.forEach(([tx, tz], ti) => {
            const dx = x - tx
            const dz = z - tz
            const d2 = dx * dx + dz * dz
            if (d2 < nearestTreeD2) {
              nearestTreeD2 = d2
              nearestTree = ti
            }
          })
          let threshold = nearestTree >= 0 ? Math.min(baseThreshold, 0.12) : baseThreshold
          if (Math.abs(x) < 10 && Math.abs(z) < 8) threshold = 0.8
          if (Math.abs(x) < 5.5 && Math.abs(z) < 3.5) threshold = 0.95
          slot[3] = nearestTree
          return patch(x, z) > threshold
        })
        // Height tiers: short 30 / medium 45 / tall 20 / accent 5.
        const TIERS = [
          { h0: 0.08, h1: 0.18, b0: 2, b1: 4, w0: 0.75, w1: 1.05 },
          { h0: 0.2, h1: 0.4, b0: 3, b1: 6, w0: 0.85, w1: 1.15 },
          { h0: 0.4, h1: 0.7, b0: 4, b1: 7, w0: 0.9, w1: 1.2 },
          { h0: 0.65, h1: 0.9, b0: 4, b1: 8, w0: 0.95, w1: 1.25 },
        ]
        const tierCount = [0, 0, 0, 0]
        const perVariant = [[], [], []]
        const treeGrassCounts = [0, 0, 0, 0]
        let centralGrassCount = 0
        const yMM = [Infinity, -Infinity]
        kept.forEach(([x, z, , treeIndex]) => {
          if (treeIndex >= 0) treeGrassCounts[treeIndex]++
          if (Math.abs(x) < 10 && Math.abs(z) < 8) centralGrassCount++
          const n = groundN(x, z)
          const gy = terrainHeightAt(x, z) - 0.02
          if (gy < yMM[0]) yMM[0] = gy
          if (gy > yMM[1]) yMM[1] = gy
          const tr = rng()
          const ti = tr < 0.3 ? 0 : tr < 0.75 ? 1 : tr < 0.95 ? 2 : 3
          tierCount[ti]++
          const T = TIERS[ti]
          const blades = T.b0 + Math.floor(rng() * (T.b1 - T.b0 + 1))
          // Far instances skew dark (smaller + darker with distance, no new
          // materials): radius-biased color roll, 35/50/15 base.
          const r = Math.hypot(x, z)
          const cr = rng()
          const vi = r > 30
            ? cr < 0.6 ? 0 : cr < 0.9 ? 1 : 2
            : cr < 0.35 ? 0 : cr < 0.85 ? 1 : 2
          for (let b = 0; b < blades; b++) {
            const ba = rng() * Math.PI * 2
            const br = rng() * 0.12
            const bx = x + Math.cos(ba) * br
            const bz = z + Math.sin(ba) * br
            qAlign.setFromUnitVectors(upVec, n)
            qYaw.setFromAxisAngle(upVec, rng() * Math.PI * 2)
            eul.set((rng() - 0.5) * 0.21, 0, (rng() - 0.5) * 0.21)
            qLean.setFromEuler(eul)
            dummy.position.set(bx, terrainHeightAt(bx, bz) - 0.02, bz)
            dummy.quaternion.copy(qAlign).multiply(qYaw).multiply(qLean)
            dummy.scale.set(T.w0 + rng() * (T.w1 - T.w0), T.h0 + rng() * (T.h1 - T.h0), T.w0 + rng() * (T.w1 - T.w0))
            dummy.updateMatrix()
            perVariant[vi].push(dummy.matrix.clone())
          }
        })
        const grassGroup = new THREE.Group()
        grassGroup.name = 'MeadowTufts'
        let totalBlades = 0
        perVariant.forEach((list, vi) => {
          const im = new THREE.InstancedMesh(bladeGeo, grassMats[vi], Math.max(list.length, 1))
          list.forEach((m, ii) => im.setMatrixAt(ii, m))
          im.count = Math.floor(list.length * thinCompact)
          im.instanceMatrix.needsUpdate = true
          im.castShadow = false
          im.receiveShadow = true
          im.frustumCulled = false
          grassGroup.add(im)
          totalBlades += list.length
          disposables.push(im)
        })
        poc.ground.add(grassGroup)
        disposables.push(bladeGeo, ...grassMats)
        // Voxel shrubs (PoC only): unit-cube InstancedMeshes — 3 leaf greens
        // + brown stems. 5-6 bushes per tree in the 2-5 ring (clearing below
        // 1.5, bushes 2-5, dense grass beyond). Static, ground-local, P1
        // hide rides poc.ground like the grass.
        const bushLeafMats = [0x214f28, 0x356f35, 0x4e8f3e].map((c) => {
          const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0 })
          trackNightLift(mat, 1.1)
          return mat
        })
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x5b4232, roughness: 0.95, metalness: 0 })
        const cubeGeo = new THREE.BoxGeometry(1, 1, 1)
        const leafMats4 = [[], [], []]
        const stemMats4 = []
        const bushPerTree = [0, 0, 0, 0]
        const bushSizeCount = [0, 0, 0]
        let bushCount = 0
        let bushTopY = -Infinity
        const bushSizes = [[0.35, 0.65], [0.65, 1.0], [1.0, 1.4]]
        // Bush slots: tree middle-rings (2-3.5) + patch-gated meadow +
        // far-edge sets. Deterministic 2.5u spacing, exclusion respected.
        const bushSlots = []
        treeXZ.forEach(([tx, tz], ti) => {
          for (let k = 0; k < 12; k++) {
            const a = rng() * Math.PI * 2
            const r = 2 + rng() * 1.5
            bushSlots.push([tx + Math.cos(a) * r, tz + Math.sin(a) * r, ti])
          }
        })
        for (let k = 0; k < 90; k++) {
          const x = -45 + rng() * 90
          const z = -40 + rng() * 52
          if (Math.abs(x) < 7 && Math.abs(z) < 5) continue
          if (patch(x, z) < 0.58) continue
          bushSlots.push([x, z, -1])
        }
        for (let k = 0; k < 24; k++) {
          const a = rng() * Math.PI * 2
          const r = 38 + rng() * 14
          const x = Math.cos(a) * r
          const z = -Math.abs(Math.sin(a) * r) - 8
          if (Math.abs(x) < 7 && Math.abs(z) < 5) continue
          bushSlots.push([x, z, -1])
        }
        const placedBush = []
        bushSlots.forEach(([x, z, ti]) => {
          for (const q of placedBush) {
            const ddx = x - q[0]
            const ddz = z - q[1]
            if (ddx * ddx + ddz * ddz < 6.25) return
          }
          placedBush.push([x, z])
          const sr = rng()
          const si = sr < 0.5 ? 0 : sr < 0.9 ? 1 : 2
          bushSizeCount[si]++
          const S = bushSizes[si][0] + rng() * (bushSizes[si][1] - bushSizes[si][0])
          const gy = terrainHeightAt(x, z) - 0.02
          const cr = rng()
          const li = cr < 0.45 ? 0 : cr < 0.9 ? 1 : 2
            dummy.position.set(x, gy + 0.12 * S, z)
            dummy.quaternion.setFromAxisAngle(upVec, rng() * Math.PI * 2)
            dummy.scale.set(0.09 * S, 0.28 * S, 0.09 * S)
            dummy.updateMatrix()
            stemMats4.push(dummy.matrix.clone())
            const spread = 0.8 + rng() * 0.6
            const lift = 0.8 + rng() * 0.5
            const leaves = 5 + Math.floor(rng() * 10)
            for (let L = 0; L < leaves; L++) {
              const la = rng() * Math.PI * 2
              const lr = Math.sqrt(rng()) * 0.32 * S * spread
              const ly = (0.22 + rng() * 0.45) * S * lift
              const ls = (0.15 + rng() * 0.25) * S
              dummy.position.set(x + Math.cos(la) * lr, gy + ly, z + Math.sin(la) * lr)
              dummy.quaternion.setFromAxisAngle(upVec, (rng() - 0.5) * 0.35)
              dummy.scale.set(ls * (0.8 + rng() * 0.5), ls * (0.7 + rng() * 0.5), ls * (0.8 + rng() * 0.5))
              dummy.updateMatrix()
              leafMats4[li].push(dummy.matrix.clone())
              const top = gy + ly + ls / 2
              if (top > bushTopY) bushTopY = top
            }
            bushCount++
            if (ti >= 0) bushPerTree[ti]++
        })
        const bushGroup = new THREE.Group()
        bushGroup.name = 'MeadowBushes'
        leafMats4.forEach((list, vi) => {
          const im = new THREE.InstancedMesh(cubeGeo, bushLeafMats[vi], Math.max(list.length, 1))
          list.forEach((m, ii) => im.setMatrixAt(ii, m))
          im.count = Math.floor(list.length * thinCompact)
          im.instanceMatrix.needsUpdate = true
          im.castShadow = false
          im.receiveShadow = true
          im.frustumCulled = false
          bushGroup.add(im)
          disposables.push(im)
        })
        {
          const im = new THREE.InstancedMesh(cubeGeo, stemMat, Math.max(stemMats4.length, 1))
          stemMats4.forEach((m, ii) => im.setMatrixAt(ii, m))
          im.count = Math.floor(stemMats4.length * thinCompact)
          im.instanceMatrix.needsUpdate = true
          im.castShadow = false
          im.receiveShadow = true
          im.frustumCulled = false
          bushGroup.add(im)
          disposables.push(im)
        }
        poc.ground.add(bushGroup)
        poc.meadowBushes = bushGroup
        disposables.push(cubeGeo, ...bushLeafMats, stemMat)
        flog('grass clusters=' + kept.length + ' blades=' + totalBlades + ' tiers=[' + tierCount.join(',') + '] yRange=[' + yMM[0].toFixed(2) + ',' + yMM[1].toFixed(2) + '] variants=3')
        if (GRASS_DEBUG) {
          const drawCalls = grassGroup.children.length + bushGroup.children.length
          flog('grass-debug clusters=' + kept.length + ' short=' + tierCount[0] + ' medium=' + tierCount[1] + ' tall=' + tierCount[2] + ' accent=' + tierCount[3] + ' blades=' + totalBlades + ' bushes=' + bushCount + ' bushSmall=' + bushSizeCount[0] + ' bushMedium=' + bushSizeCount[1] + ' bushLarge=' + bushSizeCount[2] + ' treeGrass=' + treeGrassCounts.join(',') + ' treeBushes=' + bushPerTree.join(',') + ' centralExclusions=' + exclusionRejects + ' centralCorridor=' + centralGrassCount + ' drawCalls=' + drawCalls)
        }
      }
    }

    const onFrame = (w, h, force = false) => {
      // Phase 12: skip redundant resize/projection work — the old code ran
      // setSize + updateProjectionMatrix every RAF even when nothing changed.
      if (!force && w === qState.lastW && h === qState.lastH) return
      qState.lastW = w
      qState.lastH = h
      camera.aspect = w / Math.max(h, 1)
      camera.fov = camera.aspect < 1 ? 62 : 45
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      // World-space sky arc: fully static (parallax comes from the camera).
      // Debug only below; no per-frame sky transforms exist by design.
      if (poc.skyDay && poc.skyAspect) {
        if (SKY_DEBUG && !poc.skyLogged) {
          poc.skyLogged = true
          flog('sky active=' + (poc.k > 0.5 ? 'night' : 'day') + ' arcR=' + poc.skyArcR + ' arc=' + poc.skyArc.toFixed(3) + ' arcH=' + poc.skyArcH + ' viewport=' + camera.aspect.toFixed(3))
        }
        if (HORIZON_DEBUG && !poc.horizonLogged) {
          poc.horizonLogged = true
          const fd = scene.fog && scene.fog.density ? scene.fog.density : 0
          const blend = 1 - Math.exp(-Math.pow(60 * fd, 2))
          const dNear = camera.position.distanceTo(_horC.set(0, -1.65, 0))
          const dFar = camera.position.distanceTo(_horC.set(60, -1.65, 60))
          const bAt = (d) => smooth(Math.min(Math.max((d - HORIZON_START) / (HORIZON_END - HORIZON_START), 0), 1)) * HORIZON_CAP
          flog('horizon skyAspect=' + poc.skyAspect.toFixed(4) + ' viewport=' + camera.aspect.toFixed(3) + ' hillY=[' + (poc.hillMin != null ? poc.hillMin.toFixed(2) : '?') + ',' + (poc.hillMax != null ? poc.hillMax.toFixed(2) : '?') + '] blend60=' + blend.toFixed(3))
          flog('horizon range=[' + HORIZON_START + ',' + HORIZON_END + '] camDist=[' + dNear.toFixed(1) + ',' + dFar.toFixed(1) + '] tintDay=#' + horizonU.day.value.getHexString() + ' tintNight=#' + horizonU.night.value.getHexString() + ' blend=[' + bAt(dNear).toFixed(2) + ',' + bAt(dFar).toFixed(2) + ']')
        }
      }
      if (trans) {
        const s = renderer.getDrawingBufferSize(new THREE.Vector2())
        trans.sceneRT.setSize(s.x, s.y)
        trans.skyRT.setSize(s.x, s.y)
      }
      applyCompact(w)
    }
    const rerender = () => {
      onFrame(mount.clientWidth, mount.clientHeight)
      renderer.render(scene, camera)
    }
    const syncReducedScene = (p) => {
      const value = Math.min(Math.max(p, 0), 1)
      applyProgress(value)
      applyRevealVisuals(revealK(value))
      updateOutdoor(0, value, performance.now() / 1000, true)
      lastP = value
      setInstallVisible(false)
      setHeroMounted(value >= 0.94)
      setDebug({ p: value, phase: phaseOf(value) })
      updateSign(performance.now() / 1000, value)
      rerender()
    }
    sceneCommandRef.current = syncReducedScene

    let raf = 0
    let displayed = reduced ? 1 : 0
    // Phase 13C: a rendered frame counts toward readiness; 100% additionally
    // requires every tracked settle (see maybeHealthy). Same RAF, same sites.
    const markHealthy = () => {
      if (cancelled) return
      readiness.frames += 1
      maybeHealthy()
    }

    if (backdropRef.current) {
      // Ambient persistent mode: fixed P4 composition modulated per section.
      // No scroll math, no overlay, no per-frame React state.
      // Backdrop-only TEMP fish scale to match the GLB backdrop treatment.
      if (temp.fish[0]) temp.fish[0].scale.setScalar(FISH_BACKDROP_SCALE)
      // Backdrop-only living-room floor: matte grounding plane for the tank
      // base zone and the side table. Never created in PoC mode.
      const roomFloorGeo = new THREE.PlaneGeometry(40, 40)
      const roomFloorMat = new THREE.MeshStandardMaterial({ color: 0x141519, roughness: 1 })
      disposables.push(roomFloorGeo, roomFloorMat)
      const roomFloor = new THREE.Mesh(roomFloorGeo, roomFloorMat)
      roomFloor.rotation.x = -Math.PI / 2
      roomFloor.position.y = -0.1
      scene.add(roomFloor)
      // Backdrop-only side table: single living-room prop left of the tank.
      // Silent absence on miss/invalid; PBR materials preserved untouched.
      // Phase 12: lite skips it (no fetch).
      if (qState.runtime.extras) loadOptional('side-table', '/aquarium/room/side_table/side_table_01_4k.gltf', (root) => {
        const junk = []
        root.traverse((n) => {
          if (n.isCamera || n.isLight) junk.push(n)
        })
        junk.forEach((n) => {
          if (n.parent) n.parent.remove(n)
        })
        root.rotation.y += 0.21
        root.updateMatrixWorld(true)
        const m = measureRoot(root)
        if (!m) return { ok: false }
        const f = fitScale(m.size, [1.4, 1.4, 1.4])
        if (!f.ok) return f
        root.scale.setScalar(f.s)
        root.updateMatrixWorld(true)
        const b = new THREE.Box3().setFromObject(root)
        root.position.x += -5.2 - (b.min.x + b.max.x) / 2
        root.position.z += -0.5 - (b.min.z + b.max.z) / 2
        root.position.y += -0.1 - b.min.y
        downscaleTextures(root, 2048, disposables)
        const group = new THREE.Group()
        group.add(root)
        return { ok: true, group }
      })
      const sm = { pos: [...P4_POS], fog: 0.075, light: 1 }
      applyProgress(1)
      if (reduced) {
        renderer.render(scene, camera)
        markHealthy()
      } else {
        const tickBackdrop = () => {
          const goal = SECTION_MOD[progRef.current.activeId] || SECTION_MOD.home
          const L = 0.06
          for (let i = 0; i < 3; i++) {
            sm.pos[i] += ((P4_POS[i] + goal.d[i]) - sm.pos[i]) * L
          }
          sm.fog += (goal.fog - sm.fog) * L
          sm.light += (goal.light - sm.light) * L
          camera.position.set(sm.pos[0], sm.pos[1], sm.pos[2])
          camera.lookAt(P4_TGT[0], P4_TGT[1], P4_TGT[2])
          scene.fog.density = 0.075 * sm.fog
          lightsBase.forEach(([light, base]) => {
            light.intensity = base * sm.light
          })
          onFrame(mount.clientWidth, mount.clientHeight)
          updateSign(performance.now() / 1000, 1)
          renderer.render(scene, camera)
          markHealthy()
          raf = requestAnimationFrame(tickBackdrop)
        }
        raf = requestAnimationFrame(tickBackdrop)
      }
    } else if (reduced) {
      // Reduced motion snaps to the current scroll position without an animation loop.
      syncReducedScene(integratedRef.current ? (diveProgressRef.current ?? progRef.current.dive) : 1)
      markHealthy()
    } else {
      const target = () => {
        if (integratedRef.current) return diveProgressRef.current ?? progRef.current.dive
        const max = document.documentElement.scrollHeight - window.innerHeight
        return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0
      }
      let lastT = performance.now()
      // Return-to-P0 rewind state (DIVE AGAIN): animated in this same tick,
      // parked at 0 with a single completion callback. No second RAF.
      let returnStartedAt = null
      let returnFrom = 0
      let returnDoneSent = false
      // Phase 14B DEV probe: per-frame counters into probeRef (when passed).
      // renderer.info resets per render() call, so freeze accumulation for
      // the frame and reset manually — counters only, rendering untouched.
      // Zero cost when probeRef is null.
      const probeActive = probeRef != null
      const probeSize = probeActive ? new THREE.Vector2() : null
      let probeMs = 0
      if (probeActive) renderer.info.autoReset = false
      const tick = () => {
        const now = performance.now()
        qState.frame += 1
        const rawMs = now - lastT
        const dt = Math.min(rawMs / 1000, 0.1)
        lastT = now
        if (probeActive) renderer.info.reset()
        const goal = target()
        if (integratedRef.current && returningRef.current) {
          if (returnStartedAt == null) {
            returnStartedAt = now
            returnFrom = displayed
            returnDoneSent = false
          }
          const t = Math.min((now - returnStartedAt) / 1800, 1)
          const eased = t * t * (3 - 2 * t)
          displayed = returnFrom * (1 - eased)
          if (t >= 1) {
            displayed = 0
            if (!returnDoneSent) {
              returnDoneSent = true
              cbRef.current.onReturnComplete && cbRef.current.onReturnComplete()
            }
          }
        } else {
          returnStartedAt = null
          returnDoneSent = false
          displayed += (goal - displayed) * 0.1
          if (Math.abs(goal - displayed) < 0.0005) displayed = goal
        }
        applyProgress(displayed)
        applyRevealVisuals(revealK(displayed))
        updateOutdoor(dt, displayed, now / 1000, false)
        updateSign(now / 1000, displayed)
        lastP = displayed
        if (displayed > 0.96) setHeroMounted(true)
        onFrame(mount.clientWidth, mount.clientHeight)
        renderFrame(displayed, now / 1000)
        markHealthy()
        if (probeActive && probeRef) {
          probeMs = probeMs ? probeMs * 0.95 + rawMs * 0.05 : rawMs
          const pr = probeRef.current || (probeRef.current = { settles: settleLog })
          const info = renderer.info
          pr.calls = info.render.calls
          pr.tris = info.render.triangles
          pr.points = info.render.points
          pr.geos = info.memory.geometries
          pr.texs = info.memory.textures
          pr.ms = probeMs
          pr.mode = qState.mode
          try {
            pr.phase = phaseOf(displayed)
          } catch { /* advisory only */ }
          pr.pr = renderer.getPixelRatio()
          renderer.getDrawingBufferSize(probeSize)
          pr.bufW = Math.round(probeSize.x)
          pr.bufH = Math.round(probeSize.y)
          if (trans) {
            pr.rtW = trans.sceneRT.width
            pr.rtH = trans.sceneRT.height
          } else {
            pr.rtW = 0
            pr.rtH = 0
          }
          pr.shadow = qState.runtime.shadows ? qState.runtime.shadowSize : 0
          pr.ready = `${Math.min(readiness.settled, Math.max(readiness.total, 1))}/${Math.max(readiness.total, 1)}`
          pr.frames = readiness.frames
        }
        // Phase 12: the old code pushed a React state update every RAF.
        // Throttle to phase changes / configured cadence instead.
        {
          const phase = phaseOf(displayed)
          if (phase !== qState.lastDebugPhase || now - qState.lastDebugAt >= qState.runtime.debugThrottleMs) {
            qState.lastDebugPhase = phase
            qState.lastDebugAt = now
            setDebug({ p: displayed, phase })
          }
        }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }

    const ro = new ResizeObserver(() => {
      onFrame(mount.clientWidth, mount.clientHeight)
      if (reduced) renderer.render(scene, camera)
    })
    ro.observe(mount)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      sceneCommandRef.current = null
      runtimeApplyRef.current = null
      ro.disconnect()
      if (themeObs) themeObs.disconnect()
      disposables.forEach((d) => d.dispose && d.dispose())
      waterMat.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  // Phase 12: live Normal ↔ Lite switch. INIT-time settings (antialias)
  // are intentionally left alone — no renderer/scene/context recreation.
  useEffect(() => {
    if (runtimeApplyRef.current) runtimeApplyRef.current(qualityMode)
  }, [qualityMode])

  const revealProgress = integratedRef.current
    ? returningToP0 ? debug.p : diveProgress ?? prog.dive
    : debug.p
  const rp = smooth(Math.min(Math.max((revealProgress - 0.94) / 0.06, 0), 1))
  const revealed = revealProgress >= 0.94

  useLayoutEffect(() => {
    if (heroRevealRef.current) heroRevealRef.current.inert = !revealed
  }, [revealed])

  if (integratedRef.current) {
    return (
      <>
        <div
          id="portfolio-dive"
          className="portfolio-dive-spacer"
          style={introComplete ? { height: 0 } : undefined}
        >
          <div
            ref={mountRef}
            aria-hidden="true"
            className="webgl-backdrop"
            style={{ position: 'fixed', inset: 0, zIndex: -1, overflow: 'hidden', background: '#06121f' }}
          />
        </div>
        <div
          ref={heroRevealRef}
          className="hero-reveal"
          style={{
            position: introComplete ? 'relative' : 'fixed',
            inset: introComplete ? undefined : 0,
            zIndex: 10,
            opacity: rp,
            visibility: revealed || rp > 0 ? 'visible' : 'hidden',
            pointerEvents: revealed ? 'auto' : 'none',
            transform: `translate3d(0, ${8 * (1 - rp)}px, 0) scale(${0.985 + 0.015 * rp})`,
            transition: 'opacity 0.75s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.75s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {children}
        </div>
      </>
    )
  }

  // Backdrop mode: bare fixed canvas only. No spacer, overlay, or debug.
  if (backdropRef.current) {
    return <div ref={mountRef} className="webgl-backdrop" aria-hidden="true" />
  }

  return (
    <div style={{ position: 'relative', height: '500vh' }}>
      <div
        ref={mountRef}
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#06121f' }}
      />
      {heroMounted && (
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1,
              pointerEvents: 'none',
              opacity: rp,
              background:
                'linear-gradient(to bottom, rgba(4,12,20,0.30), rgba(4,12,20,0.52))',
            }}
          />
          <div
            className="aqua-root"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              opacity: rp,
              transform: `scale(${(0.94 + 0.06 * rp).toFixed(3)}) translateY(${((1 - rp) * 12).toFixed(1)}px)`,
              pointerEvents: debug.p >= 0.995 ? 'auto' : 'none',
            }}
          >
            <Hero />
          </div>
        </>
      )}
      <div
        role="status"
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 10,
          fontFamily: 'monospace',
          fontSize: 12,
          letterSpacing: '0.08em',
          color: '#cfe6f5',
          background: 'rgba(4,12,20,0.65)',
          border: '1px solid rgba(160,200,235,0.25)',
          borderRadius: 8,
          padding: '6px 10px',
          pointerEvents: 'none',
        }}
      >
        Dive {debug.p.toFixed(2)} · {debug.phase}
      </div>
    </div>
  )
}
