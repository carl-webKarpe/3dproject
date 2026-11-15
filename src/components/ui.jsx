import { forwardRef, useRef, useState } from 'react'
import useMagnetic from '../hooks/useMagnetic'
import { tones } from '../lib/images'

export function Magnetic({ as: Tag = 'button', className = '', strength = 0.3, children, ...rest }) {
  const ref = useRef()
  useMagnetic(ref, strength)
  return (
    <Tag ref={ref} className={className} data-cursor="hover" {...rest}>
      {children}
    </Tag>
  )
}

// Letters wrapped in masks for staggered reveals
export function SplitLetters({ text, className = '', letterClass = '' }) {
  return (
    <span className={`inline-block ${className}`} aria-label={text}>
      {text.split(' ').map((word, wi, arr) => (
        <span key={wi} className="inline-block overflow-hidden whitespace-nowrap pb-[0.06em] -mb-[0.06em]" aria-hidden>
          {[...word].map((ch, i) => (
            <span key={i} className={`split-char inline-block will-change-transform ${letterClass}`}>
              {ch}
            </span>
          ))}
          {wi < arr.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  )
}

// Image with graceful gradient fallback + fade-in on load
export const SmartImage = forwardRef(function SmartImage({ src, alt, tone = 'forest', className = '', imgClassName = '', style, showAlt = false, ...rest }, ref) {
  const [state, setState] = useState('loading')
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={{ background: tones[tone] || tones.forest, ...style }} {...rest}>
      {state !== 'error' && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={`h-full w-full object-cover transition-opacity duration-1000 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
        />
      )}
      {state === 'error' && (
        <div className="grain absolute inset-0 flex items-end p-4">
          {showAlt && <span className="font-serif text-2xl italic text-natural/40">{alt}</span>}
        </div>
      )}
    </div>
  )
})

export function SectionLabel({ index, children }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-mono text-[0.7rem] tracking-[0.3em] text-emerald">{index}</span>
      <span className="h-px w-10 bg-natural/25" />
      <span className="eyebrow">{children}</span>
    </div>
  )
}
