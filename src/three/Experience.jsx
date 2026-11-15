import { Suspense, useEffect } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { store, damp } from '../lib/store'
import Earth from './Earth'
import Starfield from './Starfield'
import OceanScene from './OceanScene'
import ForestScene from './ForestScene'
import MountainScene from './MountainScene'
import WildlifeScene from './WildlifeScene'

function Controller() {
  const setFrameloop = useThree((s) => s.setFrameloop)
  useEffect(() => {
    store.setFrameloop = setFrameloop
    return () => (store.setFrameloop = null)
  }, [setFrameloop])
  useFrame((_, dt) => {
    dt = Math.min(dt, 0.05)
    store.smooth.x = damp(store.smooth.x, store.mouse.x, 2.5, dt)
    store.smooth.y = damp(store.smooth.y, store.mouse.y, 2.5, dt)
  }, -1)
  return null
}

// Fires once everything inside Suspense has loaded; pre-compiles every
// scene's shaders so the first transition doesn't hitch.
function Ready({ onReady }) {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    const roots = []
    scene.traverse((o) => o.userData.sceneRoot && roots.push(o))
    const prev = roots.map((r) => r.visible)
    roots.forEach((r) => (r.visible = true))
    const done = () => {
      roots.forEach((r, i) => (r.visible = prev[i]))
      onReady?.()
    }
    try {
      if (gl.compileAsync) gl.compileAsync(scene, camera).then(done, done)
      else {
        gl.compile(scene, camera)
        done()
      }
    } catch {
      done()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

export default function Experience({ onReady, onProgress }) {
  const mobile = store.isMobile
  useEffect(() => {
    THREE.DefaultLoadingManager.onProgress = (_, loaded, total) => onProgress?.(0.15 + (loaded / Math.max(total, 1)) * 0.8)
    onProgress?.(0.15)
    return () => (THREE.DefaultLoadingManager.onProgress = undefined)
  }, [onProgress])
  return (
    <Canvas
      dpr={mobile ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: !mobile, powerPreference: 'high-performance', alpha: false, stencil: false }}
      camera={{ fov: 35, near: 0.01, far: 400, position: [0, 0, 4] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
        gl.outputColorSpace = THREE.SRGBColorSpace
        gl.setClearColor('#050807')
      }}
    >
      <Controller />
      <Suspense fallback={null}>
        <Starfield />
        <Earth />
        <OceanScene />
        <ForestScene />
        <MountainScene />
        <WildlifeScene />
        <Ready onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}
