import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { store, clamp, lerp, smooth, easeInOut, range, damp } from '../lib/store'
import CityArcs from './CityArcs'
import { setCamera } from './shared'

const earthVertex = /* glsl */ `
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vTanW; varying vec3 vBitW;
void main(){
  vUv=uv;
  vec3 T=normalize(cross(vec3(0.0,1.0,0.0),normal)+vec3(1e-5));
  vec3 B=cross(normal,T);
  vTanW=normalize(mat3(modelMatrix)*T);
  vBitW=normalize(mat3(modelMatrix)*B);
  vNormalW=normalize(mat3(modelMatrix)*normal);
  vec4 wp=modelMatrix*vec4(position,1.0); vPosW=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
}`

const earthFragment = /* glsl */ `
uniform sampler2D uDay; uniform sampler2D uNight; uniform sampler2D uOcean; uniform sampler2D uClouds; uniform sampler2D uNormal;
uniform vec3 uSun; uniform vec3 uAtmo; uniform float uCloudOffset; uniform float uNightBoost; uniform float uExposure;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPosW; varying vec3 vTanW; varying vec3 vBitW;
void main(){
  vec3 Ng=normalize(vNormalW);
  vec3 nm=texture2D(uNormal,vUv).xyz*2.0-1.0;
  float oceanMask=texture2D(uOcean,vUv).r;
  vec3 nP=normalize(normalize(vTanW)*nm.x*0.85+normalize(vBitW)*nm.y*0.85+Ng*nm.z);
  vec3 N=normalize(mix(nP,Ng,oceanMask));
  vec3 V=normalize(cameraPosition-vPosW);
  vec3 L=normalize(uSun);
  float ndl=dot(Ng,L);
  float diff=max(dot(N,L),0.0);
  float dayMix=smoothstep(-0.2,0.3,ndl);

  vec3 day=texture2D(uDay,vUv).rgb;
  // deepen the oceans & enrich land
  day=mix(day, day*vec3(0.75,0.95,1.15), oceanMask*0.6);
  vec3 nightTex=texture2D(uNight,vUv).rgb;
  float lights=smoothstep(0.16,0.65,max(nightTex.r,nightTex.g));
  vec3 city=vec3(1.0,0.68,0.32)*lights*uNightBoost*(1.0-oceanMask);

  float cloud=texture2D(uClouds,vUv+vec2(uCloudOffset,0.0)).r;
  vec3 col=day*(0.03+diff*1.25)*(1.0-cloud*0.45*dayMix);

  vec3 H=normalize(L+V);
  float nh=max(dot(Ng,H),0.0);
  float specGate=smoothstep(0.0,0.3,ndl);
  col+=vec3(1.0,0.9,0.75)*pow(nh,160.0)*oceanMask*0.55*specGate;
  col+=uAtmo*pow(nh,10.0)*oceanMask*0.1*specGate;

  // terminator warmth
  float term=smoothstep(-0.15,0.05,ndl)*(1.0-smoothstep(0.05,0.3,ndl));
  col+=vec3(0.9,0.4,0.15)*term*0.06;

  col=mix(city+day*0.012,col,dayMix);

  float fres=pow(1.0-max(dot(Ng,V),0.0),2.6);
  float atmoLit=smoothstep(-0.05,0.65,ndl);
  col=mix(col,uAtmo*1.25,fres*0.75*atmoLit);
  col*=uExposure;
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const cloudFragment = /* glsl */ `
uniform sampler2D uClouds; uniform vec3 uSun; uniform float uOpacity;
varying vec2 vUv; varying vec3 vNormalW; varying vec3 vPosW;
void main(){
  vec3 N=normalize(vNormalW);
  vec3 L=normalize(uSun);
  vec3 V=normalize(cameraPosition-vPosW);
  float c=texture2D(uClouds,vUv).r;
  c=smoothstep(0.08,0.9,c);
  float d=dot(N,L);
  float lit=smoothstep(-0.25,0.35,d);
  vec3 warm=mix(vec3(1.0,0.55,0.35),vec3(1.0),smoothstep(0.0,0.35,d));
  vec3 col=warm*(0.05+max(d,0.0)*1.1);
  float edge=smoothstep(0.02,0.35,dot(N,V));
  gl_FragColor=vec4(col,c*mix(0.06,0.92,lit)*uOpacity*edge);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const atmoVertex = /* glsl */ `
varying vec3 vNormalV; varying vec3 vNormalW;
void main(){
  vNormalV=normalize(normalMatrix*normal);
  vNormalW=normalize(mat3(modelMatrix)*normal);
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`
const atmoFragment = /* glsl */ `
uniform vec3 uColor; uniform vec3 uSun; uniform float uIntensity;
varying vec3 vNormalV; varying vec3 vNormalW;
void main(){
  float f=clamp(-dot(normalize(vNormalV),vec3(0.0,0.0,1.0)),0.0,1.0);
  float i=pow(smoothstep(0.0,0.55,f),2.6);
  float lit=smoothstep(-0.45,0.6,dot(normalize(vNormalW),normalize(uSun)));
  vec3 col=uColor*i*uIntensity*(0.08+lit*1.5);
  gl_FragColor=vec4(col,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

const BLUE = new THREE.Color('#4aa8ff')
const EMERALD = new THREE.Color('#2bf0a0')
const tmpV = new THREE.Vector3()
const tmpC = new THREE.Color()

// Pose of the Earth / camera for the current scroll state
function getPose(s, aspect) {
  const mobile = aspect < 0.9
  const p = {
    x: 0, y: 0, camZ: 4.6, camY: 0, lookY: 0,
    sun: [1.0, 0.35, 0.75], atmoMix: 0, night: 1, arcs: 0, spin: 1, exposure: 1,
  }
  if (s.scene === 'earth') {
    const u = s.local
    if (u <= 0) {
      const k = easeInOut(clamp(u + 1))
      p.x = mobile ? 0 : lerp(1.32, 0.62, k)
      p.y = mobile ? lerp(-0.95, 0.1, k) : lerp(-0.04, 0, k)
      p.camZ = mobile ? lerp(4.9, 5.4, k) : lerp(3.75, 4.4, k)
      p.sun = [lerp(0.45, 0.7, k), 0.38, 1.0]
    } else {
      const k = easeInOut(range(u, 0.05, 1))
      p.x = mobile ? 0 : lerp(0.62, 0, smooth(range(u, 0, 0.6)))
      p.y = mobile ? lerp(0.1, 0, k) : 0
      p.camZ = lerp(mobile ? 5.4 : 4.4, 1.09, Math.pow(k, 1.35))
      p.sun = [0.7, 0.35, 0.75 + k * 0.6]
      p.spin = 1 - k * 0.6
    }
  } else if (s.scene === 'human') {
    const k = s.local
    p.x = mobile ? 0 : 0.55
    p.y = mobile ? 0.35 : 0
    p.camZ = mobile ? 5.6 : lerp(3.6, 3.2, k)
    p.sun = [-1.0, 0.25, -0.7]
    p.night = 2.4
    p.arcs = 1
    p.spin = 0.7
  } else if (s.scene === 'protect') {
    const k = smooth(s.local)
    p.camZ = mobile ? lerp(7.6, 6.9, k) : lerp(5.0, 4.4, k)
    p.y = mobile ? 0.25 : 0.05
    p.sun = [0.6, 0.4, 1.0]
    p.atmoMix = 0.75
    p.arcs = 0.35
  } else if (s.scene === 'final') {
    const k = smooth(s.finalP)
    p.camZ = mobile ? lerp(8.6, 7.4, k) : lerp(5.6, 4.6, k)
    p.y = mobile ? 0.55 : 0.3
    p.sun = [0.9, 0.5, 0.9]
    p.atmoMix = 0.4
  }
  return p
}

export default function Earth() {
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
  const hi = !store.isMobile && gl.capabilities.maxTextureSize >= 4096
  const [day, night, ocean, clouds, normal] = useLoader(THREE.TextureLoader, [
    hi ? '/textures/earth_day_4k.jpg' : '/textures/earth_day_2k.jpg',
    '/textures/earth_night.jpg',
    '/textures/earth_ocean.jpg',
    '/textures/earth_clouds.jpg',
    '/textures/earth_normal.jpg',
  ])

  useMemo(() => {
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy())
    ;[day, night].forEach((t) => (t.colorSpace = THREE.SRGBColorSpace))
    ;[day, night, clouds, normal, ocean].forEach((t) => {
      t.anisotropy = aniso
      t.wrapS = THREE.RepeatWrapping
      t.needsUpdate = true
    })
  }, [day, night, ocean, clouds, normal, gl])

  const earthMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: earthVertex,
        fragmentShader: earthFragment,
        uniforms: {
          uDay: { value: day }, uNight: { value: night }, uOcean: { value: ocean },
          uClouds: { value: clouds }, uNormal: { value: normal },
          uSun: { value: new THREE.Vector3(1, 0.35, 0.75) },
          uAtmo: { value: BLUE.clone() },
          uCloudOffset: { value: 0 }, uNightBoost: { value: 1 }, uExposure: { value: 1 },
        },
      }),
    [day, night, ocean, clouds, normal],
  )
  const cloudMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: earthVertex,
        fragmentShader: cloudFragment,
        transparent: true,
        depthWrite: false,
        uniforms: { uClouds: { value: clouds }, uSun: earthMat.uniforms.uSun, uOpacity: { value: 1 } },
      }),
    [clouds, earthMat],
  )
  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmoVertex,
        fragmentShader: atmoFragment,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        uniforms: { uColor: earthMat.uniforms.uAtmo, uSun: earthMat.uniforms.uSun, uIntensity: { value: 1.25 } },
      }),
    [earthMat],
  )

  const root = useRef()
  const tilt = useRef()
  const spinner = useRef()
  const cloudRef = useRef()
  const arcsRef = useRef({ opacity: 0 })
  const cur = useRef(null)

  useFrame((state, dt) => {
    const s = store
    const show = s.scene === 'earth' || s.scene === 'human' || s.scene === 'protect' || s.scene === 'final'
    root.current.visible = show
    if (!show) {
      cur.current = null
      return
    }
    dt = Math.min(dt, 0.05)
    const aspect = size.width / size.height
    const target = getPose(s, aspect)
    // snap on first frame after becoming visible, otherwise damp
    if (!cur.current) cur.current = { ...target, sun: new THREE.Vector3(...target.sun), atmoMix: target.atmoMix }
    const c = cur.current
    const l = 4.5
    c.x = damp(c.x, target.x, l, dt)
    c.y = damp(c.y, target.y, l, dt)
    c.camZ = damp(c.camZ, target.camZ, l, dt)
    c.night = damp(c.night, target.night, 3, dt)
    c.atmoMix = damp(c.atmoMix, target.atmoMix, 3, dt)
    c.spin = damp(c.spin, target.spin, 2, dt)
    c.sun.lerp(tmpV.set(...target.sun), 1 - Math.exp(-3 * dt))
    arcsRef.current.opacity = damp(arcsRef.current.opacity, target.arcs, 3, dt)

    // intro scale-in
    const intro = s.intro
    const sc = lerp(0.72, 1, easeInOut(intro))
    root.current.scale.setScalar(sc)
    root.current.position.set(c.x, c.y - (1 - intro) * 0.15, 0)

    // rotation + mouse response
    const reduce = s.reducedMotion ? 0.25 : 1
    spinner.current.rotation.y += dt * 0.045 * c.spin * reduce
    cloudRef.current.rotation.y += dt * 0.055 * c.spin * reduce
    earthMat.uniforms.uCloudOffset.value = -(cloudRef.current.rotation.y - spinner.current.rotation.y) / (Math.PI * 2)
    tilt.current.rotation.x = damp(tilt.current.rotation.x, 0.18 + s.smooth.y * 0.18, 3, dt)
    tilt.current.rotation.z = damp(tilt.current.rotation.z, -0.32 + s.smooth.x * 0.06, 3, dt)
    tilt.current.rotation.y = damp(tilt.current.rotation.y, s.smooth.x * 0.35, 3, dt)

    // uniforms
    earthMat.uniforms.uSun.value.copy(c.sun).normalize()
    earthMat.uniforms.uNightBoost.value = c.night
    earthMat.uniforms.uAtmo.value.copy(tmpC.copy(BLUE).lerp(EMERALD, c.atmoMix))
    // fade clouds out as we pierce them during the dive
    cloudMat.uniforms.uOpacity.value = c.camZ < 1.3 ? clamp((c.camZ - 1.03) / 0.27) : 1

    // camera
    const cam = state.camera
    cam.position.set(s.smooth.x * 0.12 + c.x * 0.0, s.smooth.y * -0.08 + c.camY, c.camZ)
    cam.lookAt(c.x * 0.0, 0, 0)
    setCamera(cam, { fov: 35, near: 0.01, far: 400 })
    state.scene.background = BG
    state.scene.fog = null
  })

  const seg = store.isMobile ? 96 : 160
  return (
    <group ref={root} userData={{ sceneRoot: true }}>
      <group ref={tilt}>
        <group ref={spinner}>
          <mesh material={earthMat}>
            <sphereGeometry args={[1, seg, seg / 2]} />
          </mesh>
          <CityArcs state={arcsRef} />
        </group>
        <mesh ref={cloudRef} material={cloudMat} scale={1.012}>
          <sphereGeometry args={[1, seg, seg / 2]} />
        </mesh>
      </group>
      <mesh material={atmoMat} scale={1.1}>
        <sphereGeometry args={[1, 96, 48]} />
      </mesh>
    </group>
  )
}

const BG = new THREE.Color('#050807')
