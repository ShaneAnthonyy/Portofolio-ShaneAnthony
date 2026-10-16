import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const random = (seed) => THREE.MathUtils.euclideanModulo(Math.sin(seed * 127.1 + 311.7) * 43758.5453, 1)
const vertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const waterMath = `
  uniform float uTime;
  uniform vec2 uSize;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + 1.0), f.x), f.y);
  }
  float caustic(vec2 p) {
    // Organic water-light: low-frequency domain warp breaks the sine
    // lattice into irregular filaments; a slow noise mask keeps patches
    // faintly visible instead of a full-screen web. Exponents are soft
    // (8/10 vs 18/22) to avoid sharp crossing lines.
    vec2 warp = vec2(
      noise(p * 0.32 + vec2(uTime * 0.030, -uTime * 0.022)),
      noise(p * 0.32 + vec2(5.2, 1.3) + vec2(-uTime * 0.020, uTime * 0.026))
    ) * 2.0 - 1.0;
    vec2 q = p + warp * 1.1;
    float a = sin(q.x * 1.7 + q.y * 0.6 + uTime * 0.12) + sin(q.y * 1.5 - q.x * 0.5 - uTime * 0.09);
    float b = sin((q.x - q.y) * 1.1 + uTime * 0.07) + cos(q.y * 1.2 + q.x * 0.4 + 1.7);
    float filaments = pow(1.0 - abs(a) * 0.5, 8.0) * 0.55 + pow(1.0 - abs(b) * 0.5, 10.0) * 0.45;
    float mask = smoothstep(0.28, 0.75, noise(p * 0.27 + warp * 0.6 + uTime * 0.015));
    return filaments * (0.25 + 0.75 * mask);
  }
  // Two counter-drifting procedural normal layers over a low-frequency
  // calm mask. UVs are noise-warped so no sine lattice or stripe
  // repetition shows. Returns surface slope (not a unit normal).
  float wHeight(vec2 v) {
    return sin(dot(v, vec2(1.1, 0.6)) + uTime * 0.35) * 0.50
         + sin(dot(v, vec2(-0.7, 1.3)) + 1.7 - uTime * 0.27) * 0.35
         + sin(dot(v, vec2(0.5, -1.1)) * 1.7 + 0.6 + uTime * 0.22) * 0.15;
  }
  float calmMask(vec2 p) {
    return smoothstep(0.30, 0.70, noise(p * 0.16 - vec2(uTime * 0.012, uTime * 0.008)));
  }
  vec2 waterSlope(vec2 p) {
    vec2 w = vec2(
      noise(p * 0.25 + vec2(uTime * 0.020, uTime * 0.013)),
      noise(p * 0.25 + vec2(3.7, 9.1) - vec2(uTime * 0.017, -uTime * 0.011))
    ) - 0.5;
    vec2 q = p * 0.55 + w * 1.4;
    float e = 0.35;
    float s = 0.35 + 0.65 * calmMask(p);
    vec2 g = vec2(
      wHeight(q + vec2(e, 0.0)) - wHeight(q - vec2(e, 0.0)),
      wHeight(q + vec2(0.0, e)) - wHeight(q - vec2(0.0, e))
    ) / (2.0 * e);
    return g * 0.18 * s;
  }
  // Sun azimuth (scene sun sits at (-4, 6, 10)): soft broad glints where
  // slopes face the sun, plus a faint sharp accent. Restrained by design.
  float sunGlint(vec2 slope) {
    return pow(clamp(0.5 + dot(slope, vec2(-0.573, 0.819)) * 3.0, 0.0, 1.0), 6.0);
  }
  float sunAccent(vec2 slope) {
    return pow(clamp(0.5 + dot(slope, vec2(-0.573, 0.819)) * 4.0, 0.0, 1.0), 24.0);
  }
`

function fishGeometry() {
  const pieces = []
  const add = (geometry, part) => {
    geometry.setAttribute('aPart', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(part), 1))
    pieces.push(geometry.toNonIndexed())
    geometry.dispose()
  }
  const body = new THREE.SphereGeometry(1, 20, 12)
  const positions = body.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const taper = 0.7 + 0.3 * (x + 1) / 2
    positions.setXYZ(i, x * 0.7, positions.getY(i) * 0.23 * taper, positions.getZ(i) * 0.18 * taper)
  }
  body.computeVertexNormals()
  add(body, 0)
  const fin = (points) => {
    const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
    const geometry = new THREE.ShapeGeometry(shape)
    geometry.translate(0, 0, 0.015)
    add(geometry, 1)
  }
  fin([[-0.56, 0], [-1.13, 0.34], [-1.03, 0.08], [-0.92, 0], [-1.03, -0.08], [-1.13, -0.34]])
  for (const side of [-1, 1]) {
    fin([[0.25, side * 0.12], [-0.16, side * 0.48], [-0.34, side * 0.35], [-0.08, side * 0.09]])
    const eye = new THREE.SphereGeometry(0.037, 8, 5)
    eye.scale(1, 1, 0.55)
    eye.translate(0.47, side * 0.117, 0.116)
    add(eye, 2)
  }
  const geometry = mergeGeometries(pieces)
  pieces.forEach(piece => piece.dispose())
  return geometry
}

export function fishPose(index, time, width, height, compact = width < height) {
  const direction = index % 2 ? -1 : 1
  const speed = direction * (0.028 + random(index + 5) * 0.018)
  const phase = time * speed + index * 2.39996 + 0.6
  const rx = width * (0.32 + random(index + 8) * 0.065)
  const ry = height * (compact ? 0.095 : 0.31 + random(index + 12) * 0.07)
  const centerY = compact ? (index % 2 ? -1 : 1) * height * 0.32 : 0
  return {
    x: Math.cos(phase) * rx,
    y: centerY + Math.sin(phase) * ry,
    angle: Math.atan2(Math.cos(phase) * ry * speed, -Math.sin(phase) * rx * speed),
    depth: 0.7 + random(index + 20) * 0.9,
    scale: 0.65 + random(index + 30) * 0.35,
  }
}

export function createHeroAquarium(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power', stencil: false, depth: true })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setClearColor('#0c2636')
  host.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-10, 10, 7, -7, 0.1, 30)
  camera.position.set(0, 0, 20)
  camera.lookAt(0, 0, 0)
  const resources = new Set()
  const keep = value => { resources.add(value); return value }
  const time = { value: 18 }
  const size = { value: new THREE.Vector2(20, 14) }
  const deep = { value: new THREE.Color() }
  const shallow = { value: new THREE.Color() }
  const sand = { value: new THREE.Color() }
  const light = { value: new THREE.Color() }
  const darkness = { value: 0 }
  const uniforms = { uTime: time, uSize: size, uDeep: deep, uShallow: shallow, uSand: sand, uLight: light, uDark: darkness }
  const plane = keep(new THREE.PlaneGeometry(1, 1))
  const floorMaterial = keep(new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertex,
    fragmentShader: `${waterMath}
      uniform vec3 uDeep, uShallow, uSand, uLight;
      uniform float uDark;
      void main() {
        vec2 p = (vUv - 0.5) * uSize;
        float n = noise(p * 0.55) * 0.65 + noise(p * 1.3) * 0.35;
        float large = noise(p * 0.18 + vec2(uTime * 0.010, 0.0));
        float edge = smoothstep(0.3, 0.72, length((vUv - 0.5) * vec2(1.0, 1.1)));
        float bank = smoothstep(0.52, 0.86, n + edge * 0.32);
        float center = 1.0 - smoothstep(0.12, 0.38, length((vUv - 0.5) * vec2(0.7, 1.6)));
        vec3 color = mix(uShallow, uDeep, (0.18 + n * 0.32 + edge * 0.48) * (1.0 - center * 0.5));
        color = mix(color, uDeep, large * 0.18 * (1.0 - center * 0.4));
        color = mix(color, uSand, bank * 0.36 * (1.0 - center));
        float grain = hash(floor(p * 110.0)) - 0.5;
        color += grain * 0.012 * (1.0 - uDark * 0.7);
        // Caustic lookup rides the surface slope (light coupled to the same
        // field that shades the surface) + normal-driven sun glints.
        vec2 slope = waterSlope(p);
        float cl = caustic(p * 0.9 + slope * 1.5);
        float cmask = smoothstep(0.30, 0.75, noise(p * 0.30 + uTime * 0.020));
        color += uLight * cl * (0.016 + edge * 0.030) * (0.35 + 0.65 * cmask) * (1.0 - center * 0.8);
        color += uLight * sunGlint(slope) * 0.022 * (1.0 - center * 0.7);
        color += uLight * sunAccent(slope) * 0.014 * (1.0 - center * 0.7);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  }))
  const floor = new THREE.Mesh(plane, floorMaterial)
  scene.add(floor)

  const fishMaterial = keep(new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      attribute float aPart;
      attribute float aSeed;
      varying vec3 vPosition, vNormal;
      varying float vPart, vSeed, vDepth;
      varying vec2 vWaters;
      void main() {
        vec3 p = position;
        float flex = 1.0 - smoothstep(-1.15, 0.1, p.x);
        p.y += sin(uTime * (3.4 + aSeed * 0.7) + aSeed * 12.0 + p.x * 4.0) * flex * flex * 0.14;
        vPosition = position;
        vNormal = normalize(mat3(instanceMatrix) * normal);
        vPart = aPart; vSeed = aSeed; vDepth = instanceMatrix[3].z;
        vWaters = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xy;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uDeep, uShallow;
      uniform float uDark;
      uniform float uTime;
      varying vec3 vPosition, vNormal;
      varying float vPart, vSeed, vDepth;
      varying vec2 vWaters;
      // Single-pass approximation, NOT true refraction — the fish tint
      // breathes with the same slow field that moves the surface, so fish
      // read as seen through moving water. Subtle by design (±0.05 mix).
      float fishHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float fishNoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(fishHash(i), fishHash(i + vec2(1, 0)), f.x), mix(fishHash(i + vec2(0, 1)), fishHash(i + 1.0), f.x), f.y);
      }
      void main() {
        vec2 p = vPosition.xy;
        float marking = sin(p.x * 13.0 + vSeed * 33.0 + sin(p.y * 18.0)) * cos(p.y * 13.0 - vSeed * 12.0);
        vec3 cream = vec3(0.73, 0.72, 0.59);
        vec3 pigment = mix(vec3(0.63, 0.22, 0.075), vec3(0.075, 0.22, 0.24), step(0.55, vSeed));
        vec3 color = mix(cream, pigment, smoothstep(-0.1, 0.35, marking));
        color = mix(color, vec3(0.025, 0.065, 0.065), smoothstep(0.72, 0.88, marking) * 0.7);
        if (vPart > 0.5) color = mix(cream, pigment, 0.22) * (0.65 + 0.2 * cos(p.x * 38.0 + p.y * 22.0));
        if (vPart > 1.5) color = vec3(0.012, 0.026, 0.03);
        float diffuse = 0.45 + 0.55 * max(0.0, dot(normalize(vNormal), normalize(vec3(-0.4, 0.5, 1.0))));
        color *= diffuse * (1.0 - uDark * 0.48);
        float wob = fishNoise(vWaters * 0.30 + uTime * 0.02) - 0.5;
        color = mix(color, mix(uDeep, uShallow, 0.45), clamp(0.22 + (1.6 - vDepth) * 0.16 + wob * 0.10, 0.0, 0.6));
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  }))
  const fishGeo = keep(fishGeometry())
  fishGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array(Array.from({length: 6}, (_, i) => random(i + 60))), 1))
  const fish = new THREE.InstancedMesh(fishGeo, fishMaterial, 6)
  fish.frustumCulled = false
  fish.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  scene.add(fish)

  const shadowMaterial = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; void main() { float a = pow(max(0.0, 1.0 - length((vUv - 0.5) * 2.0)), 2.0) * 0.28; gl_FragColor = vec4(0.01, 0.035, 0.045, a); }`,
  }))
  const shadows = new THREE.InstancedMesh(plane, shadowMaterial, 6)
  shadows.frustumCulled = false
  shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  scene.add(shadows)

  const rockMaterial = keep(new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }))
  const rocks = new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(1, 1)), rockMaterial, 32)
  rocks.frustumCulled = false
  scene.add(rocks)
  scene.add(new THREE.AmbientLight('#c7ece7', 2.1))
  const sun = new THREE.DirectionalLight('#d9f6f1', 2.2)
  sun.position.set(-4, 6, 10)
  scene.add(sun)

  const leaf = keep(new THREE.PlaneGeometry(1, 1, 1, 7))
  const leafPos = leaf.attributes.position
  for (let i = 0; i < leafPos.count; i++) {
    const y = leafPos.getY(i) + 0.5
    leafPos.setXYZ(i, leafPos.getX(i) * Math.sin(Math.PI * y) * 0.26 + y * y * 0.18, y, Math.sin(y * 2.5) * 0.18)
  }
  leaf.computeVertexNormals()
  const leafMaterial = keep(new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide,
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.x += sin(uTime * 0.65 + instanceMatrix[3].x * 3.0 + p.y * 2.0) * p.y * p.y * 0.055;
        vShade = 0.55 + 0.45 * abs(normal.z);
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uDark;
      varying vec2 vUv;
      varying float vShade;
      void main() {
        vec3 color = mix(vec3(0.045, 0.165, 0.135), vec3(0.16, 0.30, 0.22), vUv.y);
        color *= vShade * (1.0 - uDark * 0.48);
        color += vec3(0.05, 0.10, 0.08) * pow(1.0 - abs(vUv.x - 0.5) * 2.0, 16.0);
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  }))
  const plants = new THREE.InstancedMesh(leaf, leafMaterial, 64)
  plants.frustumCulled = false
  scene.add(plants)

  const surfaceMaterial = keep(new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: vertex,
    fragmentShader: `${waterMath}
      uniform vec3 uLight;
      float ripple(vec2 p, vec2 origin, float offset) {
        float age = mod(uTime + offset, 15.0);
        float d = length(p - origin);
        float ring = sin(d * 20.0 - age * 6.0) * exp(-pow((d - age * 0.32) * 4.0, 2.0));
        return max(0.0, ring) * smoothstep(0.0, 0.6, age) * (1.0 - smoothstep(2.5, 4.5, age));
      }
      void main() {
        vec2 p = (vUv - 0.5) * uSize;
        float center = smoothstep(0.1, 0.38, length((vUv - 0.5) * vec2(0.8, 1.8)));
        float rings = ripple(p, uSize * vec2(-0.29, 0.27), 0.0) + ripple(p, uSize * vec2(0.3, -0.29), 7.0);
        // Surface sheen follows the same normal field as the floor glints,
        // so highlights sit on the same moving water.
        vec2 slope = waterSlope(p);
        float glint = sunGlint(slope);
        float accent = sunAccent(slope);
        float alpha = (caustic(p * 0.7 + slope) * 0.022 + rings * 0.16 + glint * 0.016 + accent * 0.022) * center;
        gl_FragColor = vec4(uLight, alpha);
        #include <colorspace_fragment>
      }
    `,
  }))
  const surface = new THREE.Mesh(plane, surfaceMaterial)
  surface.position.z = 2.8
  surface.renderOrder = 2
  scene.add(surface)
  const dummy = new THREE.Object3D()
  let width = 20, height = 14
  let compact = false

  function resize(pixelWidth, pixelHeight, dpr = window.devicePixelRatio || 1) {
    const mobile = pixelWidth <= 720
    compact = mobile || pixelWidth < pixelHeight
    renderer.setPixelRatio(Math.min(dpr, mobile ? 1 : 1.25))
    renderer.setSize(pixelWidth, pixelHeight)
    const aspect = pixelWidth / Math.max(pixelHeight, 1)
    
    width = aspect < 1 ? 9 : 16 * aspect
    height = width / aspect
    size.value.set(width, height)
    camera.left = -width / 2; camera.right = width / 2
    camera.top = height / 2; camera.bottom = -height / 2
    camera.updateProjectionMatrix()
    floor.scale.set(width, height, 1)
    surface.scale.copy(floor.scale)
    fish.count = shadows.count = mobile ? 3 : 6
    rocks.count = mobile ? 18 : 32
    plants.count = mobile ? 36 : 64
    for (let i = 0; i < rocks.count; i++) {
      const corner = i % 4
      const jx = (random(i + 120) - 0.5) * 0.07 * width
      const jy = (random(i + 130) - 0.5) * 0.07 * height
      const x = (corner < 2 ? -1 : 1) * (0.43 + random(i + 80) * 0.09) * width + jx
      const y = (corner % 2 ? -1 : 1) * (0.31 + random(i + 95) * 0.23) * height + jy
      const s = 0.25 + random(i + 100) * 0.52
      dummy.position.set(x, y, -0.04)
      dummy.rotation.set(random(i) * 0.8, random(i + 2) * 0.8, random(i + 4) * Math.PI)
      dummy.scale.set(s * 1.5, s, s * 0.65)
      dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix)
      rocks.setColorAt(i, new THREE.Color().setHSL(0.45 + random(i) * 0.05, 0.10, 0.38 + random(i + 1) * 0.12))
    }
    for (let i = 0; i < plants.count; i++) {
      const group = Math.floor(i / 8)
      const left = group % 2 === 0
      const upper = group % 4 < 2
      dummy.position.set((left ? -1 : 1) * width * (0.435 + random(group + 170) * 0.05) + (random(i + 180) - 0.5) * 0.08 * width, (upper ? 1 : -1) * height * (0.30 + random(group + 210) * 0.17) + (random(i + 190) - 0.5) * 0.06 * height, 0.18 + random(i) * 0.1)
      dummy.rotation.set(0, 0, random(i + 150) * Math.PI * 2)
      const s = 0.8 + random(i + 160) * 1.1
      dummy.scale.set(s, s, s)
      dummy.updateMatrix(); plants.setMatrixAt(i, dummy.matrix)
    }
    rocks.instanceMatrix.needsUpdate = true
    rocks.instanceColor.needsUpdate = true
    plants.instanceMatrix.needsUpdate = true
  }

  function setTheme(dark) {
    darkness.value = dark ? 1 : 0
    deep.value.set(dark ? '#061923' : '#3f777f')
    shallow.value.set(dark ? '#123948' : '#b3dad6')
    sand.value.set(dark ? '#254249' : '#a9bba6')
    light.value.set(dark ? '#76c4cc' : '#e1f2df')
    rockMaterial.color.set(dark ? '#527e89' : '#b4c7b0')
    sun.intensity = dark ? 1.1 : 2.2
  }

  function render(seconds = 18) {
    time.value = seconds
    for (let i = 0; i < fish.count; i++) {
      const pose = fishPose(i, seconds, width, height, compact)
      dummy.position.set(pose.x, pose.y, pose.depth)
      dummy.rotation.set(0, 0, pose.angle)
      dummy.scale.setScalar(pose.scale)
      dummy.updateMatrix(); fish.setMatrixAt(i, dummy.matrix)
      dummy.position.set(pose.x + 0.16, pose.y - 0.2, 0.02)
      dummy.scale.set(pose.scale * 2.4, pose.scale * 1.05, 1)
      dummy.updateMatrix(); shadows.setMatrixAt(i, dummy.matrix)
    }
    fish.instanceMatrix.needsUpdate = true
    shadows.instanceMatrix.needsUpdate = true
    renderer.render(scene, camera)
  }

  setTheme(document.documentElement.dataset.theme === 'dark')
  resize(host.clientWidth, host.clientHeight)
  return {
    render, resize, setTheme, canvas: renderer.domElement, info: renderer.info,
    setApproach(progress) {
      camera.position.y = -3.2 * progress
      camera.lookAt(0, 0, 0)
    },
    dispose() {
      for (const mesh of [fish, shadows, rocks, plants]) mesh.dispose()
      resources.forEach(resource => resource.dispose())
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    },
  }
}
