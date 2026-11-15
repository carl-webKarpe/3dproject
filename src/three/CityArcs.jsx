import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { latLonToVec3 } from './util'

const cities = [
  [40.71, -74.0], [51.5, -0.12], [35.68, 139.69], [-23.55, -46.63], [19.43, -99.13],
  [28.61, 77.2], [30.04, 31.23], [-33.86, 151.2], [1.35, 103.82], [-1.29, 36.82],
  [55.75, 37.62], [34.05, -118.24], [6.52, 3.37], [39.9, 116.4], [48.85, 2.35],
  [-34.6, -58.38], [25.2, 55.27], [14.6, 120.98], [64.13, -21.9], [-26.2, 28.04],
]
const links = [
  [0, 1], [1, 6], [6, 9], [9, 19], [2, 13], [13, 5], [5, 16], [16, 1], [3, 15], [0, 4],
  [11, 2], [8, 7], [8, 17], [17, 2], [12, 1], [14, 10], [18, 0], [3, 12], [7, 11], [5, 8],
]

const arcVertex = /* glsl */ `
varying float vT;
void main(){ vT=uv.x; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`
const arcFragment = /* glsl */ `
uniform float uTime; uniform float uOpacity; uniform float uOffset; uniform vec3 uColor;
varying float vT;
void main(){
  float head=fract(uTime*0.22+uOffset);
  float d=vT-head;
  float trail=smoothstep(-0.35,0.0,d)*(1.0-step(0.0,d));
  float base=0.18;
  float a=(base+trail*1.6)*smoothstep(0.0,0.06,vT)*smoothstep(1.0,0.94,vT);
  gl_FragColor=vec4(uColor*a*uOpacity,1.0);
}`

const dotVertex = /* glsl */ `
uniform float uTime; uniform float uPx; attribute float aSeed; varying float vSeed;
void main(){
  vSeed=aSeed;
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_PointSize=uPx*(1.0+0.35*sin(uTime*2.0+aSeed*30.0))*(3.0/-mv.z);
  gl_Position=projectionMatrix*mv;
}`
const dotFragment = /* glsl */ `
uniform float uOpacity; varying float vSeed;
void main(){
  float d=length(gl_PointCoord-0.5);
  float a=smoothstep(0.5,0.0,d);
  a=a*a+smoothstep(0.12,0.0,d);
  gl_FragColor=vec4(vec3(1.0,0.82,0.5)*a*uOpacity,1.0);
}`

export default function CityArcs({ state }) {
  const group = useRef()
  const { arcs, dots } = useMemo(() => {
    const arcs = links.map(([a, b], i) => {
      const p0 = latLonToVec3(...cities[a], 1.002)
      const p2 = latLonToVec3(...cities[b], 1.002)
      const mid = p0.clone().add(p2).multiplyScalar(0.5)
      const dist = p0.distanceTo(p2)
      mid.normalize().multiplyScalar(1 + dist * 0.32)
      const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2)
      const geo = new THREE.TubeGeometry(curve, 64, 0.0035, 5, false)
      const mat = new THREE.ShaderMaterial({
        vertexShader: arcVertex,
        fragmentShader: arcFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uOffset: { value: i * 0.137 },
          uColor: { value: new THREE.Color(i % 3 === 0 ? '#c9a96e' : '#5fe0b0') },
        },
      })
      return { geo, mat }
    })
    const pos = new Float32Array(cities.length * 3)
    const seed = new Float32Array(cities.length)
    cities.forEach((c, i) => {
      latLonToVec3(c[0], c[1], 1.004).toArray(pos, i * 3)
      seed[i] = Math.random()
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: dotVertex,
      fragmentShader: dotFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uPx: { value: 14 * Math.min(window.devicePixelRatio, 2) } },
    })
    return { arcs, dots: { g, m } }
  }, [])

  useFrame((s) => {
    const o = state.current.opacity
    group.current.visible = o > 0.01
    if (!group.current.visible) return
    const t = s.clock.elapsedTime
    arcs.forEach(({ mat }) => {
      mat.uniforms.uTime.value = t
      mat.uniforms.uOpacity.value = o
    })
    dots.m.uniforms.uTime.value = t
    dots.m.uniforms.uOpacity.value = o
  })

  return (
    <group ref={group}>
      {arcs.map(({ geo, mat }, i) => (
        <mesh key={i} geometry={geo} material={mat} />
      ))}
      <points geometry={dots.g} material={dots.m} />
    </group>
  )
}
