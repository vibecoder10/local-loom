# Eight-reel spotlight reuse

Use the included eight-reel HTML for "eight reels", "two-row reel grid", "reel wall" or "spotlight showcase" requests. Preserve the approved composition instead of rebuilding its motion from a description.

1. Copy the template to a dedicated video folder as index.html. Keep the skill master unchanged.
2. Provide local GSAP at assets/vendor/gsap.min.js and a licensed Outfit font at assets/fonts/outfit.woff2. Reuse configured common assets or install these dependencies through the normal project workflow. They are not bundled in the portable template.
3. The portable background is a subtle CSS dot pattern in the light beige palette. When available, use the project's generated dot wallpaper as the background image. Keep all required assets local and record them in ASSETS.json.
4. Keep eight portrait placeholders in two rows of four on a 1920 x 1080 canvas. The default order is 1,3,7,2,8,4,6,5. Each card moves to centre, enlarges with its aspect preserved, holds, then returns to its exact slot.
5. Edit SETTINGS for timing and order: 0.4-second entrance and return, 1.6-second hold, 0.2-second gap, 0.7-second opening and closing holds, and 30 px moving blur. Default duration is 22.2 seconds. If timing changes, update the root data-duration to match template.duration(). Keep the sharp acceleration and deceleration and crisp settled frames.
6. Keep the order fixed for export. Shuffle uses a seeded generator and must run only on an explicit preview action. Keep preview controls outside the composition; the existing postMessage bridge accepts toggle, restart, seek and shuffle commands.
7. Use placeholders until real clips are requested. For clips, keep a media manifest with source, trim and featured time; let HyperFrames own media playback. Replace placeholder content inside .frame-inner while preserving the card wrapper and geometry.
8. Validate dependencies, eight unique cards, order, centre aspect ratio, exact returns and forward/backward seeking headlessly. Check the actual export when rendering is requested. Return links or screenshots; never open HTML or Studio automatically.

Acceptance examples: "Make an eight-reel wall" selects this template; "Use my clips in the two-row grid" replaces inner content while preserving motion; "Give me screenshots of the spotlight showcase" produces stills without rendering or opening tabs.
