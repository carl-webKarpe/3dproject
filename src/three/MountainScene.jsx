import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { store, lerp, easeInOut, damp, smooth } from '../lib/store'
import { useSceneFrame, setCamera, Sky, Particles, Billboards, Birds } from './shared'
import { rng, fbm2, ridged, makeSoftTexture } from './util'
import { noiseGLSL } from './glsl'

const HAZE = '#c9c3b6'
const SUN = new THREE.Vector3(0.55, 0.2, -1).normalize()

function height(x, z) {
  let h = ridged(x * 0.0052 + 11.3, z * 0.0052 + 7.1, 6) * 120 + (fbm2(x * 0.02, z * 0.02, 4) - 0.5) * 14 - 28
  // carve a glacial valley along the flight path
  const valley = smooth(Math.min(1, Math.max(0, (Math.abs(x) - 8) / 70)))
  const inValley = smooth(Math.min(1, Math.max(0, (z + 120) / 60)))
  h *= lerp(1, lerp(0.35, 1, valley), inValley)
  // the great summit ahead
  const dx = x - 10, dz = z + 230
  h += Math.exp(-(dx * dx + dz * dz) / (2 * 55 * 55)) * 95
  return h
}

export default function MountainScene() {
  const root = useRef()
  const mobile = store.isMobile
  const res = useMemo(() => {
    const seg = mobile ? 150 : 240
    const geo = new THREE.PlaneGeometry(700, 700, seg, seg)
    geo.rotateX(-Math.PI / 2)
    const p = geo.attributes.position
    for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i) - 80))
    geo.computeVertexNormals()
    const n = geo.attributes.normal
    const colors = new Float32Array(p.count * 3)
    const snow = new THREE.Color('#f2f5f8')
    const rock = new THREE.Color('#5d5852')
    const rock2 = new THREE.Color('#7a6e60')
    const alpine = new THREE.Color('#5b6440')
    const forest = new THREE.Color('#223221')
    const c = new THREE.Color()
    for (let i = 0; i < p.count; i++) {
      const h = p.getY(i)
      const ny = n.getY(i)
      const nz = fbm2(p.getX(i) * 0.05, p.getZ(i) * 0.05, 3)
      c.copy(forest).lerp(alpine, smooth(Math.min(1, Math.max(0, (h - 2 + nz * 10) / 22))))
      const steep = smooth(Math.min(1, Math.max(0, (0.82 - ny) / 0.25)))
      c.lerp(rock.clone().lerp(rock2, nz), Math.max(steep, smooth(Math.min(1, Math.max(0, (h - 24) / 16)))))
      const snowLine = 42 + (nz - 0.5) * 22
      const sn = smooth(Math.min(1, Math.max(0, (h - snowLine) / 10))) * smooth(Math.min(1, Math.max(0, (ny - 0.45) / 0.25)))
      c.lerp(snow, sn)
      colors.set([c.r, c.g, c.b], i * 3)
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 })

    const cloudTex = makeSoftTexture(256, 'cloud')
    const seaMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 } }]),
      vertexShader: /* glsl */ `
        #include <fog_pars_vertex>
        varying vec3 vW;
        void main(){ vec4 w=modelMatrix*vec4(position,1.0); vW=w.xyz; vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        #include <fog_pars_fragment>
        uniform float uTime; varying vec3 vW;
        ${noiseGLSL}
        void main(){
          vec2 p=vW.xz*0.012+vec2(uTime*0.006,0.0);
          float n=fbm(p)*0.5+0.5;
          float n2=fbm(p*3.0+n+uTime*0.01)*0.5+0.5;
          float a=smoothstep(0.42,0.75,n*0.7+n2*0.4);
          vec3 col=mix(vec3(0.78,0.78,0.8),vec3(1.0,0.96,0.9),n2);
          gl_FragColor=vec4(col,a*0.92);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    })
    return { geo, mat, cloudTex, seaMat }
  }, [mobile])

  const fog = useMemo(() => new THREE.Fog(HAZE, 60, 560), [])
  const clouds = useMemo(() => {
    const r = rng(31)
    return Array.from({ length: mobile ? 22 : 40 }, () => {
      const s = 40 + r() * 70
      return { p: [(r() - 0.5) * 520, 62 + r() * 40, -360 + r() * 420], s: [s, s * 0.45, 1], rot: (r() - 0.5) * 0.2 }
    })
  }, [mobile])

  const cam = useRef({ x: 0, y: 50, z: 160 })
  useSceneFrame('mountains', root, (state, dt, local) => {
    const t = state.clock.elapsedTime
    const camera = state.camera
    setCamera(camera, { fov: 46, near: 0.5, far: 1200 })
    state.scene.fog = fog
    state.scene.background = null
    res.seaMat.uniforms.uTime.value = t

    const k = easeInOut(local)
    const c = cam.current
    c.z = damp(c.z, lerp(170, -20, local), 3, dt)
    c.x = damp(c.x, Math.sin(local * 2.6) * 10 + store.smooth.x * 3, 3, dt)
    c.y = damp(c.y, lerp(44, 62, k) - store.smooth.y * 2, 3, dt)
    camera.position.set(c.x, c.y, c.z)
    camera.lookAt(c.x * 0.3 + 8, lerp(36, 52, k), c.z - 160)
    camera.rotateZ(Math.cos(local * 2.6) * -0.04)
  })

  return (
    <group ref={root} visible={false} userData={{ sceneRoot: true }}>
      <Sky top="#2f6596" horizon="#f1d6ab" bottom="#9a9a96" sunDir={SUN.toArray()} sunColor="#ffd28a" sunSize={0.0025} sunGlow={1.3} />
      <hemisphereLight args={['#bcd3ea', '#3a3226', 0.9]} />
      <directionalLight position={SUN.clone().multiplyScalar(200).toArray()} intensity={3.4} color="#ffdcae" />
      <ambientLight intensity={0.12} />
      <mesh geometry={res.geo} material={res.mat} position={[0, 0, -80]} />
      <mesh position={[0, 14, -120]} rotation={[-Math.PI / 2, 0, 0]} material={res.seaMat}>
        <planeGeometry args={[900, 900]} />
      </mesh>
      <Billboards items={clouds} texture={res.cloudTex} color="#fff6ea" opacity={0.85} drift={[2, 0, 0]} wrap={300} />
      <Particles count={mobile ? 600 : 1400} box={[50, 30, 50]} vel={[0.6, -2.0, 0.3]} color="#ffffff" size={1.4} wobble={0.8} opacity={0.75} additive={false} />
      <Birds flocks={2} perFlock={2} bounds={[-120, 120]} y={[55, 70]} z={[20, 90]} speed={9} color="#2a2420" haze={HAZE} hazeNear={20} hazeFar={300} scale={2.4} flap={5} glide={1} seed={8} />
    </group>
  )
}
