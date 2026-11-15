import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'

// Cinematic preloader. `target` is the real progress (0–1); `done` flips when
// the 3D world is ready. Calls onFinish after the exit animation.
export default function Loader({ target, done, onFinish }) {
  const root = useRef()
  const bar = useRef()
  const num = useRef()
  const shown = useRef(0)
  const [gone, setGone] = useState(false)
  const started = useRef(performance.now())

  useEffect(() => {
    let raf
    const tick = () => {
      const elapsed = (performance.now() - started.current) / 1000
      // creep towards target, never overshooting what has really loaded
      const creep = Math.min(0.92, elapsed * 0.18)
      const goal = done ? 1 : Math.max(Math.min(target, 0.97), Math.min(creep, target + 0.25, 0.92))
      shown.current += (goal - shown.current) * (done ? 0.12 : 0.05)
      const v = shown.current
      if (bar.current) bar.current.style.transform = `scaleX(${v})`
      if (num.current) num.current.textContent = String(Math.round(v * 100)).padStart(3, '0')
      if (done && v > 0.995 && elapsed > 1.4) {
        exit()
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, done])

  const exited = useRef(false)
  function exit() {
    if (exited.current) return
    exited.current = true
    const tl = gsap.timeline({
      onComplete: () => {
        setGone(true)
      },
    })
    tl.to('.loader-fade', { opacity: 0, y: -20, duration: 0.6, stagger: 0.05, ease: 'power2.in' })
      .to('.loader-globe', { scale: 6, opacity: 0, duration: 1.1, ease: 'expo.in' }, '<0.1')
      .add(() => onFinish?.(), '-=0.35')
      .to(root.current, { opacity: 0, duration: 0.8, ease: 'power2.out' }, '-=0.35')
  }

  if (gone) return null
  return (
    <div ref={root} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020403]" role="status" aria-live="polite">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_50%,rgba(0,200,117,0.08),transparent_70%)]" />
      <div className="loader-fade mb-14 font-sans text-sm font-semibold tracking-[0.9em] text-natural/90 pl-[0.9em]">TERRA</div>
      <div className="loader-globe relative mb-14 h-28 w-28 sm:h-32 sm:w-32">
        <div className="absolute -inset-6 rounded-full border border-emerald/15" />
        <div className="absolute -inset-12 rounded-full border border-natural/5" />
        <div className="css-globe h-full w-full" />
      </div>
      <div className="loader-fade w-[min(320px,72vw)]">
        <div className="relative h-px w-full bg-natural/10">
          <div ref={bar} className="absolute inset-0 origin-left scale-x-0 bg-emerald shadow-[0_0_12px_2px_rgba(0,200,117,0.7)]" />
        </div>
        <div className="mt-5 flex items-center justify-between text-[0.62rem] tracking-[0.3em] text-natural/50">
          <span>PREPARING YOUR PLANETARY JOURNEY...</span>
          <span ref={num} className="font-mono text-emerald">000</span>
        </div>
      </div>
    </div>
  )
}
