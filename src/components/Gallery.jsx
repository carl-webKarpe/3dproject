import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { gallery } from '../lib/content'
import { store } from '../lib/store'
import { SectionLabel, SmartImage } from './ui'

const cats = ['All', 'Landscapes', 'Wildlife', 'Oceans', 'Forests', 'Mountains', 'Planet Earth']

export default function Gallery() {
  const root = useRef()
  const [cat, setCat] = useState('All')
  const [idx, setIdx] = useState(null)
  const items = useMemo(() => (cat === 'All' ? gallery : gallery.filter((g) => g.cat === cat)), [cat])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.gal-head .line-mask > span', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.gal-head', start: 'top 80%' } })
    }, root)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.batch('.gal-item', {
        start: 'top 92%',
        onEnter: (els) =>
          gsap.fromTo(els, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', stagger: 0.08, overwrite: true }),
      })
      ScrollTrigger.refresh()
    }, root)
    return () => ctx.revert()
  }, [items])

  const close = useCallback(() => setIdx(null), [])
  const step = useCallback((d) => setIdx((i) => (i + d + items.length) % items.length), [items.length])
  useEffect(() => {
    if (idx === null) return
    store.lenis?.stop()
    const key = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', key)
    return () => {
      store.lenis?.start()
      window.removeEventListener('keydown', key)
    }
  }, [idx, close, step])

  return (
    <section id="gallery" ref={root} className="relative bg-space px-6 py-28 sm:px-10 sm:py-40">
      <div className="relative mx-auto max-w-[1400px]">
        <div className="gal-head mb-12 flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
          <div>
            <SectionLabel index="10">Nature Gallery</SectionLabel>
            <h2 className="mt-8 text-[clamp(2.6rem,6vw,5.6rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
              <span className="line-mask"><span className="block">Moments of</span></span>
              <span className="line-mask"><span className="block font-serif font-normal italic text-gradient">a living world.</span></span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter gallery">
            {cats.map((c) => (
              <button
                key={c}
                role="tab"
                aria-selected={cat === c}
                onClick={() => setCat(c)}
                className={`relative rounded-full px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] transition-colors duration-500 ${cat === c ? 'text-space' : 'text-natural/60 hover:text-natural'}`}
              >
                {cat === c && <motion.span layoutId="gal-pill" className="absolute inset-0 rounded-full bg-emerald" transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                <span className="relative">{c}</span>
              </button>
            ))}
          </div>
        </div>

        <motion.div layout className="grid auto-rows-[220px] grid-cols-2 gap-3 [grid-auto-flow:dense] sm:auto-rows-[260px] sm:gap-4 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {items.map((g, i) => (
              <motion.figure
                layout
                key={g.title}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className={`gal-item group relative cursor-pointer overflow-hidden rounded-2xl ${g.span === 'wide' ? 'col-span-2' : ''} ${g.span === 'tall' ? 'row-span-2' : ''}`}
                onClick={() => setIdx(i)}
                data-cursor="hover"
                data-cursor-label="View"
              >
                <SmartImage src={g.src} alt={g.title} tone={g.tone} className="h-full w-full" imgClassName="transition-transform duration-[1.6s] ease-out-expo group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-60 transition-opacity duration-700 group-hover:opacity-100" />
                <figcaption className="absolute inset-x-0 bottom-0 flex translate-y-2 items-end justify-between p-4 opacity-80 transition-all duration-700 group-hover:translate-y-0 group-hover:opacity-100 sm:p-5">
                  <span className="font-serif text-xl italic sm:text-2xl">{g.title}</span>
                  <span className="text-[0.6rem] uppercase tracking-[0.2em] text-natural/60">{g.cat}</span>
                </figcaption>
              </motion.figure>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {idx !== null && items[idx] && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={items[idx].title}>
            <button className="absolute inset-0" onClick={close} aria-label="Close" />
            <AnimatePresence mode="wait">
              <motion.div
                key={items[idx].title}
                className="relative h-[70vh] w-[min(90vw,1200px)] overflow-hidden rounded-3xl"
                initial={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <SmartImage src={items[idx].src.replace('w=1400', 'w=2200')} alt={items[idx].title} tone={items[idx].tone} className="h-full w-full" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-8">
                  <p className="eyebrow">{items[idx].cat}</p>
                  <p className="mt-2 font-serif text-4xl italic">{items[idx].title}</p>
                </div>
              </motion.div>
            </AnimatePresence>
            <button onClick={() => step(-1)} className="glass absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full sm:left-8" aria-label="Previous">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => step(1)} className="glass absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full sm:right-8" aria-label="Next">
              <ChevronRight size={20} />
            </button>
            <button onClick={close} className="glass absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full sm:right-8 sm:top-8" aria-label="Close">
              <X size={18} />
            </button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs text-natural/60">
              {String(idx + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
