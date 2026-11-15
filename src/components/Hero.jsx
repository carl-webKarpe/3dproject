import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ArrowDown, Compass, Leaf } from 'lucide-react'
import { scrollToId } from '../lib/store'
import { Magnetic, SplitLetters } from './ui'

function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="font-mono tabular-nums">{now.toISOString().slice(11, 19)} UTC</span>
}

export default function Hero({ started }) {
  const root = useRef()
  useEffect(() => {
    if (!started) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('.hero-pill', { y: 20, opacity: 0, duration: 1.2 }, 0.1)
        .from('.hero-l1 .split-char', { yPercent: 120, rotate: 8, duration: 1.4, stagger: 0.035 }, 0.15)
        .from('.hero-l2 .split-char', { yPercent: 120, rotate: 8, duration: 1.4, stagger: 0.03 }, 0.35)
        .from('.hero-sub', { y: 24, opacity: 0, duration: 1.2 }, 0.75)
        .from('.hero-cta > *', { y: 24, opacity: 0, duration: 1.1, stagger: 0.1 }, 0.9)
        .from('.hero-meta', { opacity: 0, duration: 1.6, stagger: 0.1 }, 1.1)
        .from('.hero-line', { scaleX: 0, transformOrigin: 'left', duration: 1.6 }, 1)
      // parallax out on scroll
      gsap.to('.hero-content', {
        yPercent: -30,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    }, root)
    return () => ctx.revert()
  }, [started])

  return (
    <section id="hero" ref={root} className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,7,0.85)_0%,rgba(5,8,7,0.35)_45%,transparent_70%)] max-md:bg-[linear-gradient(180deg,rgba(5,8,7,0.9)_0%,rgba(5,8,7,0.4)_55%,transparent_80%)]" />
      <div className="hero-content relative mx-auto flex h-full max-w-[1400px] flex-col justify-center px-6 pb-24 sm:px-10 max-md:justify-start max-md:pt-32">
        <div className={started ? '' : 'invisible'}>
          <div className="hero-pill glass mb-8 inline-flex items-center gap-3 rounded-full py-2 pl-2 pr-4 text-[0.72rem] tracking-wide text-natural/80">
            <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-emerald/15">
              <span className="pulse-ring absolute h-2 w-2 rounded-full bg-emerald/60" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
            </span>
            Live render · The living planet, right now
          </div>
          <h1 className="font-sans font-semibold leading-[0.88] tracking-[-0.035em]">
            <span className="hero-l1 block text-[clamp(3.1rem,9vw,8.6rem)]">
              <SplitLetters text="ONE PLANET." />
            </span>
            <span className="hero-l2 mt-1 block font-serif text-[clamp(2.9rem,8.4vw,8rem)] font-normal italic leading-[0.95] tracking-[-0.01em]">
              <SplitLetters text="INFINITE WONDERS." letterClass="text-gradient" />
            </span>
          </h1>
          <p className="hero-sub mt-8 max-w-md text-[1.02rem] leading-relaxed text-natural/70 sm:text-lg">
            Discover the extraordinary beauty of the world we call home.
          </p>
          <div className="hero-cta mt-10 flex flex-wrap items-center gap-4">
            <Magnetic onClick={() => scrollToId('journey')} className="btn-primary">
              <Compass size={16} /> Explore the Earth
            </Magnetic>
            <Magnetic onClick={() => scrollToId('ecosystems')} className="btn-ghost">
              <Leaf size={16} /> Discover Nature
            </Magnetic>
          </div>
        </div>
      </div>

      {/* bottom bar */}
      <div className={`absolute inset-x-0 bottom-0 ${started ? '' : 'invisible'}`}>
        <div className="mx-auto flex max-w-[1400px] items-end justify-between px-6 pb-8 sm:px-10">
          <div className="hero-meta hidden items-center gap-6 text-[0.68rem] tracking-[0.22em] text-natural/50 md:flex">
            <span>EARTH · 23.44° TILT</span>
            <span className="hero-line h-px w-16 bg-natural/30" />
            <LiveClock />
          </div>
          <button onClick={() => scrollToId('journey')} className="hero-meta group mx-auto flex flex-col items-center gap-3 md:mx-0" aria-label="Scroll to begin the journey">
            <span className="flex h-11 w-7 justify-center rounded-full border border-natural/30 pt-2">
              <span className="scroll-dot h-2 w-[3px] rounded-full bg-emerald" />
            </span>
            <span className="flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.3em] text-natural/50 transition-colors group-hover:text-natural">
              Scroll to begin <ArrowDown size={11} />
            </span>
          </button>
          <div className="hero-meta hidden text-right text-[0.68rem] tracking-[0.22em] text-natural/50 md:block">
            <div>ROTATION · 1,674 KM/H</div>
            <div className="mt-1 text-natural/30">SCENE 01 / 07</div>
          </div>
        </div>
      </div>
    </section>
  )
}
