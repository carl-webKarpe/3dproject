import * as THREE from 'three'

// deterministic random
export function rng(seed = 1) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// --- CPU value-noise fbm (terrain) ---
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}
export function fbm2(x, y, oct = 5) {
  let f = 0, a = 0.5
  for (let i = 0; i < oct; i++) {
    f += a * vnoise(x, y)
    x *= 2.03; y *= 2.03; a *= 0.5
  }
  return f
}
export function ridged(x, y, oct = 6) {
  let f = 0, a = 0.5, w = 1
  for (let i = 0; i < oct; i++) {
    let n = 1 - Math.abs(vnoise(x, y) * 2 - 1)
    n *= n * w
    w = Math.min(1, Math.max(0, n * 1.6))
    f += n * a
    x *= 2.1; y *= 2.1; a *= 0.5
  }
  return f
}

// soft radial / cloud textures generated on a canvas
export function makeSoftTexture(size = 128, kind = 'radial') {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  if (kind === 'radial') {
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(0, 0, size, size)
  } else {
    // puffy cloud: many overlapping soft blobs
    const r = rng(kind === 'cloud2' ? 7 : 3)
    for (let i = 0; i < 46; i++) {
      const ang = r() * Math.PI * 2
      const dist = Math.pow(r(), 0.7) * size * 0.28
      const x = size / 2 + Math.cos(ang) * dist * 1.25
      const y = size / 2 + Math.sin(ang) * dist * 0.6 + size * 0.04
      const rad = size * (0.09 + r() * 0.16)
      const grd = g.createRadialGradient(x, y, 0, x, y, rad)
      const a = 0.18 + r() * 0.22
      grd.addColorStop(0, `rgba(255,255,255,${a})`)
      grd.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grd
      g.beginPath()
      g.arc(x, y, rad, 0, Math.PI * 2)
      g.fill()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// lat/lon → position on a unit sphere matching three's SphereGeometry UVs
export function latLonToVec3(lat, lon, r = 1) {
  const phi = ((lon + 180) * Math.PI) / 180
  const theta = ((90 - lat) * Math.PI) / 180
  return new THREE.Vector3(
    -Math.cos(phi) * Math.sin(theta) * r,
    Math.cos(theta) * r,
    Math.sin(phi) * Math.sin(theta) * r,
  )
}
