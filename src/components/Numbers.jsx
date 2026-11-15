import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { stats } from '../lib/content'
import { SectionLabel } from './ui'

function Counter({ value, decimals, suffix }) {
  const ref = useRef()
  useEffect(() => {
    const obj = { v: 0 }
    const tw = gsap.to(obj, {
      v: value,
      duration: 2.4,
      ease: 'expo.out',
      scrollTrigger: { trigger: ref.current, start: 'top 85%' },
      onUpdate: () => ref.current && (ref.current.textContent = obj.v.toFixed(decimals)),
    })
    return () => tw.kill()
  }, [value, decimals])
  return (
    <span className="tabular-nums">
      <span ref={ref}>{(0).toFixed(decimals)}</span>
      <span className="text-emerald">{suffix}</span>
    </span>
  )
}

function Ring({ pct, color = '#00C875' }) {
  const ref = useRef()
  const r = 44
  const c = 2 * Math.PI * r
  useEffect(() => {
    const tw = gsap.fromTo(ref.current, { strokeDashoffset: c }, {
      strokeDashoffset: c * (1 - pct / 100), duration: 2.4, ease: 'expo.out',
      scrollTrigger: { trigger: ref.current, start: 'top 85%' },
    })
    return () => tw.kill()
  }, [pct, c])
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 -rotate-90" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(244,247,242,0.08)" strokeWidth="3" />
      <circle ref={ref} cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
    </svg>
  )
}

const eras = [
  { name: 'Hadean', w: 11.9, c: '#3a1f12' },
  { name: 'Archean', w: 33, c: '#6b3b1f' },
  { name: 'Proterozoic', w: 43.2, c: '#0b5d91' },
  { name: 'Phanerozoic', w: 11.9, c: '#00C875' },
]
function Timeline() {
  const [hover, setHover] = useState(null)
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {eras.map((e) => (
          <div
            key={e.name}
            onPointerEnter={() => setHover(e)}
            onPointerLeave={() => setHover(null)}
            className="era-seg h-full origin-left transition-[filter] duration-300 hover:brightness-150"
            style={{ width: `${e.w}%`, background: e.c }}
            data-cursor="hover"
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[0.62rem] uppercase tracking-[0.2em] text-natural/50">
        <span>{hover ? hover.name : '4.54B years ago'}</span>
        <span>{hover ? `${hover.w}% of history` : 'Today'}</span>
      </div>
    </div>
  )
}

function SpeciesGrid() {
  const [mode, setMode] = useState('described')
  const lit = mode === 'described' ? 24 : 100
  return (
    <div>
      <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[5px]">
        {Array.from({ length: 100 }, (_, i) => (
          <span
            key={i}
            className="aspect-square rounded-full transition-all duration-700"
            style={{
              background: i < lit ? '#00C875' : 'rgba(244,247,242,0.12)',
              boxShadow: i < lit ? '0 0 6px rgba(0,200,117,0.7)' : 'none',
              transitionDelay: `${(i % 20) * 12}ms`,
            }}
          />
        ))}
      </div>
      <div className="mt-4 inline-flex rounded-full border border-natural/15 p-1 text-[0.62rem] uppercase tracking-[0.18em]">
        {['described', 'estimated'].map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1.5 transition-colors ${mode === m ? 'bg-emerald text-space' : 'text-natural/60 hover:text-natural'}`}>
            {m}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Numbers() {
  const root = useRef()
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.num-head .line-mask > span', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.num-head', start: 'top 80%' } })
      gsap.from('.num-card', { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.num-grid', start: 'top 85%' } })
      gsap.from('.era-seg', { scaleX: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.num-grid', start: 'top 80%' } })
    }, root)
    return () => ctx.revert()
  }, [])
  const viz = {
    age: <Timeline />,
    species: <SpeciesGrid />,
    ocean: <Ring pct={71} color="#3BA7E0" />,
    forest: <Ring pct={31} />,
  }
  return (
    <section id="about" ref={root} className="relative overflow-hidden bg-space px-6 py-28 sm:px-10 sm:py-40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_10%_60%,rgba(11,93,145,0.25),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1400px]">
        <div className="num-head mb-16 md:mb-24">
          <SectionLabel index="09">Earth in Numbers</SectionLabel>
          <h2 className="mt-8 max-w-4xl text-[clamp(2.6rem,6vw,5.6rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
            <span className="line-mask"><span className="block">A planet measured</span></span>
            <span className="line-mask"><span className="block font-serif font-normal italic text-gradient">in wonders.</span></span>
          </h2>
        </div>
        <div className="num-grid grid gap-px overflow-hidden rounded-[1.75rem] border border-natural/10 bg-natural/10 md:grid-cols-2">
          {stats.map((s) => (
            <div key={s.id} className="num-card group relative flex flex-col justify-between gap-10 bg-space p-8 transition-colors duration-700 hover:bg-[#08120d] sm:p-12">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="eyebrow">{s.label}</p>
                  <div className="mt-6 text-[clamp(3.4rem,7vw,6.2rem)] font-semibold leading-none tracking-[-0.04em]">
                    <Counter value={s.value} decimals={s.decimals} suffix={s.suffix} />
                  </div>
                  <p className="mt-2 text-sm uppercase tracking-[0.2em] text-natural/50">{s.unit}</p>
                </div>
                {(s.id === 'ocean' || s.id === 'forest') && viz[s.id]}
              </div>
              <div>
                {(s.id === 'age' || s.id === 'species') && <div className="mb-6">{viz[s.id]}</div>}
                <p className="max-w-sm text-sm leading-relaxed text-natural/60">{s.note}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[0.65rem] uppercase tracking-[0.2em] text-natural/35">Sources: USGS, Mora et al. 2011 (PLoS Biol.), NOAA, FAO Global Forest Resources Assessment 2020.</p>
      </div>
    </section>
  )
}
