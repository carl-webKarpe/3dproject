import { useEffect, useState } from 'react'
import { chapters } from '../lib/content'
import { store } from '../lib/store'

// Animated globe navigation for the journey
export default function ChapterNav() {
  const [state, setState] = useState({ active: 0, visible: false })
  useEffect(() => {
    let raf
    let prev = ''
    const loop = () => {
      const idx = store.chapterIndex ?? 0
      const vis = !!store.inJourney
      const key = idx + ':' + vis
      if (key !== prev) {
        prev = key
        setState({ active: idx, visible: vis })
      }
      const bar = document.getElementById('chapter-progress')
      if (bar) bar.style.transform = `scaleY(${store.journeyP ?? 0})`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const go = (i) => {
    const el = document.getElementById('journey')
    if (!el) return
    const top = el.offsetTop + ((i + 0.42) / chapters.length) * (el.offsetHeight - window.innerHeight)
    store.lenis ? store.lenis.scrollTo(top, { duration: 2 }) : window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <aside
      className={`fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 transition-all duration-700 ease-out-expo sm:right-8 md:block ${
        state.visible ? 'opacity-100 translate-x-0' : 'pointer-events-none translate-x-6 opacity-0'
      }`}
      aria-label="Journey chapters"
    >
      <div className="flex flex-col items-end gap-5">
        <div className="mb-2 flex items-center gap-3">
          <span className="font-mono text-[0.68rem] tracking-[0.2em] text-natural/60">
            <span className="text-natural">{chapters[state.active].index}</span> / 07
          </span>
          <span className="css-globe h-7 w-7" style={{ animationDuration: '12s' }} />
        </div>
        <div className="relative flex flex-col items-end gap-4">
          <div className="absolute right-[3px] top-1 bottom-1 w-px bg-natural/10">
            <div id="chapter-progress" className="h-full w-full origin-top scale-y-0 bg-emerald/70" />
          </div>
          {chapters.map((c, i) => (
            <button key={c.id} onClick={() => go(i)} className="group relative flex items-center gap-3" aria-label={`Go to ${c.kicker}`} aria-current={i === state.active}>
              <span
                className={`text-[0.62rem] uppercase tracking-[0.24em] transition-all duration-500 ${
                  i === state.active ? 'text-natural opacity-100' : 'translate-x-2 text-natural/60 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                }`}
              >
                {c.kicker}
              </span>
              <span
                className={`relative block h-[7px] w-[7px] rounded-full border transition-all duration-500 ${
                  i === state.active ? 'scale-125 border-emerald bg-emerald shadow-[0_0_12px_rgba(0,200,117,0.9)]' : 'border-natural/40 bg-space group-hover:border-natural'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
