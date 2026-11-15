import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { scrollToId, store } from '../lib/store'
import { Magnetic } from './ui'

const links = [
  { label: 'Home', id: 'hero' },
  { label: 'Explore', id: 'journey' },
  { label: 'Ecosystems', id: 'ecosystems' },
  { label: 'Wildlife', id: 'chapter-wildlife' },
  { label: 'About', id: 'about' },
]

export default function Nav({ visible }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const last = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 40)
      setHidden(y > last.current + 4 && y > 400)
      if (y < last.current - 4) setHidden(false)
      last.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (open) store.lenis?.stop()
    else store.lenis?.start()
  }, [open])

  const go = (id) => {
    setOpen(false)
    setTimeout(() => scrollToId(id), open ? 450 : 0)
  }

  return (
    <>
      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={visible ? { y: hidden && !open ? -110 : 0, opacity: 1 } : { y: -40, opacity: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6 sm:pt-5"
      >
        <nav
          className={`mx-auto flex max-w-[1400px] items-center justify-between rounded-full py-2.5 pl-5 pr-2.5 transition-all duration-700 sm:pl-7 ${
            scrolled ? 'glass' : 'border border-transparent'
          }`}
          aria-label="Primary"
        >
          <button onClick={() => go('hero')} className="flex items-center gap-3" data-cursor="hover" aria-label="TERRA home">
            <span className="css-globe h-6 w-6" style={{ animationDuration: '30s' }} />
            <span className="text-[0.95rem] font-semibold tracking-[0.42em]">
              TER<span className="text-emerald">RA</span>
            </span>
          </button>
          <ul className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <li key={l.id}>
                <button
                  onClick={() => go(l.id)}
                  className="group relative rounded-full px-4 py-2 text-[0.8rem] tracking-wide text-natural/70 transition-colors hover:text-natural"
                >
                  {l.label}
                  <span className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-emerald transition-transform duration-500 ease-out-expo group-hover:scale-x-100" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Magnetic onClick={() => go('journey')} className="hidden items-center gap-2 rounded-full bg-natural/10 px-5 py-2.5 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-natural transition-colors hover:bg-emerald hover:text-space sm:flex">
              Start Exploring <ArrowUpRight size={14} />
            </Magnetic>
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-natural/10 md:hidden"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col justify-between bg-space/95 px-6 pb-10 pt-28 backdrop-blur-xl md:hidden"
            initial={{ clipPath: 'circle(0% at 92% 6%)' }}
            animate={{ clipPath: 'circle(150% at 92% 6%)' }}
            exit={{ clipPath: 'circle(0% at 92% 6%)' }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          >
            <ul className="space-y-2">
              {links.map((l, i) => (
                <li key={l.id} className="overflow-hidden">
                  <motion.button
                    onClick={() => go(l.id)}
                    className="flex w-full items-baseline gap-4 py-2 text-left"
                    initial={{ y: '110%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '110%' }}
                    transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="font-mono text-xs text-emerald">0{i + 1}</span>
                    <span className="font-serif text-5xl italic">{l.label}</span>
                  </motion.button>
                </li>
              ))}
            </ul>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.6 } }} exit={{ opacity: 0 }} className="eyebrow">
              One planet · Infinite wonders
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
