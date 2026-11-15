import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { store } from '../lib/store'
import { skyVertex, skyFragment } from './glsl'

// Toggles the visibility of a scene root and runs its frame logic only when active
export function useSceneFrame(name, ref, fn, priority = 0) {
  useFrame((state, dt) => {
    const active = store.scene === name
    if (ref.current) ref.current.visible = active
    if (!active) return
    fn(state, Math.min(dt, 0.05), store.local)
  }, priority)
}

export function setCamera(cam, { fov = 45, near = 0.1, far = 900 } = {}) {
  if (cam.fov !== fov || cam.near !== near || cam.far !== far) {
    cam.fov = fov
    cam.near = near
    cam.far = far
    cam.updateProjectionMatrix()
  }
}

// ----------------------------------------------------------------- sky dome
export function Sky({ top, horizon, bottom, sunDir = [0, 0.2, -1], sunColor = '#ffd9a0', sunSize = 0.003, sunGlow = 1 }) {
  const ref = useRef()
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(top) },
          uHorizon: { value: new THREE.Color(horizon) },
          uBottom: { value: new THREE.Color(bottom) },
          uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
          uSunColor: { value: new THREE.Color(sunColor) },
          uSunSize: { value: sunSize },
          uSunGlow: { value: sunGlow },
          uTime: { value: 0 },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  useFrame((state) => {
    if (!ref.current.parent?.visible) return
    ref.current.position.copy(state.camera.position)
    mat.uniforms.uTime.value = state.clock.elapsedTime
  })
  return (
    <mesh ref={ref} material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[500, 48, 24]} />
    </mesh>
  )
}

// ------------------------------------------------------------ haze material
// Unlit-ish material with hemispheric shading + exponential haze. Cheap and
// consistent with scene fog. Optional vertex wiggle for fish/kelp.
export function makeHazeMaterial({
  dark = '#0a1a24', light = '#5a8aa8', fog = '#06304d', density = 0.03,
  wiggle = 0, sway = 0, instanced = false, caustics = 0, side = THREE.FrontSide, lightDir = [0, 1, 0],
  vertexColors = false,
} = {}) {
  return new THREE.ShaderMaterial({
    side,
    vertexColors,
    uniforms: {
      uDark: { value: new THREE.Color(dark) },
      uLight: { value: new THREE.Color(light) },
      uFog: { value: new THREE.Color(fog) },
      uDensity: { value: density },
      uTime: { value: 0 },
      uWiggle: { value: wiggle },
      uSway: { value: sway },
      uCaustics: { value: caustics },
      uLightDir: { value: new THREE.Vector3(...lightDir).normalize() },
    },
    vertexShader: /* glsl */ `
      ${instanced ? 'attribute float aPhase;' : 'float aPhase=0.0;'}
      uniform float uTime; uniform float uWiggle; uniform float uSway;
      varying vec3 vN; varying float vDepth; varying vec3 vW; varying float vH;
      varying vec3 vCol;
      void main(){
        vec3 p=position;
        vCol=vec3(1.0);
        #ifdef USE_COLOR
        vCol*=color;
        #endif
        #ifdef USE_INSTANCING_COLOR
        vCol*=instanceColor;
        #endif
        vH=p.y;
        if(uWiggle>0.0){ float k=max(-p.z,0.0); p.x+=sin(p.z*5.0-uTime*9.0+aPhase*6.28)*uWiggle*(0.2+k); }
        if(uSway>0.0){ float k=pow(max(p.y,0.0),1.4); p.x+=sin(uTime*0.9-p.y*2.5+aPhase*6.28)*uSway*k; p.z+=cos(uTime*0.7-p.y*2.0+aPhase*3.0)*uSway*0.6*k; }
        mat4 m=modelMatrix;
        ${instanced ? 'm=modelMatrix*instanceMatrix;' : ''}
        vec4 w=m*vec4(p,1.0);
        vW=w.xyz;
        vN=normalize(mat3(m)*normal);
        vec4 mv=viewMatrix*w;
        vDepth=-mv.z;
        gl_Position=projectionMatrix*mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uDark; uniform vec3 uLight; uniform vec3 uFog; uniform float uDensity; uniform float uTime; uniform float uCaustics;
      uniform vec3 uLightDir;
      varying vec3 vN; varying float vDepth; varying vec3 vW; varying float vH;
      varying vec3 vCol;
      float cpat(vec2 p){
        vec2 i=p; float c=1.0; float inten=0.005;
        for(int n=0;n<4;n++){
          float t=uTime*0.35*(1.0-(3.5/float(n+1)));
          i=p+vec2(cos(t-i.x)+sin(t+i.y),sin(t-i.y)+cos(t+i.x));
          c+=1.0/length(vec2(p.x/(sin(i.x+t)/inten),p.y/(cos(i.y+t)/inten)));
        }
        c/=4.0; c=1.17-pow(c,1.4);
        return clamp(pow(abs(c),8.0),0.0,1.0);
      }
      void main(){
        vec3 n=normalize(vN);
        if(!gl_FrontFacing) n=-n;
        float l=clamp(dot(n,uLightDir)*0.5+0.5,0.0,1.0);
        vec3 base=mix(uDark,uLight,l*l);
        base*=vCol;
        if(uCaustics>0.0){ base+=uLight*cpat(vW.xz*0.35)*uCaustics*smoothstep(0.2,1.0,n.y); }
        float f=1.0-exp(-uDensity*uDensity*vDepth*vDepth);
        gl_FragColor=vec4(mix(base,uFog,f),1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
}

// ------------------------------------------------------------ GPU particles
export function Particles({
  count = 1000, box = [30, 20, 30], vel = [0, -0.3, 0], color = '#ffffff', size = 1, wobble = 0.3,
  additive = true, opacity = 1, twinkle = 0, fade = 1,
}) {
  const ref = useRef()
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos.set([(Math.random() - 0.5) * box[0], (Math.random() - 0.5) * box[1], (Math.random() - 0.5) * box[2]], i * 3)
      seed[i] = Math.random()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uCam: { value: new THREE.Vector3() },
        uBox: { value: new THREE.Vector3(...box) },
        uVel: { value: new THREE.Vector3(...vel) },
        uColor: { value: new THREE.Color(color) },
        uSize: { value: size },
        uPx: { value: Math.min(window.devicePixelRatio, 2) },
        uWobble: { value: wobble },
        uOpacity: { value: opacity },
        uTwinkle: { value: twinkle },
        uFade: { value: fade },
      },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime; uniform vec3 uCam; uniform vec3 uBox; uniform vec3 uVel; uniform float uSize; uniform float uPx; uniform float uWobble; uniform float uTwinkle; uniform float uFade;
        varying float vA;
        void main(){
          vec3 p=position+uVel*uTime*(0.6+aSeed*0.8);
          p.x+=sin(uTime*0.7+aSeed*20.0)*uWobble;
          p.z+=cos(uTime*0.55+aSeed*13.0)*uWobble;
          p.y+=sin(uTime*0.4+aSeed*7.0)*uWobble*0.5;
          p=mod(p-uCam+uBox*0.5,uBox)-uBox*0.5+uCam;
          vec4 mv=modelViewMatrix*vec4(p,1.0);
          float d=-mv.z;
          gl_PointSize=uSize*uPx*(0.4+aSeed)*(12.0/max(d,0.1));
          vA=smoothstep(uBox.z*0.5,uBox.z*0.5*(1.0-0.6*uFade),d)*smoothstep(0.2,1.2,d);
          if(uTwinkle>0.0) vA*=mix(1.0,0.5+0.5*sin(uTime*(1.5+aSeed*3.0)+aSeed*50.0),uTwinkle);
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uOpacity; varying float vA;
        void main(){
          float d=length(gl_PointCoord-0.5);
          float a=smoothstep(0.5,0.05,d);
          gl_FragColor=vec4(uColor,a*vA*uOpacity);
        }`,
    })
    return { geo, mat }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useFrame((state) => {
    if (!ref.current.parent?.visible) return
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uCam.value.copy(state.camera.position)
  })
  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />
}

// ------------------------------------------------------------------- birds
function birdGeometry() {
  const v = [
    // left wing
    0, 0, 0.14, -0.62, 0.02, -0.02, 0, 0, -0.08,
    -0.62, 0.02, -0.02, -0.95, 0.0, -0.14, -0.3, 0.0, -0.08,
    // right wing
    0, 0, 0.14, 0, 0, -0.08, 0.62, 0.02, -0.02,
    0.62, 0.02, -0.02, 0.3, 0.0, -0.08, 0.95, 0.0, -0.14,
    // body
    0, 0, 0.32, -0.05, 0, 0.0, 0.05, 0, 0.0,
    -0.05, 0, 0.0, 0, 0, -0.32, 0.05, 0, 0.0,
    // tail
    0, 0, -0.25, -0.1, 0, -0.42, 0.1, 0, -0.42,
  ]
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3))
  return g
}

export function Birds({
  flocks = 6, perFlock = 11, bounds = [-60, 60], y = [8, 20], z = [-60, -15], speed = 5, scale = 0.9,
  color = '#15110d', haze = '#e7b980', hazeNear = 20, hazeFar = 140, flap = 10, glide = 0, seed = 1,
}) {
  const ref = useRef()
  const count = flocks * perFlock
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const data = useMemo(() => {
    let s = seed * 9301
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
    const fl = []
    for (let f = 0; f < flocks; f++) {
      fl.push({
        x: bounds[0] + r() * (bounds[1] - bounds[0]),
        y: y[0] + r() * (y[1] - y[0]),
        z: z[0] + r() * (z[1] - z[0]),
        dir: r() > 0.25 ? 1 : -1,
        sp: speed * (0.7 + r() * 0.6),
        vee: r() > 0.4,
        drift: r() * 10,
      })
    }
    const birds = []
    for (let i = 0; i < count; i++) {
      const f = Math.floor(i / perFlock)
      const k = i % perFlock
      const flock = fl[f]
      let ox, oy, oz
      if (flock.vee) {
        const side = k % 2 ? 1 : -1
        const rank = Math.ceil(k / 2)
        ox = -rank * 1.1 * flock.dir
        oz = side * rank * 1.0
        oy = (r() - 0.5) * 0.4
      } else {
        ox = (r() - 0.5) * 7
        oy = (r() - 0.5) * 3
        oz = (r() - 0.5) * 7
      }
      birds.push({ f, ox, oy, oz, ph: r(), sc: scale * (0.8 + r() * 0.4) })
    }
    return { fl, birds }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { geo, mat } = useMemo(() => {
    const geo = birdGeometry()
    const phase = new Float32Array(count)
    data.birds.forEach((b, i) => (phase[i] = b.ph))
    const ig = new THREE.InstancedBufferGeometry().copy(geo)
    ig.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1))
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uHaze: { value: new THREE.Color(haze) },
        uNear: { value: hazeNear }, uFar: { value: hazeFar }, uFlap: { value: flap }, uGlide: { value: glide },
      },
      vertexShader: /* glsl */ `
        attribute float aPhase; uniform float uTime; uniform float uFlap; uniform float uGlide; varying float vDepth;
        void main(){
          vec3 p=position;
          float w=abs(p.x);
          float t=uTime*uFlap*(0.85+aPhase*0.3)+aPhase*6.2831;
          float glide=uGlide>0.0 ? smoothstep(0.2,0.8,sin(uTime*0.35+aPhase*12.0)*0.5+0.5)*uGlide : 0.0;
          float f=sin(t)*(1.0-glide)+0.12*glide;
          p.y+=f*w*0.85;
          p.x*=1.0-0.18*abs(f);
          vec4 mv=modelViewMatrix*instanceMatrix*vec4(p,1.0);
          vDepth=-mv.z;
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform vec3 uHaze; uniform float uNear; uniform float uFar; varying float vDepth;
        void main(){
          vec3 c=mix(uColor,uHaze,smoothstep(uNear,uFar,vDepth)*0.85);
          gl_FragColor=vec4(c,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
    return { geo: ig, mat }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((state, dt) => {
    if (!ref.current.parent?.visible) return
    dt = Math.min(dt, 0.05)
    const t = state.clock.elapsedTime
    mat.uniforms.uTime.value = t
    const span = bounds[1] - bounds[0]
    data.fl.forEach((f) => {
      f.x += f.dir * f.sp * dt
      if (f.x > bounds[1]) f.x -= span
      if (f.x < bounds[0]) f.x += span
    })
    data.birds.forEach((b, i) => {
      const f = data.fl[b.f]
      const wob = Math.sin(t * 0.7 + b.ph * 20) * 0.35
      dummy.position.set(
        f.x + b.ox,
        f.y + b.oy + Math.sin(t * 0.5 + f.drift) * 1.2 + wob,
        f.z + b.oz + Math.cos(t * 0.4 + f.drift) * 1.5,
      )
      dummy.rotation.set(0, (f.dir > 0 ? Math.PI / 2 : -Math.PI / 2), Math.sin(t * 0.8 + b.ph * 9) * 0.12)
      dummy.scale.setScalar(b.sc)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

// -------------------------------------------------------------- butterflies
export function Butterflies({ count = 24, center = [0, 2, 0], spread = [10, 3, 10], scale = 0.35, palette }) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colors = palette || ['#2fb6ff', '#ff9a3c', '#00c875', '#f4f7f2', '#c9a96e']
  const data = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        hx: center[0] + (Math.random() - 0.5) * spread[0],
        hy: center[1] + (Math.random() - 0.5) * spread[1],
        hz: center[2] + (Math.random() - 0.5) * spread[2],
        a: 0.2 + Math.random() * 0.3, b: 0.3 + Math.random() * 0.4, c: 0.15 + Math.random() * 0.3,
        p: Math.random() * 10, r: 1.5 + Math.random() * 2.5,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const { geo, mat } = useMemo(() => {
    // two wings hinged on the z axis
    const pos = [
      0, 0, -0.3, 0.55, 0, -0.42, 0.6, 0, 0.18, 0, 0, -0.3, 0.6, 0, 0.18, 0, 0, 0.32,
      0, 0, -0.3, -0.6, 0, 0.18, -0.55, 0, -0.42, 0, 0, -0.3, 0, 0, 0.32, -0.6, 0, 0.18,
    ]
    const g = new THREE.InstancedBufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    const ph = new Float32Array(count)
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      ph[i] = Math.random()
      const c = new THREE.Color(colors[i % colors.length])
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('aPhase', new THREE.InstancedBufferAttribute(ph, 1))
    g.setAttribute('aColor', new THREE.InstancedBufferAttribute(col, 3))
    const mat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float aPhase; attribute vec3 aColor; uniform float uTime;
        varying vec3 vColor; varying vec2 vWing;
        void main(){
          vColor=aColor;
          vec3 p=position;
          vWing=vec2(abs(p.x)/0.6,p.z);
          float a=(sin(uTime*14.0*(0.8+aPhase*0.4)+aPhase*6.28)*0.5+0.5)*1.25;
          float s=sign(p.x);
          float r=abs(p.x);
          p.x=s*cos(a)*r; p.y=sin(a)*r;
          gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vColor; varying vec2 vWing;
        void main(){
          float edge=smoothstep(0.75,0.98,vWing.x);
          vec3 c=mix(vColor*1.25,vec3(0.03),edge*0.85);
          c=mix(c*0.35,c,smoothstep(0.0,0.35,vWing.x));
          float spot=smoothstep(0.08,0.0,length(vWing-vec2(0.8,-0.15)));
          c=mix(c,vec3(1.0),spot*0.8);
          gl_FragColor=vec4(c,1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
    return { geo: g, mat }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useFrame((state) => {
    if (!ref.current.parent?.visible) return
    const t = state.clock.elapsedTime
    mat.uniforms.uTime.value = t
    data.forEach((d, i) => {
      const x = d.hx + Math.sin(t * d.a + d.p) * d.r
      const y = d.hy + Math.sin(t * d.b * 2.0 + d.p * 2) * 0.6
      const z = d.hz + Math.cos(t * d.c + d.p) * d.r
      const dx = Math.cos(t * d.a + d.p) * d.a
      const dz = -Math.sin(t * d.c + d.p) * d.c
      dummy.position.set(x, y, z)
      dummy.rotation.set(-0.3, Math.atan2(dx, dz), 0)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />
}

// ---------------------------------------------------- light shafts / god rays
export function LightShafts({ items, color = '#fff2c4', intensity = 0.35, tilt = 0.3 }) {
  const ref = useRef()
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uI: { value: intensity } },
        vertexShader: /* glsl */ `varying vec2 vUv; varying float vSeed; uniform float uTime;
          void main(){ vUv=uv; vSeed=fract(modelMatrix[3].x*0.13+modelMatrix[3].z*0.071);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
        fragmentShader: /* glsl */ `uniform float uTime; uniform vec3 uColor; uniform float uI; varying vec2 vUv; varying float vSeed;
          void main(){
            float x=abs(vUv.x-0.5)*2.0;
            float a=smoothstep(1.0,0.0,x); a*=a;
            a*=smoothstep(0.0,0.6,vUv.y)*smoothstep(1.0,0.85,vUv.y);
            a*=0.6+0.4*sin(uTime*0.6+vSeed*30.0+vUv.y*3.0);
            gl_FragColor=vec4(uColor*a*uI,1.0);
          }`,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  useFrame((state) => {
    if (!ref.current.parent?.visible) return
    mat.uniforms.uTime.value = state.clock.elapsedTime
    const cam = state.camera.position
    ref.current.children.forEach((m) => {
      m.rotation.set(0, Math.atan2(cam.x - m.position.x, cam.z - m.position.z), 0)
      m.rotateZ(m.userData.tilt)
    })
  })
  return (
    <group ref={ref}>
      {items.map((it, i) => (
        <mesh key={i} position={it.p} material={mat} userData={{ tilt: it.tilt ?? tilt }}>
          <planeGeometry args={[it.w, it.h]} />
        </mesh>
      ))}
    </group>
  )
}

// -------------------------------------------------- textured billboards (mist/cloud)
export function Billboards({ items, texture, color = '#ffffff', opacity = 0.5, fog = '#ffffff', fogNear = 20, fogFar = 200, drift = [0, 0, 0], wrap = 0 }) {
  const ref = useRef()
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: texture, color, transparent: true, opacity, depthWrite: false, fog: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  useFrame((state, dt) => {
    if (!ref.current.parent?.visible) return
    const q = state.camera.quaternion
    ref.current.children.forEach((m, i) => {
      m.quaternion.copy(q)
      m.rotateZ(m.userData.rot)
      if (drift[0] || drift[2]) {
        m.position.x += drift[0] * dt * (0.6 + (i % 5) * 0.15)
        m.position.z += drift[2] * dt
        if (wrap && m.position.x > wrap) m.position.x -= wrap * 2
      }
    })
  })
  return (
    <group ref={ref}>
      {items.map((it, i) => (
        <mesh key={i} position={it.p} scale={it.s} material={mat} userData={{ rot: it.rot ?? 0 }} renderOrder={2}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  )
}
