import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function Cursor() {
  const dot = useRef()
  const ring = useRef()
  const label = useRef()
  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    document.documentElement.classList.add('has-cursor')
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.12, ease: 'power3.out' })
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.12, ease: 'power3.out' })
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.55, ease: 'power3.out' })
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.55, ease: 'power3.out' })
    let hovering = null
    gsap.set([dot.current, ring.current], { opacity: 0 })
    let first = true
    const move = (e) => {
      if (first) {
        first = false
        gsap.set([dot.current, ring.current], { x: e.clientX, y: e.clientY })
        gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.4 })
      }
      dx(e.clientX)
      dy(e.clientY)
      rx(e.clientX)
      ry(e.clientY)
      const t = e.target.closest?.('a, button, [data-cursor]')
      if (t !== hovering) {
        hovering = t
        const text = t?.dataset?.cursorLabel || ''
        label.current.textContent = text
        gsap.to(ring.current, {
          scale: t ? (text ? 2.6 : 1.8) : 1,
          backgroundColor: text ? 'rgba(0,200,117,0.92)' : t ? 'rgba(244,247,242,0.06)' : 'rgba(244,247,242,0)',
          borderColor: t ? 'rgba(0,200,117,0.7)' : 'rgba(244,247,242,0.35)',
          duration: 0.5,
          ease: 'expo.out',
        })
        gsap.to(dot.current, { scale: t ? 0 : 1, duration: 0.3 })
        gsap.to(label.current, { opacity: text ? 1 : 0, duration: 0.3 })
      }
    }
    const down = () => gsap.to(ring.current, { scale: '-=0.25', duration: 0.2 })
    const up = () => gsap.to(ring.current, { scale: hovering ? (label.current.textContent ? 2.6 : 1.8) : 1, duration: 0.4 })
    const leave = () => gsap.to([dot.current, ring.current], { opacity: 0, duration: 0.3 })
    const enter = () => gsap.to([dot.current, ring.current], { opacity: 1, duration: 0.3 })
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    document.addEventListener('pointerleave', leave)
    document.addEventListener('pointerenter', enter)
    return () => {
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      document.removeEventListener('pointerleave', leave)
      document.removeEventListener('pointerenter', enter)
    }
  }, [])
  return (
    <div className="pointer-events-none fixed inset-0 z-[90] hidden [@media(pointer:fine)]:block" aria-hidden>
      <div ref={ring} className="absolute left-0 top-0 -ml-5 -mt-5 flex h-10 w-10 items-center justify-center rounded-full border border-natural/35 mix-blend-normal">
        <span ref={label} className="text-[0.32rem] font-semibold uppercase tracking-[0.2em] text-space opacity-0" />
      </div>
      <div ref={dot} className="absolute left-0 top-0 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-emerald shadow-[0_0_10px_rgba(0,200,117,0.9)]" />
    </div>
  )
}
