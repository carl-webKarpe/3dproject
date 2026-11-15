// A tiny mutable store shared between the DOM (scroll / pointer) and the
// WebGL render loop. Values are read every frame, so no React re-renders.
export const SCENES = ['earth', 'ocean', 'forest', 'mountains', 'wildlife', 'human', 'protect']

export const store = {
  // current 3D scene + local progress inside it
  scene: 'earth', // one of SCENES or 'final'
  local: -1, // earth: [-1, 1] (hero → dive), others: [0, 1]
  covered: false, // true when opaque DOM sections hide the canvas
  intro: 0, // 0 → 1 once the loader has finished (earth scale-in)
  finalP: 0, // progress through the closing section
  mouse: { x: 0, y: 0 }, // normalised pointer [-1, 1]
  smooth: { x: 0, y: 0 }, // damped pointer
  isMobile: typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches,
  reducedMotion:
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  setFrameloop: null,
  lenis: null,
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const smooth = (t) => t * t * (3 - 2 * t)
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const range = (v, a, b) => clamp((v - a) / (b - a))
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt))

export function scrollToId(id) {
  const el = document.getElementById(id)
  if (!el) return
  if (store.lenis) store.lenis.scrollTo(el, { duration: 2.2 })
  else el.scrollIntoView({ behavior: 'smooth' })
}
