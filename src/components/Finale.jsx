import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ArrowUp, Globe2 } from 'lucide-react'
import { scrollToId } from '../lib/store'
import { Magnetic, SplitLetters } from './ui'

export default function Finale() {
  const root = useRef()
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: '.fin-stage', start: 'top 65%' }, defaults: { ease: 'expo.out' } })
      tl.from('.fin-kicker', { opacity: 0, y: 20, duration: 1.2 })
        .from('.fin-title .split-char', { yPercent: 120, rotate: 6, duration: 1.4, stagger: 0.03 }, 0.1)
        .from('.fin-sub > span', { opacity: 0, y: 20, duration: 1.2, stagger: 0.15 }, 0.6)
        .from('.fin-cta', { opacity: 0, y: 20, duration: 1.2 }, 0.9)
    }, root)
    return () => ctx.revert()
  }, [])
  return (
    <section id="finale" ref={root} className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-space to-transparent" />
      <div className="fin-stage relative flex min-h-[115svh] flex-col items-center justify-end px-6 pb-[14vh] text-center">
        <p className="fin-kicker eyebrow mb-8 flex items-center gap-3">
          <Globe2 size={14} className="text-emerald" /> The closing chapter
        </p>
        <h2 className="fin-title text-[clamp(2.8rem,9.5vw,9.5rem)] font-semibold leading-[0.9] tracking-[-0.04em]">
          <span className="block"><SplitLetters text="THERE IS NO" /></span>
          <span className="block font-serif font-normal italic"><SplitLetters text="PLANET B." letterClass="text-gradient" /></span>
        </h2>
        <p className="fin-sub mt-8 flex flex-wrap justify-center gap-x-4 text-lg text-natural/75 sm:text-xl">
          <span>Explore.</span>
          <span>Appreciate.</span>
          <span className="text-emerald">Protect.</span>
        </p>
        <div className="fin-cta mt-12">
          <Magnetic onClick={() => scrollToId('hero')} className="btn-primary">
            Start your journey <ArrowUp size={15} />
          </Magnetic>
        </div>
      </div>
      <footer className="relative border-t border-natural/10 bg-space/70 px-6 py-10 backdrop-blur-md sm:px-10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-8 text-[0.7rem] uppercase tracking-[0.2em] text-natural/45 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-natural/80">
            <span className="css-globe h-5 w-5" />
            <span className="font-semibold tracking-[0.42em]">TERRA</span>
            <span className="text-natural/40">— The Living Planet</span>
          </div>
          <nav className="flex flex-wrap gap-6" aria-label="Footer">
            {[['Explore', 'journey'], ['Ecosystems', 'ecosystems'], ['Numbers', 'about'], ['Gallery', 'gallery']].map(([l, id]) => (
              <button key={id} onClick={() => scrollToId(id)} className="transition-colors hover:text-natural">{l}</button>
            ))}
          </nav>
          <p className="normal-case tracking-normal text-natural/35">Earth imagery: NASA Blue Marble · Photography: Unsplash</p>
        </div>
      </footer>
    </section>
  )
}
