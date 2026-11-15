# TERRA — The Living Planet

An immersive, scroll-driven 3D journey across Earth: from orbit, into the ocean, through a rainforest, over the mountains, across a savanna at sunset, back to the night side of the planet and out into space.

## Stack

React 19 · Vite · Tailwind CSS v4 · Three.js + React Three Fiber · GSAP ScrollTrigger · Lenis · Framer Motion · Lucide

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## How it works

- **One fixed WebGL canvas** (`src/three/Experience.jsx`) is lazy-loaded behind the loader. It hosts every scene; only the active one is visible and updated.
- **Scroll → scene mapping** lives in `src/App.jsx`. The journey section is split into 7 chapters; scroll progress sets `store.scene` and `store.local` (0–1 within a chapter), which each scene reads every frame to drive its camera path. A colour "veil" dips between chapters to hide the cut.
- **Captions** (`src/components/Journey.jsx`) are one GSAP timeline scrubbed against the same scroll range, so text and 3D stay in sync.
- When the opaque content sections cover the screen, rendering pauses (`frameloop = 'never'`).

### Scenes (`src/three/`)

| Scene | What's in it |
| --- | --- |
| `Earth.jsx` | Custom day/night shader (NASA Blue Marble + city lights), normal map, ocean specular, cloud layer with shadows, atmospheric scattering rim, animated city arcs (`CityArcs.jsx`) |
| `Starfield.jsx` | Twinkling star points + faint procedural nebula |
| `OceanScene.jsx` | Animated water surface from below, god rays, caustics on the sea floor, swaying kelp, fish schools, a whale and a manta, marine snow and bubbles |
| `ForestScene.jsx` | Instanced rainforest (trunks, canopy, ferns, vines), light shafts, mist, falling leaves, pollen, butterflies, birds |
| `MountainScene.jsx` | Ridged-noise terrain with snow line, sea of clouds, billboard clouds, snowfall, gliding eagles |
| `WildlifeScene.jsx` | Sunset savanna with layered ridges, acacias, grass, bird flocks in V formation, butterflies |

All environments are procedural; the only downloaded 3D assets are the Earth textures in `public/textures/` (NASA Blue Marble via three-globe / three.js examples).

## Notes

- Mobile gets lower particle counts, a 2K Earth texture and a capped pixel ratio.
- Browsers without WebGL get a CSS globe and per-chapter gradients (`Fallback.jsx`).
- Photography is loaded from the Unsplash CDN; every image falls back to an art-directed gradient if it can't load.
- `prefers-reduced-motion` slows the planet and disables decorative CSS loops.
