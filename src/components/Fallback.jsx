import { useEffect, useRef } from 'react'
import { store } from '../lib/store'
import { tones } from '../lib/images'

const map = { earth: 'space', ocean: 'ocean', forest: 'forest', mountains: 'mountain', wildlife: 'wild', human: 'city', protect: 'space', final: 'space' }

// Shown when WebGL is unavailable: a CSS globe + mood gradients per scene.
export default function Fallback() {
  const bg = useRef()
  const globe = useRef()
  useEffect(() => {
    let raf
    let prev
    const loop = () => {
      if (store.scene !== prev) {
        prev = store.scene
        bg.current.style.background = tones[map[prev] || 'space']
        const earthy = ['earth', 'human', 'protect', 'final'].includes(prev)
        globe.current.style.opacity = earthy ? 1 : 0
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="fixed inset-0">
      <div ref={bg} className="absolute inset-0 transition-[background] duration-1000" />
      <div ref={globe} className="absolute right-[-10vmin] top-1/2 -translate-y-1/2 transition-opacity duration-1000 max-md:right-1/2 max-md:translate-x-1/2">
        <div className="css-globe h-[80vmin] w-[80vmin]" style={{ animationDuration: '60s' }} />
      </div>
    </div>
  )
}
