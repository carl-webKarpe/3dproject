import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { store, lerp, damp } from '../lib/store'
import { useSceneFrame, setCamera, Sky, Particles, Birds, Butterflies, makeHazeMaterial } from './shared'
import { rng, fbm2 } from './util'
import { noiseGLSL } from './glsl'

const HAZE = '#d98e5a'
const SUN = [-0.25, 0.07, -1]

function ridgeMaterial(color, seed, amp, base) {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uColor: { value: new THREE.Color(color) }, uSeed: { value: seed }, uAmp: { value: amp }, uBase: { value: base } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uSeed; uniform float uAmp; uniform float uBase; varying vec2 vUv;
      ${noiseGLSL}
      void main(){
        float h=uBase+fbm(vec2(vUv.x*3.0+uSeed,uSeed))*uAmp+abs(snoise(vec2(vUv.x*9.0,uSeed*2.0)))*uAmp*0.25;
        float a=smoothstep(h+0.004,h-0.004,vUv.y);
        if(a<0.01) discard;
        vec3 c=uColor*mix(1.0,1.18,smoothstep(h-0.25,h,vUv.y));
        gl_FragColor=vec4(c,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}

function tuftGeometry() {
  const parts = []
  for (let i = 0; i < 7; i++) {
    const b = new THREE.PlaneGeometry(0.06, 1, 1, 4)
    b.translate(0, 0.5, 0)
    const p = b.attributes.position
    for (let j = 0; j < p.count; j++) {
      const y = p.getY(j)
      p.setX(j, p.getX(j) * (1 - y))
      p.setZ(j, y * y * 0.25)
    }
    b.rotateX(-0.15 - Math.random() * 0.25)
    b.rotateY((i / 7) * Math.PI * 2 + Math.random())
    b.scale(1, 0.6 + Math.random() * 0.6, 1)
    parts.push(b)
  }
  return mergeGeometries(parts)
}

function acaciaGeometry() {
  const parts = []
  const trunk = new THREE.CylinderGeometry(0.12, 0.22, 4, 6)
  trunk.translate(0, 2, 0)
  parts.push(trunk)
  ;[-1, 1].forEach((s) => {
    const br = new THREE.CylinderGeometry(0.06, 0.1, 2.4, 5)
    br.translate(0, 1.2, 0)
    br.rotateZ(s * 0.6)
    br.translate(0, 3.4, 0)
    parts.push(br)
  })
  const crown = new THREE.SphereGeometry(1, 16, 8)
  const cp = crown.attributes.position
  for (let i = 0; i < cp.count; i++) {
    const n = fbm2(cp.getX(i) * 2, cp.getZ(i) * 2, 3)
    cp.setXYZ(i, cp.getX(i) * 3.6 * (0.8 + n * 0.4), cp.getY(i) * 0.55 * (0.8 + n * 0.5), cp.getZ(i) * 2.6)
  }
  crown.translate(0, 4.9, 0)
  parts.push(crown)
  return mergeGeometries(parts.map((g) => g.toNonIndexed()))
}

export default function WildlifeScene() {
  const root = useRef()
  const grass = useRef()
  const mobile = store.isMobile
  const GRASS = mobile ? 260 : 600
  const res = useMemo(() => {
    const ridges = [
      { mat: ridgeMaterial('#d08a62', 1.3, 0.35, 0.3), z: -260, w: 1400, h: 260, y: -20 },
      { mat: ridgeMaterial('#9a5a3c', 4.1, 0.28, 0.25), z: -180, w: 1000, h: 160, y: -12 },
      { mat: ridgeMaterial('#4a2a1b', 7.7, 0.16, 0.2), z: -110, w: 700, h: 90, y: -8 },
    ]
    const groundGeo = new THREE.PlaneGeometry(400, 260, 80, 50)
    groundGeo.rotateX(-Math.PI / 2)
    const gp = groundGeo.attributes.position
    for (let i = 0; i < gp.count; i++) gp.setY(i, (fbm2(gp.getX(i) * 0.03, gp.getZ(i) * 0.03, 3) - 0.5) * 3)
    groundGeo.computeVertexNormals()
    const groundMat = makeHazeMaterial({ dark: '#1a1009', light: '#6a4422', fog: HAZE, density: 0.012, lightDir: [-0.3, 0.6, -1] })
    const tuft = new THREE.InstancedBufferGeometry().copy(tuftGeometry())
    const ph = new Float32Array(GRASS)
    for (let i = 0; i < GRASS; i++) ph[i] = Math.random()
    tuft.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1))
    const tuftMat = makeHazeMaterial({ dark: '#21160b', light: '#c89a52', fog: HAZE, density: 0.012, instanced: true, sway: 0.18, side: THREE.DoubleSide, lightDir: [-0.3, 0.4, -1] })
    const acacia = acaciaGeometry()
    const acaciaMat = makeHazeMaterial({ dark: '#140c07', light: '#3a2414', fog: HAZE, density: 0.0055 })
    return { ridges, groundGeo, groundMat, tuft, tuftMat, acacia, acaciaMat }
  }, [GRASS])

  useLayoutEffect(() => {
    const r = rng(55)
    const d = new THREE.Object3D()
    for (let i = 0; i < GRASS; i++) {
      d.position.set((r() - 0.5) * 70, -0.2, 22 - Math.pow(r(), 0.7) * 60)
      d.rotation.set(0, r() * 6, 0)
      d.scale.setScalar(0.7 + r() * 1.4)
      d.updateMatrix()
      grass.current.setMatrixAt(i, d.matrix)
    }
    grass.current.instanceMatrix.needsUpdate = true
  }, [GRASS])

  const trees = useMemo(
    () => [
      { p: [-22, -0.4, -30], s: 1.6 }, { p: [16, -0.4, -55], s: 2.0 }, { p: [48, -0.4, -90], s: 2.6 },
      { p: [-60, -0.4, -100], s: 2.4 }, { p: [4, -0.4, -120], s: 2.2 },
    ],
    [],
  )

  const cam = useRef({ x: -12, y: 2.2, z: 22 })
  useSceneFrame('wildlife', root, (state, dt, local) => {
    const t = state.clock.elapsedTime
    const camera = state.camera
    setCamera(camera, { fov: 48, near: 0.1, far: 1200 })
    state.scene.fog = null
    state.scene.background = null
    ;[res.groundMat, res.tuftMat, res.acaciaMat].forEach((m) => (m.uniforms.uTime.value = t))
    const c = cam.current
    c.x = damp(c.x, lerp(-14, 14, local) + store.smooth.x * 1.5, 3, dt)
    c.y = damp(c.y, 2.2 - store.smooth.y * 0.4, 3, dt)
    c.z = damp(c.z, lerp(24, 16, local), 3, dt)
    camera.position.set(c.x, c.y, c.z)
    camera.lookAt(c.x * 0.6, lerp(5, 8, local), c.z - 50)
  })

  return (
    <group ref={root} visible={false} userData={{ sceneRoot: true }}>
      <Sky top="#2a3a62" horizon="#f4a560" bottom="#3a2210" sunDir={SUN} sunColor="#ffc277" sunSize={0.006} sunGlow={1.6} />
      {res.ridges.map((r, i) => (
        <mesh key={i} position={[0, r.y + r.h / 2, r.z]} material={r.mat}>
          <planeGeometry args={[r.w, r.h]} />
        </mesh>
      ))}
      <mesh geometry={res.groundGeo} material={res.groundMat} position={[0, -0.5, -60]} />
      {trees.map((tr, i) => (
        <mesh key={i} geometry={res.acacia} material={res.acaciaMat} position={tr.p} scale={tr.s} rotation={[0, i * 1.3, 0]} />
      ))}
      <instancedMesh ref={grass} args={[res.tuft, res.tuftMat, GRASS]} frustumCulled={false} />
      <Birds flocks={mobile ? 5 : 9} perFlock={9} bounds={[-140, 140]} y={[14, 48]} z={[-120, -30]} speed={7} color="#1b110b" haze={HAZE} hazeNear={30} hazeFar={200} scale={1.4} seed={2} />
      <Birds flocks={2} perFlock={5} bounds={[-40, 40]} y={[6, 12]} z={[-10, 5]} speed={5} color="#120b06" haze={HAZE} hazeNear={10} hazeFar={80} scale={0.8} seed={9} />
      <Butterflies count={mobile ? 8 : 16} center={[0, 1.6, 14]} spread={[30, 1.5, 8]} scale={0.22} palette={['#ff9a3c', '#ffd27a', '#f4f7f2', '#00c875']} />
      <Particles count={mobile ? 200 : 450} box={[40, 12, 30]} vel={[0.2, 0.05, 0]} color="#ffd59a" size={1.2} wobble={0.5} twinkle={0.6} opacity={0.8} />
    </group>
  )
}
