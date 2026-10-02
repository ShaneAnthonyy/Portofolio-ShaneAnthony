// Minecraft-style "SCROLL ME" sign: large floor-standing voxel plank +
// post with a canvas face texture. Plain factory (no React), matching the
// Dive file's helper convention. Geometries, materials, and the texture are
// pushed into `disposables` so the existing teardown disposes them. No new
// dependencies, no GLB, no lights, no loops — the Dive file owns placement
// and motion.

function makeFaceTexture(THREE) {
  const cv = document.createElement('canvas')
  cv.width = 512
  cv.height = 320
  const g = cv.getContext('2d')
  // Voxel wood slab.
  g.fillStyle = '#8a5a30'
  g.fillRect(0, 0, 512, 320)
  // Pixel grain: sparse darker speckles for a chunky voxel read.
  g.fillStyle = 'rgba(58, 34, 14, 0.35)'
  for (let i = 0; i < 90; i++) {
    const px = (i * 137) % 512
    const py = (i * 251) % 320
    g.fillRect(px - (px % 8), py - (py % 8), 8, 8)
  }
  // Plank bands with darker grooves.
  g.fillStyle = '#7a4e28'
  g.fillRect(0, 108, 512, 100)
  g.fillStyle = 'rgba(58, 34, 14, 0.6)'
  g.fillRect(0, 104, 512, 7)
  g.fillRect(0, 209, 512, 7)
  // Chiseled inner border.
  g.strokeStyle = 'rgba(50, 29, 11, 0.85)'
  g.lineWidth = 12
  g.strokeRect(18, 18, 476, 284)
  // Blocky lettering, warm cream on wood.
  g.fillStyle = '#f3e3c2'
  g.font = '700 54px "JetBrains Mono", ui-monospace, monospace'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('SCROLL ME', 256, 168)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.NearestFilter
  return tex
}

export function createScrollSign(THREE, disposables) {
  const track = (d) => {
    disposables.push(d)
    return d
  }
  const wood = track(
    new THREE.MeshStandardMaterial({ color: 0x7c5330, roughness: 0.95, transparent: true })
  )
  // Darker cut faces so the plank thickness reads as 3D from the side/back.
  const woodSide = track(
    new THREE.MeshStandardMaterial({ color: 0x54381e, roughness: 0.95, transparent: true })
  )
  const woodDark = track(
    new THREE.MeshStandardMaterial({ color: 0x5f4126, roughness: 0.95, transparent: true })
  )
  const face = track(
    new THREE.MeshStandardMaterial({
      map: track(makeFaceTexture(THREE)),
      roughness: 0.9,
      transparent: true,
    })
  )
  const group = new THREE.Group()
  group.name = 'ScrollSign'
  // Floor-standing plank (half-height): text face on +z, darker wood on the
  // cut sides/back so the 0.35 depth reads as a solid voxel block. Foot
  // origin: post runs 0 -> 1.50, plank center +1.96, trim cap +2.52
  // (total ~2.6, about half the aquarium height).
  // Material order: +x, -x, +y, -y, +z (face), -z.
  const plank = new THREE.Mesh(
    track(new THREE.BoxGeometry(1.92, 1.02, 0.35)),
    [woodSide, woodSide, woodSide, woodSide, face, woodSide]
  )
  plank.position.y = 1.96
  // Chunky wooden post with visible thickness, footed at the group origin.
  const post = new THREE.Mesh(track(new THREE.BoxGeometry(0.21, 1.5, 0.21)), woodDark)
  post.position.y = 0.75
  // Blocky top trim cap for a chiseled silhouette. Slightly inset so the
  // plank corners (not the cap) define the clearance envelope.
  const trim = new THREE.Mesh(track(new THREE.BoxGeometry(1.88, 0.16, 0.42)), woodDark)
  trim.position.y = 2.52
  group.add(plank, post, trim)
  return {
    group,
    mats: [wood, woodSide, woodDark, face],
    // World base (foot origin): reseated by the Dive file from live tank
    // bounds + terrain (P0 composition); fallback keeps it right of the
    // TEMP tank, feet on the ground, facing left toward the aquarium.
    base: { x: 5.25, y: -1.63, z: 1.0, yaw: -0.47 },
  }
}
