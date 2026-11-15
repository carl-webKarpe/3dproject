import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { store, lerp, easeInOut, damp } from '../lib/store'
import { useSceneFrame, setCamera, Sky, Particles, makeHazeMaterial, LightShafts } from './shared'
import { rng, fbm2 } from './util'
import { noiseGLSL } from './glsl'

const FOG = '#05314f'
const DENS = 0.034
const SURFACE_Y = 16
const FLOOR_Y = -15

function fishGeometry() {
  const body = new THREE.SphereGeometry(0.5, 10, 8)
  body.scale(0.22, 0.42, 1)
  const tail = new THREE.ConeGeometry(0.22, 0.4, 4, 1)
  tail.rotateX(-Math.PI / 2)
  tail.scale(0.15, 1.2, 1)
  tail.translate(0, 0, -0.62)
  return mergeGeometries([body.toNonIndexed(), tail.toNonIndexed()])
}

function whaleGeometry() {
  const parts = []
  const body = new THREE.SphereGeometry(1, 32, 20)
  // taper the body towards the tail
  const p = body.attributes.position
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i)
    const k = z < 0 ? 1 - Math.pow(-z, 1.6) * 0.78 : 1 - Math.pow(z, 3) * 0.2
    p.setX(i, p.getX(i) * k * 1.15)
    p.setY(i, p.getY(i) * k * (p.getY(i) < 0 ? 1.0 : 0.85))
    p.setZ(i, z * 5.2)
  }
  body.computeVertexNormals()
  parts.push(body.toNonIndexed())
  const fluke = new THREE.ConeGeometry(1.7, 1.4, 3, 1)
  fluke.rotateX(Math.PI / 2)
  fluke.scale(1.4, 0.12, 1)
  fluke.translate(0, 0, -5.6)
  parts.push(fluke.toNonIndexed())
  ;[-1, 1].forEach((s) => {
    const fin = new THREE.BoxGeometry(2.8, 0.08, 0.7)
    fin.translate(s * 1.6, -0.35, 1.4)
    fin.rotateY(s * -0.35)
    parts.push(fin.toNonIndexed())
  })
  return mergeGeometries(parts.map((g) => { g.deleteAttribute('uv'); return g }))
}

function useFish({ count = 260 }) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const r = useMemo(() => rng(42), [])
  const fish = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        rad: 3 + r() * 4.5, h: (r() - 0.5) * 3.2, sp: 0.28 + r() * 0.08, ph: r() * Math.PI * 2,
        wob: r() * 10, sc: 0.35 + r() * 0.3, school: r() > 0.5 ? 0 : 1,
      })),
    [count, r],
  )
  const { geo, mat } = useMemo(() => {
    const g = fishGeometry()
    const ig = new THREE.InstancedBufferGeometry().copy(g)
    const ph = new Float32Array(count)
    for (let i = 0; i < count; i++) ph[i] = Math.random()
    ig.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1))
    return {
      geo: ig,
      mat: makeHazeMaterial({ dark: '#0b2232', light: '#b9d8e6', fog: FOG, density: DENS, wiggle: 0.04, instanced: true }),
    }
  }, [count])
  const centers = useMemo(() => [new THREE.Vector3(-2, 1, -6), new THREE.Vector3(6, -6, -16)], [])
  return { dummy, fish, geo, mat, centers }
}

export default function OceanScene() {
  const root = useRef()
  const fishRef = useRef()
  const whaleRef = useRef()
  const mantaRef = useRef()
  const { dummy, fish, geo: fishGeo, mat: fishMat, centers } = useFish({ count: store.isMobile ? 140 : 280 })

  const { floorGeo, floorMat, kelpGeo, kelpMat, kelpCount, rockGeo, rockMat, whaleGeo, whaleMat, surfaceMat } = useMemo(() => {
    // sea floor
    const floorGeo = new THREE.PlaneGeometry(260, 260, 120, 120)
    floorGeo.rotateX(-Math.PI / 2)
    const p = floorGeo.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i)
      p.setY(i, (fbm2(x * 0.04, z * 0.04, 4) - 0.5) * 6 + Math.sin(x * 0.3) * 0.25)
    }
    floorGeo.computeVertexNormals()
    const floorMat = makeHazeMaterial({ dark: '#0e2a33', light: '#5f8f8f', fog: FOG, density: DENS, caustics: 0.35 })

    // kelp
    const r = rng(7)
    const kelpCount = store.isMobile ? 70 : 140
    const kelp = new THREE.PlaneGeometry(0.4, 1, 1, 16)
    kelp.translate(0, 0.5, 0)
    const kelpGeo = new THREE.InstancedBufferGeometry().copy(kelp)
    const ph = new Float32Array(kelpCount)
    for (let i = 0; i < kelpCount; i++) ph[i] = r()
    kelpGeo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1))
    const kelpMat = makeHazeMaterial({ dark: '#0d2a18', light: '#4f7a3a', fog: FOG, density: DENS, sway: 1.1, instanced: true, side: THREE.DoubleSide })

    const rock = new THREE.IcosahedronGeometry(1, 2)
    const rp = rock.attributes.position
    for (let i = 0; i < rp.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(rp, i)
      v.multiplyScalar(0.75 + fbm2(v.x * 2 + 3, v.y * 2 + v.z, 3) * 0.6)
      rp.setXYZ(i, v.x, v.y * 0.7, v.z)
    }
    rock.computeVertexNormals()
    const rockMat = makeHazeMaterial({ dark: '#0a1c22', light: '#3d6466', fog: FOG, density: DENS, caustics: 0.4 })

    const whaleGeo = whaleGeometry()
    const whaleMat = makeHazeMaterial({ dark: '#081a26', light: '#4f7890', fog: FOG, density: 0.022 })

    const surfaceMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vW; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; varying vec2 vUv; varying vec3 vW;
        ${noiseGLSL}
        void main(){
          vec2 p=vW.xz*0.08;
          float n=fbm(p+vec2(uTime*0.05,uTime*0.03));
          float n2=fbm(p*2.3-vec2(uTime*0.04,0.0)+n);
          float bright=pow(smoothstep(-0.2,0.8,n2),2.0);
          float window=smoothstep(0.5,0.0,length(vUv-0.5));
          vec3 col=mix(vec3(0.05,0.35,0.5),vec3(0.75,0.95,1.0),bright*0.7+window*0.4);
          gl_FragColor=vec4(col,(0.35+bright*0.5)*smoothstep(0.5,0.15,length(vUv-0.5)));
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
    return { floorGeo, floorMat, kelpGeo, kelpMat, kelpCount, rockGeo: rock, rockMat, whaleGeo, whaleMat, surfaceMat }
  }, [])

  const kelpRef = useRef()
  const kelpInit = useRef(false)
  const rocks = useMemo(() => {
    const r = rng(11)
    return Array.from({ length: 26 }, () => ({
      p: [(r() - 0.5) * 70, FLOOR_Y + 0.3, -40 + r() * 70], s: [1 + r() * 4, 1 + r() * 3, 1 + r() * 4], ry: r() * 6,
    }))
  }, [])
  const shafts = useMemo(() => {
    const r = rng(3)
    return Array.from({ length: 14 }, () => ({ p: [(r() - 0.5) * 50, 2, -30 + r() * 50], w: 2 + r() * 5, h: 46, tilt: 0.12 + r() * 0.12 }))
  }, [])

  const cam = useRef({ x: 0, y: 10, z: 22 })
  useSceneFrame('ocean', root, (state, dt, local) => {
    const t = state.clock.elapsedTime
    const camera = state.camera
    setCamera(camera, { fov: 50, near: 0.1, far: 900 })
    state.scene.background = null
    state.scene.fog = null

    // kelp placement once
    if (!kelpInit.current && kelpRef.current) {
      const r = rng(5)
      for (let i = 0; i < kelpCount; i++) {
        let x = (r() - 0.5) * 80
        if (Math.abs(x) < 6) x += Math.sign(x || 1) * 6
        dummy.position.set(x, FLOOR_Y - 0.5, -45 + r() * 75)
        dummy.rotation.set(0, r() * Math.PI, 0)
        const h = 8 + r() * 16
        dummy.scale.set(0.8 + r() * 0.8, h, 1)
        dummy.updateMatrix()
        kelpRef.current.setMatrixAt(i, dummy.matrix)
      }
      kelpRef.current.instanceMatrix.needsUpdate = true
      kelpInit.current = true
    }

    const k = easeInOut(local)
    const target = {
      x: Math.sin(local * 2.4) * 2.5 + store.smooth.x * 1.2,
      y: lerp(11, -7.5, k) - store.smooth.y * 0.6,
      z: lerp(22, -6, local),
    }
    const c = cam.current
    c.x = damp(c.x, target.x, 3, dt)
    c.y = damp(c.y, target.y, 3, dt)
    c.z = damp(c.z, target.z, 3, dt)
    camera.position.set(c.x, c.y + Math.sin(t * 0.5) * 0.15, c.z)
    camera.lookAt(c.x * 0.5, c.y - lerp(4, 1.2, k), c.z - 14)

    // materials time
    ;[fishMat, kelpMat, floorMat, rockMat, whaleMat, surfaceMat].forEach((m) => (m.uniforms.uTime.value = t))

    // fish schools
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i]
      const ctr = centers[f.school]
      const a = t * f.sp * (f.school ? -1 : 1) + f.ph
      const x = ctr.x + Math.cos(a) * f.rad
      const z = ctr.z + Math.sin(a) * f.rad * 0.7
      const y = ctr.y + f.h + Math.sin(t * 0.8 + f.wob) * 0.4
      dummy.position.set(x, y, z)
      const dx = -Math.sin(a) * (f.school ? -1 : 1)
      const dz = Math.cos(a) * 0.7 * (f.school ? -1 : 1)
      dummy.rotation.set(0, Math.atan2(dx, dz), 0)
      dummy.scale.setScalar(f.sc)
      dummy.updateMatrix()
      fishRef.current.setMatrixAt(i, dummy.matrix)
    }
    fishRef.current.instanceMatrix.needsUpdate = true

    // whale gliding across the deep
    const wt = (t * 0.035) % 1
    const w = whaleRef.current
    w.position.set(lerp(-70, 70, wt), -2 + Math.sin(t * 0.2) * 1.5, -34)
    w.rotation.set(Math.sin(t * 0.4) * 0.04, Math.PI / 2, Math.sin(t * 0.3) * 0.05)
    // manta
    const mt = ((t * 0.05) + 0.5) % 1
    const m = mantaRef.current
    m.position.set(lerp(40, -40, mt), 3 + Math.sin(t * 0.3) * 2, -14)
    m.rotation.set(0.1, Math.PI / 2, Math.sin(t * 0.6) * 0.1)
    const flap = Math.sin(t * 1.6)
    m.children[1].rotation.z = flap * 0.35
    m.children[2].rotation.z = -flap * 0.35
  })

  const mantaMat = useMemo(() => makeHazeMaterial({ dark: '#06141c', light: '#2f5566', fog: FOG, density: DENS, side: THREE.DoubleSide }), [])
  const mantaWing = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0.9)
    s.quadraticCurveTo(1.8, 0.4, 3.2, -0.6)
    s.quadraticCurveTo(1.6, -0.5, 0, -1.2)
    const g = new THREE.ShapeGeometry(s, 10)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  return (
    <group ref={root} visible={false} userData={{ sceneRoot: true }}>
      <Sky top="#2a9bd0" horizon={FOG} bottom="#010b12" sunDir={[0.15, 1, -0.4]} sunColor="#bfefff" sunSize={0.02} sunGlow={0.9} />
      <mesh position={[0, SURFACE_Y, -10]} rotation={[Math.PI / 2, 0, 0]} material={surfaceMat}>
        <planeGeometry args={[260, 260, 1, 1]} />
      </mesh>
      <LightShafts items={shafts} color="#9fe6ff" intensity={0.22} />
      <mesh geometry={floorGeo} material={floorMat} position={[0, FLOOR_Y, -10]} />
      <instancedMesh ref={kelpRef} args={[kelpGeo, kelpMat, kelpCount]} frustumCulled={false} />
      {rocks.map((r, i) => (
        <mesh key={i} geometry={rockGeo} material={rockMat} position={r.p} scale={r.s} rotation={[0, r.ry, 0]} />
      ))}
      <instancedMesh ref={fishRef} args={[fishGeo, fishMat, fish.length]} frustumCulled={false} />
      <mesh ref={whaleRef} geometry={whaleGeo} material={whaleMat} scale={1.6} />
      <group ref={mantaRef} scale={1.1}>
        <mesh material={mantaMat}>
          <sphereGeometry args={[0.6, 12, 8]} />
        </mesh>
        <mesh geometry={mantaWing} material={mantaMat} />
        <mesh geometry={mantaWing} material={mantaMat} scale={[-1, 1, 1]} />
      </group>
      <Particles count={store.isMobile ? 700 : 1600} box={[40, 26, 40]} vel={[0.05, -0.12, 0]} color="#cdeeff" size={1.6} wobble={0.4} opacity={0.55} />
      <Particles count={store.isMobile ? 80 : 160} box={[16, 22, 16]} vel={[0, 1.6, 0]} color="#e8fbff" size={2.4} wobble={0.15} opacity={0.7} />
    </group>
  )
}
