# Porting 21st.dev Components to Hyperframes

When the user pastes a block starting with **"You are given a task to integrate an existing React component in the codebase"**  -  that's a 21st.dev install prompt. Recognize it instantly and follow the conversion playbook below.

## How to recognize the format

The prompt always has:
1. Codebase requirements (shadcn / Tailwind / TS)
2. A folder convention note (`/components/ui`)
3. A `.tsx` component code block
4. A `demo.tsx` code block
5. NPM dependencies list
6. "Implementation Guidelines" + "Steps to integrate" boilerplate

It's designed for coding agents to drop into a Next.js + shadcn project. We don't have one of those  -  we have Hyperframes. So the answer is **"yes, by porting to vanilla HTML+CSS+JS"**, not "let me set up shadcn".

## What stays vs what goes

| Aspect | 21st.dev React | Hyperframes |
|---|---|---|
| TSX components | rewrite as DOM-built-once + per-tick mutation | |
| Tailwind classes | replace with raw CSS | |
| `@/components/ui/*` imports | inlined | |
| `useState` / `useRef` | usually drop  -  Hyperframes is render-once-per-frame, no React state machinery |
| `useEffect` mount | move to top-level `<script>` block | |
| `useEffect` cleanup | drop  -  no unmount in a deterministic render | |
| `requestAnimationFrame` loop | **delete**  -  use `tl.eventCallback('onUpdate', ...)` instead | |
| Component props | hard-code as constants (rename if customizing later) | |
| `lucide-react` icons | inline SVG instead | |
| Unsplash images | host in `assets/` or use CSS gradients as placeholders | |
| `framer-motion` | replace with GSAP (`tl.from`, `tl.to`, `tl.fromTo`) | |

## NPM dependencies  -  how to handle each

| Dependency | Approach |
|---|---|
| `three` | CDN: `<script src="https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js"></script>` |
| `@remotion/player` / `remotion` | drop entirely  -  replace `useCurrentFrame()` with `tl.time()` (see `templates/remotion-port-template.html`) |
| `framer-motion` | replace with GSAP |
| `gsap` / `@gsap/*` | already CDN-loaded in the composition template |
| `lucide-react` | inline SVG paths from [lucide.dev/icons](https://lucide.dev/icons) |
| `react-three-fiber` | rewrite using vanilla Three.js (see `templates/shader-three-template.html`) |
| `@react-three/drei` | look up the underlying Three.js primitive and use it directly |
| `tailwindcss` / `clsx` / `tailwind-merge` | rewrite as inline CSS |

## The conversion pattern (5 steps)

1. **Identify the time/frame source.** Where does the animation know what time it is? Replace with `tl.time()`.
   - `useCurrentFrame()` → `tl.time() * FPS` (frames) or just `tl.time()` (seconds)
   - `requestAnimationFrame` accumulator → `tl.time() * SPEED` (pure function)
   - `Date.now() - startTime` → `tl.time() * 1000` (ms since start)

2. **Move the React JSX to DOM.** What does the component render? Express the static structure as HTML, the dynamic parts as JS that mutates `innerHTML` or `style` on every `tl.eventCallback('onUpdate')` tick.

3. **Decide which parts are static vs animated.**
   - Static (gradients, logos, layout): build once, leave alone
   - Animated (charts, counters, transforms): re-render in onUpdate
   - Avoid mutating things that don't change  -  DOM thrash slows render

4. **Replace prop-driven branches with constants.** A 21st.dev component has props like `panSpeed` / `accentColor`. Hard-code these to picked values at the top of the script. Make them easy to find for later iteration.

5. **Lint, preview, render.** Hyperframes' lint catches the gotchas  -  clip+inner-div, track collisions, deterministic logic, `class="clip"` requirements. If lint passes, the render will work.

## Worked examples in this kit

| 21st.dev component | Where | Key conversion |
|---|---|---|
| `infinite-bento-pan.tsx` (Remotion) | `templates/remotion-port-template.html` | `useCurrentFrame()` → `tl.time()`; per-card React → DOM-built-once + onUpdate mutation |
| `shader-animation.tsx` (Three.js) | `templates/shader-three-template.html` | `requestAnimationFrame` accumulator → `uniforms.time.value = tl.time() * SHADER_SPEED` |

Both ports are templated in this kit:
- `templates/remotion-port-template.html`
- `templates/shader-three-template.html`

## When to skip the port

If the source component is:
- An interactive UI (tabs, modals, forms)  -  Hyperframes is non-interactive
- A web app feature (auth, fetch, websocket)  -  deterministic only, no network
- A live data viz (real numbers from API)  -  bake the data in at build time

tell the user it doesn't fit Hyperframes' deterministic frame-seek model and offer alternatives (record a screencast, generate static frames + cross-fade, etc.).

## Response template when the user pastes a 21st.dev prompt

> Yes  -  port to vanilla HTML/JS. Three core conversions:
> 1. `useCurrentFrame()` / `requestAnimationFrame` → `tl.time()` driven via `tl.eventCallback('onUpdate')`
> 2. JSX → DOM-built-once + per-tick mutation
> 3. NPM dependencies → CDN where possible, inline where not
>
> Going to do it now. Will use `templates/[shader|remotion]-port-template.html` as the base.

Then execute. Don't waste a turn explaining shadcn setup that doesn't apply.
