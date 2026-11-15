import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { store, SCENES, clamp, smooth } from './lib/store'
import Loader from './components/Loader'
import Nav from './components/Nav'
import Cursor from './components/Cursor'
import Hero from './components/Hero'
import Journey from './components/Journey'
import ChapterNav from './components/ChapterNav'
import Ecosystems from './components/Ecosystems'
import Numbers from './components/Numbers'
import Gallery from './components/Gallery'
import Finale from './components/Finale'
import Fallback from './components/Fallback'

gsap.registerPlugin(ScrollTrigger)

const Experience = lazy(() => import('./three/Experience'))
if (import.meta.env.DEV) window.__terra = store

function detectWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')))
  } catch {
    return false
  }
}

const VEIL = [null, '#0d4a70', '#07170f', '#dfe6dc', '#f0cf9f', '#050807', '#050807']

export default function App() {
  const [webgl] = useState(detectWebGL)
  const [progress, setProgress] = useState(0.05)
  const [ready, setReady] = useState(false)
  const [started, setStarted] = useState(false)
  const canvasWrap = useRef()
  const veil = useRef()

  // --- smooth scrolling -----------------------------------------------------
  useEffect(() => {
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    const lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
    store.lenis = lenis
    lenis.stop()
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      store.lenis = null
    }
  }, [])

  // --- pointer --------------------------------------------------------------
  useEffect(() => {
    const move = (e) => {
      store.mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      store.mouse.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])

  // --- scroll → scene mapping -------------------------------------------------
  useEffect(() => {
    const hero = ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: 'bottom top' })
    const journey = ScrollTrigger.create({ trigger: '#journey', start: 'top top', end: 'bottom bottom' })
    const covered = ScrollTrigger.create({ trigger: '#covered', start: 'top top', end: 'bottom bottom' })
    const finale = ScrollTrigger.create({ trigger: '#finale', start: 'top bottom', end: 'bottom bottom' })
    let wasCovered = null
    const n = SCENES.length

    const compute = () => {
      const y = window.scrollY
      let veilA = 0
      let veilC = '#050807'
      if (y < journey.start) {
        store.scene = 'earth'
        store.local = -1 + hero.progress
      } else if (y <= journey.end) {
        const t = clamp(journey.progress * n, 0, n - 0.0001)
        const i = Math.floor(t)
        store.scene = SCENES[i]
        store.local = t - i
        for (let b = 1; b < n; b++) {
          const v = 1 - smooth(clamp(Math.abs(t - b) / 0.11))
          if (v > veilA) {
            veilA = v
            veilC = VEIL[b]
          }
        }
      } else if (y > finale.start) {
        store.scene = 'final'
        store.finalP = finale.progress
      } else {
        store.scene = 'protect'
        store.local = 1
      }
      store.chapterIndex = clamp(Math.floor(journey.progress * n), 0, n - 1)
      store.journeyP = journey.progress
      const vh = window.innerHeight
      store.inJourney = y > journey.start - vh * 0.4 && y < journey.end - vh * 0.3

      if (veil.current) {
        veil.current.style.opacity = veilA.toFixed(3)
        veil.current.style.backgroundColor = veilC
      }
      const isCovered = y > covered.start + 2 && y < covered.end - 2
      if (isCovered !== wasCovered) {
        wasCovered = isCovered
        store.covered = isCovered
        store.setFrameloop?.(isCovered ? 'never' : 'always')
        if (canvasWrap.current) canvasWrap.current.style.visibility = isCovered ? 'hidden' : 'visible'
      }
    }
    const onScroll = () => compute()
    window.addEventListener('scroll', onScroll, { passive: true })
    ScrollTrigger.addEventListener('refresh', compute)
    compute()
    const id = setInterval(() => store.setFrameloop && (compute(), clearInterval(id)), 250)
    return () => {
      clearInterval(id)
      window.removeEventListener('scroll', onScroll)
      ScrollTrigger.removeEventListener('refresh', compute)
      ;[hero, journey, covered, finale].forEach((t) => t.kill())
    }
  }, [])

  // --- loading --------------------------------------------------------------
  useEffect(() => {
    if (!webgl) {
      document.fonts?.ready.then(() => {
        setProgress(1)
        setReady(true)
      })
      return
    }
    // safety net: never trap the visitor behind the loader
    const t = setTimeout(() => setReady(true), 20000)
    return () => clearTimeout(t)
  }, [webgl])

  const onFinish = useCallback(() => {
    setStarted(true)
    store.lenis?.start()
    gsap.to(store, { intro: 1, duration: 2.6, ease: 'expo.out' })
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }, [])

  return (
    <>
      <Loader target={progress} done={ready} onFinish={onFinish} />
      <Cursor />
      <div ref={canvasWrap} className="fixed inset-0 z-0" aria-hidden>
        {webgl ? (
          <Suspense fallback={null}>
            <Experience onProgress={setProgress} onReady={() => setReady(true)} />
          </Suspense>
        ) : (
          <Fallback />
        )}
      </div>
      <div ref={veil} className="pointer-events-none fixed inset-0 z-[1] opacity-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(120%_80%_at_50%_50%,transparent_55%,rgba(0,0,0,0.55)_100%)]" aria-hidden />
      <Nav visible={started} />
      <ChapterNav />
      <main className="relative z-[2]">
        <Hero started={started} />
        <Journey started={started} />
        <div id="covered">
          <Ecosystems />
          <Numbers />
          <Gallery />
        </div>
        <Finale />
      </main>
    </>
  )
}
