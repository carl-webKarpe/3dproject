import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { store, lerp, easeInOut, damp } from '../lib/store'
import { useSceneFrame, setCamera, Sky, Particles, makeHazeMaterial, LightShafts, Billboards, Butterflies, Birds } from './shared'
import { rng, fbm2, makeSoftTexture } from './util'

const FOG = '#8ea67c'
const DENS = 0.042

function blobGeometry(seed) {
  const g = new THREE.IcosahedronGeometry(1, 2)
  const p = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const n = fbm2(v.x * 1.6 + seed, v.y * 1.6 + v.z * 1.3, 3)
    v.multiplyScalar(0.7 + n * 0.65)
    p.setXYZ(i, v.x, v.y * 0.62, v.z)
  }
  g.computeVertexNormals()
  return g
}

function fernGeometry() {
  const parts = []
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.PlaneGeometry(0.28, 1.6, 1, 6)
    const p = leaf.attributes.position
    for (let j = 0; j < p.count; j++) {
      const y = p.getY(j) + 0.8
      const w = Math.sin((y / 1.6) * Math.PI) * 1.0
      p.setX(j, p.getX(j) * w)
      p.setY(j, y)
      p.setZ(j, -Math.pow(y / 1.6, 2) * 0.9)
    }
    leaf.rotateX(-0.55)
    leaf.rotateY((i / 9) * Math.PI * 2)
    parts.push(leaf)
  }
  const g = mergeGeometries(parts)
  g.computeVertexNormals()
  return g
}

export default function ForestScene() {
  const root = useRef()
  const trunks = useRef()
  const canopy = useRef()
  const ferns = useRef()
  const vines = useRef()
  const leaves = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const mobile = store.isMobile
  const TREES = mobile ? 90 : 170
  const BLOBS = 5
  const FERNS = mobile ? 90 : 220
  const VINES = mobile ? 40 : 90
  const LEAVES = mobile ? 60 : 140

  const res = useMemo(() => {
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 1, 8, 4)
    trunkGeo.translate(0, 0.5, 0)
    const tp = trunkGeo.attributes.position
    for (let i = 0; i < tp.count; i++) {
      const y = tp.getY(i)
      if (y < 0.08) { tp.setX(i, tp.getX(i) * 1.8); tp.setZ(i, tp.getZ(i) * 1.8) }
    }
    trunkGeo.computeVertexNormals()
    const trunkMat = makeHazeMaterial({ dark: '#120f0a', light: '#5b5140', fog: FOG, density: DENS, instanced: true })
    const canopyGeo = blobGeometry(3.3)
    const canopyMat = makeHazeMaterial({ dark: '#0c2012', light: '#6e9a45', fog: FOG, density: DENS, instanced: true, lightDir: [0.3, 1, -0.4] })
    const fernGeo = new THREE.InstancedBufferGeometry().copy(fernGeometry())
    const ph = new Float32Array(FERNS)
    for (let i = 0; i < FERNS; i++) ph[i] = Math.random()
    fernGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1))
    const fernMat = makeHazeMaterial({ dark: '#0d2410', light: '#5f9a3a', fog: FOG, density: DENS, instanced: true, sway: 0.06, side: THREE.DoubleSide })
    const vineGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 4, 1)
    vineGeo.translate(0, -0.5, 0)
    const vineMat = makeHazeMaterial({ dark: '#0f1e0f', light: '#3b5a2c', fog: FOG, density: DENS, instanced: true })
    const leafShape = new THREE.Shape()
    leafShape.moveTo(0, -0.5)
    leafShape.quadraticCurveTo(0.35, 0, 0, 0.5)
    leafShape.quadraticCurveTo(-0.35, 0, 0, -0.5)
    const leafGeo = new THREE.ShapeGeometry(leafShape, 4)
    const leafMat = makeHazeMaterial({ dark: '#6a7a2a', light: '#e8d27a', fog: FOG, density: DENS, instanced: true, side: THREE.DoubleSide })
    const groundGeo = new THREE.PlaneGeometry(220, 220, 90, 90)
    groundGeo.rotateX(-Math.PI / 2)
    const gp = groundGeo.attributes.position
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), z = gp.getZ(i)
      gp.setY(i, (fbm2(x * 0.05, z * 0.05, 4) - 0.5) * 2.2 * Math.min(1, Math.abs(x) / 6))
    }
    groundGeo.computeVertexNormals()
    const groundMat = makeHazeMaterial({ dark: '#0f1c0e', light: '#4a5f2c', fog: FOG, density: DENS, caustics: 0.22 })
    const mist = makeSoftTexture(128, 'radial')
    return { trunkGeo, trunkMat, canopyGeo, canopyMat, fernGeo, fernMat, vineGeo, vineMat, leafGeo, leafMat, groundGeo, groundMat, mist }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fog = useMemo(() => new THREE.FogExp2(FOG, DENS), [])
  const leafData = useMemo(() => {
    const r = rng(21)
    return Array.from({ length: LEAVES }, () => ({ x: (r() - 0.5) * 24, y: r() * 14, z: (r() - 0.5) * 24, s: 0.12 + r() * 0.12, sp: 0.5 + r() * 0.6, ph: r() * 10 }))
  }, [LEAVES])
  const shafts = useMemo(() => {
    const r = rng(9)
    return Array.from({ length: 16 }, () => ({ p: [(r() - 0.5) * 34, 12, -40 + r() * 75], w: 1.5 + r() * 4, h: 34, tilt: 0.32 + r() * 0.1 }))
  }, [])
  const mistItems = useMemo(() => {
    const r = rng(13)
    return Array.from({ length: 34 }, () => ({ p: [(r() - 0.5) * 50, 0.8 + r() * 3, -50 + r() * 85], s: [14 + r() * 14, 5 + r() * 4, 1], rot: 0 }))
  }, [])

  useLayoutEffect(() => {
      const r = rng(77)
      const color = new THREE.Color()
      let b = 0
      for (let i = 0; i < TREES; i++) {
        let x = (r() - 0.5) * 90
        if (Math.abs(x) < 3.2) x = Math.sign(x || 1) * (3.2 + r() * 3)
        const z = -70 + r() * 125
        const h = 12 + r() * 16
        const rad = 0.8 + r() * 1.4
        dummy.position.set(x, -0.3, z)
        dummy.rotation.set((r() - 0.5) * 0.06, r() * 6, (r() - 0.5) * 0.06)
        dummy.scale.set(rad, h, rad)
        dummy.updateMatrix()
        trunks.current.setMatrixAt(i, dummy.matrix)
        for (let k = 0; k < BLOBS; k++) {
          const a = (k / BLOBS) * Math.PI * 2 + r()
          const d = k === 0 ? 0 : 1.6 + r() * 2.2
          const s = 2.6 + r() * 2.6
          dummy.position.set(x + Math.cos(a) * d, h - 0.5 + r() * 2.5 - (k === 0 ? -1 : 0), z + Math.sin(a) * d)
          dummy.rotation.set(0, r() * 6, 0)
          dummy.scale.set(s, s * (0.7 + r() * 0.3), s)
          dummy.updateMatrix()
          canopy.current.setMatrixAt(b, dummy.matrix)
          color.setHSL(0.24 + r() * 0.08, 0.45 + r() * 0.2, 0.32 + r() * 0.22)
          canopy.current.setColorAt(b, color)
          b++
        }
      }
      for (let i = 0; i < FERNS; i++) {
        let x = (r() - 0.5) * 50
        if (Math.abs(x) < 1.4) x = Math.sign(x || 1) * (1.4 + r() * 2)
        dummy.position.set(x, -0.1, -55 + r() * 100)
        dummy.rotation.set(0, r() * 6, 0)
        dummy.scale.setScalar(0.7 + r() * 1.3)
        dummy.updateMatrix()
        ferns.current.setMatrixAt(i, dummy.matrix)
      }
      for (let i = 0; i < VINES; i++) {
        let x = (r() - 0.5) * 40
        if (Math.abs(x) < 1.5) x = Math.sign(x || 1) * 2
        dummy.position.set(x, 16 + r() * 8, -50 + r() * 90)
        dummy.rotation.set((r() - 0.5) * 0.1, 0, (r() - 0.5) * 0.1)
        dummy.scale.set(1 + r(), 6 + r() * 12, 1 + r())
        dummy.updateMatrix()
        vines.current.setMatrixAt(i, dummy.matrix)
      }
      for (let i = 0; i < LEAVES; i++) {
        color.setHSL(0.1 + r() * 0.12, 0.6, 0.45 + r() * 0.2)
        leaves.current.setColorAt(i, color)
      }
      ;[trunks, canopy, ferns, vines].forEach((m) => (m.current.instanceMatrix.needsUpdate = true))
      canopy.current.instanceColor.needsUpdate = true
      leaves.current.instanceColor.needsUpdate = true
      res.canopyMat.needsUpdate = true
      res.leafMat.needsUpdate = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cam = useRef({ x: 0, y: 2, z: 36, ly: 2 })
  useSceneFrame('forest', root, (state, dt, local) => {
    const t = state.clock.elapsedTime
    const camera = state.camera
    setCamera(camera, { fov: 52, near: 0.1, far: 900 })
    state.scene.fog = fog
    state.scene.background = null


    const k = easeInOut(local)
    const c = cam.current
    const tz = lerp(36, -2, local)
    c.z = damp(c.z, tz, 3, dt)
    c.x = damp(c.x, Math.sin(local * 3.0) * 0.8 + store.smooth.x * 0.6, 3, dt)
    c.y = damp(c.y, 1.9 - store.smooth.y * 0.25, 3, dt)
    c.ly = damp(c.ly, lerp(2.4, 9, Math.pow(k, 2.2)), 3, dt)
    camera.position.set(c.x, c.y + Math.sin(t * 1.3) * 0.04, c.z)
    camera.lookAt(c.x * 0.4 + store.smooth.x * 1.5, c.ly, c.z - 12)

    ;[res.trunkMat, res.canopyMat, res.fernMat, res.vineMat, res.leafMat, res.groundMat].forEach((m) => (m.uniforms.uTime.value = t))

    // falling leaves around camera
    const cp = camera.position
    for (let i = 0; i < LEAVES; i++) {
      const d = leafData[i]
      let y = ((d.y - t * d.sp * 0.8) % 14 + 14) % 14
      const x = d.x + Math.sin(t * 0.8 + d.ph) * 1.2
      const z = d.z
      const wx = ((x - cp.x + 12) % 24 + 24) % 24 - 12 + cp.x
      const wz = ((z - cp.z + 12) % 24 + 24) % 24 - 12 + cp.z
      dummy.position.set(wx, y, wz)
      dummy.rotation.set(t * d.sp * 2 + d.ph, t * 0.7 + d.ph, Math.sin(t * 2 + d.ph))
      dummy.scale.setScalar(d.s)
      dummy.updateMatrix()
      leaves.current.setMatrixAt(i, dummy.matrix)
    }
    leaves.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={root} visible={false} userData={{ sceneRoot: true }}>
      <Sky top="#d7e7c8" horizon={FOG} bottom="#2c3b22" sunDir={[0.25, 0.65, -1]} sunColor="#fff0c0" sunSize={0.01} sunGlow={1.2} />
      <mesh geometry={res.groundGeo} material={res.groundMat} position={[0, -0.4, -10]} />
      <instancedMesh ref={trunks} args={[res.trunkGeo, res.trunkMat, TREES]} frustumCulled={false} />
      <instancedMesh ref={canopy} args={[res.canopyGeo, res.canopyMat, TREES * BLOBS]} frustumCulled={false} />
      <instancedMesh ref={ferns} args={[res.fernGeo, res.fernMat, FERNS]} frustumCulled={false} />
      <instancedMesh ref={vines} args={[res.vineGeo, res.vineMat, VINES]} frustumCulled={false} />
      <instancedMesh ref={leaves} args={[res.leafGeo, res.leafMat, LEAVES]} frustumCulled={false} />
      <LightShafts items={shafts} color="#ffe2a0" intensity={0.28} />
      <Billboards items={mistItems} texture={res.mist} color="#eef4e4" opacity={0.16} />
      <Particles count={mobile ? 250 : 600} box={[30, 12, 30]} vel={[0.05, 0.05, 0]} color="#ffe39a" size={1.3} wobble={0.6} twinkle={1} opacity={0.9} />
      <Butterflies count={mobile ? 10 : 18} center={[0, 1.8, 10]} spread={[8, 2, 40]} scale={0.32} palette={['#2fb6ff', '#36d0ff', '#ff9a3c', '#f4f7f2']} />
      <Birds flocks={3} perFlock={6} bounds={[-50, 50]} y={[14, 22]} z={[-30, 5]} speed={6} color="#1d2617" haze={FOG} hazeNear={5} hazeFar={70} scale={0.7} seed={4} />
    </group>
  )
}
