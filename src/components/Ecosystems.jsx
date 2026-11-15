import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { ArrowUpRight, X } from 'lucide-react'
import { ecosystems } from '../lib/content'
import { store } from '../lib/store'
import { SectionLabel, SmartImage } from './ui'

function TiltCard({ eco, index, onOpen }) {
  const ref = useRef()
  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 150, damping: 18 })
  const sy = useSpring(my, { stiffness: 150, damping: 18 })
  const rotateY = useTransform(sx, [0, 1], [-10, 10])
  const rotateX = useTransform(sy, [0, 1], [8, -8])
  const imgX = useTransform(sx, [0, 1], ['-4%', '4%'])
  const imgY = useTransform(sy, [0, 1], ['-4%', '4%'])
  const glareX = useTransform(sx, [0, 1], ['0%', '100%'])
  const glareY = useTransform(sy, [0, 1], ['0%', '100%'])
  const glare = useTransform([glareX, glareY], ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.22), transparent 55%)`)

  const move = (e) => {
    const r = ref.current.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width)
    my.set((e.clientY - r.top) / r.height)
  }
  const leave = () => {
    mx.set(0.5)
    my.set(0.5)
  }

  return (
    <div className="eco-card [perspective:1200px]" style={{ '--d': index }}>
      <motion.article
        ref={ref}
        onPointerMove={move}
        onPointerLeave={leave}
        onClick={() => onOpen(eco)}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-[1.75rem] border border-natural/10 bg-forest/40 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]"
        data-cursor="hover"
        data-cursor-label="Explore"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(eco)}
        aria-label={`Explore ${eco.name}`}
      >
        <motion.div layoutId={`eco-img-${eco.id}`} className="absolute -inset-[6%]" style={{ x: imgX, y: imgY }}>
          <SmartImage src={eco.src} alt={eco.name} tone={eco.tone} className="h-full w-full" imgClassName="scale-105 transition-transform duration-[1.6s] ease-out-expo group-hover:scale-115" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#030504] via-[#030504]/30 to-transparent" />
        <motion.div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: glare }} />
        <div className="absolute left-6 top-6 flex items-center gap-3 [transform:translateZ(40px)]">
          <span className="font-mono text-[0.68rem] text-natural/70">0{index + 1}</span>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: eco.accent, boxShadow: `0 0 12px ${eco.accent}` }} />
        </div>
        <div className="absolute inset-x-0 bottom-0 p-6 [transform:translateZ(60px)] sm:p-7">
          <div className="mb-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight" style={{ color: eco.accent }}>{eco.stat[0]}</span>
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-natural/60">{eco.stat[1]}</span>
          </div>
          <h3 className="font-serif text-[2rem] italic leading-none sm:text-[2.3rem]">{eco.name}</h3>
          <p className="mt-3 text-sm text-natural/70">{eco.short}</p>
          <div className="mt-6 flex items-center justify-between border-t border-natural/15 pt-4">
            <span className="text-[0.68rem] uppercase tracking-[0.24em] text-natural/80">Explore</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-natural/25 transition-all duration-500 group-hover:rotate-45 group-hover:border-emerald group-hover:bg-emerald group-hover:text-space">
              <ArrowUpRight size={16} />
            </span>
          </div>
        </div>
      </motion.article>
    </div>
  )
}

function Detail({ eco, onClose }) {
  useEffect(() => {
    store.lenis?.stop()
    const key = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => {
      store.lenis?.start()
      window.removeEventListener('keydown', key)
    }
  }, [onClose])
  return (
    <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={eco.name}
        className="relative grid max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-natural/10 bg-[#07100c] md:grid-cols-2"
        initial={{ y: 40, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 40, scale: 0.96 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div layoutId={`eco-img-${eco.id}`} className="relative h-56 md:h-auto">
          <SmartImage src={eco.src} alt={eco.name} tone={eco.tone} className="h-full w-full" />
        </motion.div>
        <div className="flex flex-col justify-between gap-10 overflow-y-auto p-8 sm:p-12">
          <div>
            <p className="eyebrow" style={{ color: eco.accent }}>Ecosystem</p>
            <h3 className="mt-4 font-serif text-5xl italic leading-none sm:text-6xl">{eco.name}</h3>
            <p className="mt-6 text-base leading-relaxed text-natural/75">{eco.desc}</p>
          </div>
          <div className="flex items-end justify-between border-t border-natural/10 pt-6">
            <div>
              <div className="text-5xl font-semibold tracking-tight" style={{ color: eco.accent }}>{eco.stat[0]}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em] text-natural/60">{eco.stat[1]}</div>
            </div>
            <button onClick={onClose} className="btn-ghost !px-4 !py-3" aria-label="Close">
              <X size={16} /> Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Ecosystems() {
  const root = useRef()
  const [open, setOpen] = useState(null)
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.eco-head .line-mask > span', {
        yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: '.eco-head', start: 'top 80%' },
      })
      gsap.from('.eco-card', {
        y: 120, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: { each: 0.08, grid: 'auto' },
        scrollTrigger: { trigger: '.eco-grid', start: 'top 85%' },
      })
    }, root)
    return () => ctx.revert()
  }, [])
  return (
    <section id="ecosystems" ref={root} className="relative bg-space px-6 py-28 sm:px-10 sm:py-40">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-40 bg-gradient-to-b from-transparent to-space" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_80%_0%,rgba(18,59,42,0.6),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1400px]">
        <div className="eco-head mb-16 grid gap-10 md:mb-24 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <SectionLabel index="08">Explore Ecosystems</SectionLabel>
            <h2 className="mt-8 text-[clamp(2.6rem,6vw,5.6rem)] font-semibold leading-[0.95] tracking-[-0.03em]">
              <span className="line-mask"><span className="block">Six worlds.</span></span>
              <span className="line-mask"><span className="block font-serif font-normal italic text-gradient">One living system.</span></span>
            </h2>
          </div>
          <p className="max-w-md text-natural/65 md:justify-self-end">
            From canopy to coral, every ecosystem is a chapter of the same story. Hover to feel the depth — open any card to explore further.
          </p>
        </div>
        <div className="eco-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ecosystems.map((eco, i) => (
            <TiltCard key={eco.id} eco={eco} index={i} onOpen={setOpen} />
          ))}
        </div>
      </div>
      <AnimatePresence>{open && <Detail eco={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </section>
  )
}
