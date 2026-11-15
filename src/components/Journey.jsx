import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, MapPin } from 'lucide-react'
import { chapters } from '../lib/content'
import { scrollToId } from '../lib/store'
import { Magnetic, SmartImage } from './ui'

gsap.registerPlugin(ScrollTrigger)

export const CHAPTER_VH = 170

function Meta({ items }) {
  if (!items?.length) return null
  return (
    <dl className="cap-meta mt-8 flex flex-wrap gap-x-10 gap-y-4">
      {items.map(([k, v]) => (
        <div key={k} className="cap-meta-item">
          <dt className="text-[0.62rem] uppercase tracking-[0.28em] text-natural/45">{k}</dt>
          <dd className="mt-1 font-sans text-xl font-medium tabular-nums text-natural sm:text-2xl">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Caption({ c, i }) {
  const isProtect = c.id === 'protect'
  if (isProtect) {
    return (
      <div className={`cap cap-${i} absolute inset-0 flex flex-col items-center justify-center px-6 text-center`}>
        <p className="cap-kicker eyebrow mb-8 text-emerald">
          {c.index} — {c.kicker}
        </p>
        <h2 className="font-sans text-[clamp(2.4rem,7vw,6.6rem)] font-semibold uppercase leading-[0.92] tracking-[-0.03em]">
          <span className="line-mask"><span className="cap-line block">The future of Earth</span></span>
          <span className="line-mask"><span className="cap-line block font-serif font-normal italic normal-case text-gradient">is in our hands.</span></span>
        </h2>
        <p className="cap-text mx-auto mt-8 max-w-xl text-base leading-relaxed text-natural/70 sm:text-lg">{c.text}</p>
        <div className="cap-extra mt-10 flex flex-wrap justify-center gap-4">
          <Magnetic onClick={() => scrollToId('ecosystems')} className="btn-primary">
            Explore ecosystems <ArrowRight size={15} />
          </Magnetic>
          <Magnetic onClick={() => scrollToId('about')} className="btn-ghost">
            Earth in numbers
          </Magnetic>
        </div>
      </div>
    )
  }
  return (
    <div className={`cap cap-${i} absolute inset-0`}>
      <div className={`mx-auto flex h-full max-w-[1400px] flex-col justify-end px-6 pb-[12vh] sm:px-10 md:pb-0 ${c.id === 'wildlife' ? 'md:justify-start md:pt-[17vh]' : 'md:justify-center'}`}>
        <div className={`max-w-xl ${c.id === 'wildlife' ? 'wildlife-copy' : ''}`}>
          <p className="cap-kicker eyebrow mb-6 flex items-center gap-3">
            <span className="font-mono text-emerald">{c.index}</span>
            <span className="h-px w-8 bg-natural/30" />
            {c.kicker}
          </p>
          <h2 className="text-[clamp(2.5rem,6.4vw,5.8rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
            <span className="line-mask"><span className="cap-line block">{c.title[0]}</span></span>
            <span className="line-mask"><span className="cap-line block font-serif font-normal italic">{c.title[1]}</span></span>
          </h2>
          <p className="cap-text mt-6 max-w-md text-[0.98rem] leading-relaxed text-natural/75 sm:text-[1.05rem]">{c.text}</p>
          <div className={c.id === 'wildlife' ? 'md:hidden' : ''}>
            <Meta items={c.meta} />
          </div>
        </div>
      </div>
      {c.id === 'wildlife' && (
        <div className="cap-extra pointer-events-auto absolute bottom-[6vh] left-0 right-0 hidden md:block">
          <div className="cap-rail flex w-max gap-5 pl-[52vw]">
            {c.cards.map((card) => (
              <figure key={card.name} className="group relative h-[30vh] w-[20vh] shrink-0 overflow-hidden rounded-2xl border border-natural/10 shadow-2xl" data-cursor="hover">
                <SmartImage src={card.src} alt={card.name} tone={card.tone} className="h-full w-full" imgClassName="transition-transform duration-[1.4s] ease-out-expo group-hover:scale-110" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="font-serif text-xl italic">{card.name}</div>
                  <div className="mt-1 flex items-center gap-1 text-[0.62rem] uppercase tracking-[0.2em] text-natural/60">
                    <MapPin size={10} /> {card.place}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
      {c.id === 'human' && (
        <div className="cap-extra absolute bottom-[10vh] right-[4vw] hidden gap-4 lg:flex">
          {c.cards.map((card, k) => (
            <figure key={card.name} className={`human-card relative h-44 w-36 overflow-hidden rounded-2xl border border-natural/10 ${k === 1 ? '-translate-y-10' : ''}`}>
              <SmartImage src={card.src} alt={card.name} tone={card.tone} className="h-full w-full" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-[0.62rem] uppercase tracking-[0.24em]">
                {card.name}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Journey({ started }) {
  const root = useRef()
  useEffect(() => {
    if (!started) return
    const ctx = gsap.context(() => {
      gsap.set('.cap', { autoAlpha: 0 })
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      chapters.forEach((c, i) => {
        const sel = `.cap-${i}`
        const inAt = i + (i === 0 ? 0.04 : 0.14)
        tl.set(sel, { autoAlpha: 1 }, inAt - 0.001)
        tl.fromTo(`${sel} .cap-kicker`, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.12 }, inAt)
        tl.fromTo(`${sel} .cap-line`, { yPercent: 110 }, { yPercent: 0, duration: 0.18, stagger: 0.04 }, inAt + 0.02)
        tl.fromTo(`${sel} .cap-text`, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.16 }, inAt + 0.08)
        if (c.meta?.length) tl.fromTo(`${sel} .cap-meta-item`, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.12, stagger: 0.03 }, inAt + 0.12)
        if (c.id === 'wildlife') {
          tl.fromTo(`${sel} .cap-rail`, { x: '10vw' }, { x: () => -(document.querySelector('.cap-rail')?.scrollWidth || 1400) * 0.55, ease: 'none', duration: 0.8 }, i + 0.08)
        }
        if (c.id === 'human') tl.fromTo(`${sel} .human-card`, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.18, stagger: 0.05 }, inAt + 0.1)
        if (c.id === 'protect') tl.fromTo(`${sel} .cap-extra`, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.15 }, inAt + 0.16)
        if (i < chapters.length - 1) {
          const outAt = i + 0.8
          tl.to(`${sel} .cap-line`, { yPercent: -110, duration: 0.12, stagger: 0.02, ease: 'power2.in' }, outAt)
          tl.to([`${sel} .cap-kicker`, `${sel} .cap-text`, `${sel} .cap-meta`, `${sel} .cap-extra`], { opacity: 0, y: -20, duration: 0.1, ease: 'power2.in' }, outAt)
          tl.set(sel, { autoAlpha: 0 }, i + 0.97)
        }
      })
      tl.set({}, {}, chapters.length) // pad timeline to the full length
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        animation: tl,
      })
    }, root)
    return () => ctx.revert()
  }, [started])

  return (
    <section id="journey" ref={root} className="relative" style={{ height: `${chapters.length * CHAPTER_VH}vh` }}>
      {chapters.map((c, i) => (
        <span key={c.id} id={`chapter-${c.id}`} className="pointer-events-none absolute left-0 h-px w-px" style={{ top: `${((i + 0.42) / chapters.length) * 100}%` }} />
      ))}
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(5,8,7,0.7)_0%,rgba(5,8,7,0.2)_45%,transparent_65%)] max-md:bg-[linear-gradient(0deg,rgba(5,8,7,0.85)_0%,rgba(5,8,7,0.3)_50%,transparent_75%)]" />
        {chapters.map((c, i) => (
          <Caption key={c.id} c={c} i={i} />
        ))}
      </div>
    </section>
  )
}
