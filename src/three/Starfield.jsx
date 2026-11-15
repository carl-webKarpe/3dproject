import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { store } from '../lib/store'
import { noiseGLSL } from './glsl'

const starVertex = /* glsl */ `
attribute float aSize; attribute float aSeed; attribute vec3 aColor;
uniform float uTime; uniform float uPx;
varying vec3 vColor; varying float vTw;
void main(){
  vColor=aColor;
  vTw=0.65+0.35*sin(uTime*(0.6+aSeed*2.0)+aSeed*40.0);
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_PointSize=aSize*uPx;
  gl_Position=projectionMatrix*mv;
}`
const starFragment = /* glsl */ `
varying vec3 vColor; varying float vTw;
void main(){
  float d=length(gl_PointCoord-0.5);
  float a=smoothstep(0.5,0.0,d); a*=a;
  gl_FragColor=vec4(vColor*a*vTw,1.0);
}`

const nebulaFragment = /* glsl */ `
uniform float uTime; uniform vec3 uA; uniform vec3 uB; uniform float uStrength;
varying vec3 vDir;
${noiseGLSL}
void main(){
  vec3 d=normalize(vDir);
  vec2 p=vec2(atan(d.z,d.x)*0.8,d.y*1.6);
  float n=fbm(p*1.3+vec2(uTime*0.004,0.0));
  float n2=fbm(p*2.7-vec2(0.0,uTime*0.003)+n);
  float band=exp(-pow((d.y-0.15+n*0.25)*2.6,2.0));
  vec3 col=mix(uA,uB,smoothstep(-0.3,0.6,n2))*band*smoothstep(-0.1,0.7,n2+0.2);
  gl_FragColor=vec4(col*uStrength,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export default function Starfield() {
  const ref = useRef()
  const neb = useRef()
  const count = store.isMobile ? 2500 : 6000
  const { geo, mat, nebMat } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const size = new Float32Array(count)
    const seed = new Float32Array(count)
    const col = new Float32Array(count * 3)
    const palette = [new THREE.Color('#ffffff'), new THREE.Color('#bcd8ff'), new THREE.Color('#ffe3b8'), new THREE.Color('#b8ffe0')]
    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 60
      const u = Math.random() * 2 - 1
      const th = Math.random() * Math.PI * 2
      const s = Math.sqrt(1 - u * u)
      pos.set([Math.cos(th) * s * r, u * r, Math.sin(th) * s * r], i * 3)
      size[i] = Math.pow(Math.random(), 6) * 3.2 + 0.6
      seed[i] = Math.random()
      const c = palette[Math.floor(Math.random() * palette.length)].clone().multiplyScalar(0.5 + Math.random() * 0.6)
      col.set([c.r, c.g, c.b], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    const mat = new THREE.ShaderMaterial({
      vertexShader: starVertex,
      fragmentShader: starFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPx: { value: Math.min(window.devicePixelRatio, 2) * 1.6 } },
    })
    const nebMat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: nebulaFragment,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uA: { value: new THREE.Color('#0b5d91') },
        uB: { value: new THREE.Color('#00c875') },
        uStrength: { value: 0.16 },
      },
    })
    return { geo, mat, nebMat }
  }, [count])

  useFrame((state, dt) => {
    const show = store.scene === 'earth' || store.scene === 'human' || store.scene === 'protect' || store.scene === 'final'
    ref.current.visible = show
    if (!show) return
    const t = state.clock.elapsedTime
    mat.uniforms.uTime.value = t
    nebMat.uniforms.uTime.value = t
    nebMat.uniforms.uStrength.value = store.scene === 'protect' || store.scene === 'final' ? 0.035 : 0.025
    ref.current.rotation.y += dt * 0.004
    ref.current.rotation.x = store.smooth.y * 0.03
    neb.current.rotation.y = -store.smooth.x * 0.05
  })

  return (
    <group ref={ref} userData={{ sceneRoot: true }}>
      <mesh ref={neb} material={nebMat} renderOrder={-10}>
        <sphereGeometry args={[150, 48, 24]} />
      </mesh>
      <points geometry={geo} material={mat} />
    </group>
  )
}
