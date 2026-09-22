# Reusable overlay components

Adapted from the component categories on pages 6–7 of Ryan's supplied guide. Apply only the categories the actual video needs. These are production checks, not a request to generate a whole library.

## Discover and retain

Use the catalog linked by the current project's notes/router, or an existing shared catalog explicitly selected for that project. If none exists, create `elements/catalog.json` and `elements/index.html` inside the composition project when the first reusable piece is retained. Link that location from the delivery note so the next run can find it. Do not assume this skill folder is the asset library.

Each catalog entry contains `id`, `name`, `category`, `source_path`, `preview_path`, `editable_values`, `when_to_use`, `provenance`, `license`, and `approval_state` (`candidate`, `approved`, or `rejected`). Use paths relative to the catalog folder. Record the actual approval reference when marking approved. Store generation prompt/settings beside generated assets when available; never store credentials. Unknown license terms remain unknown.

The index reads the catalog, previews images/video, allows audio audition and links to editable sources. Show category and approval state; candidates must not appear as approved. Verify that paths resolve and previews play before delivery. An element catalog supports reuse; it does not replace registration of finished media in AgentVault Generations.

## Standards by component

| Component | Editable controls and acceptance evidence |
| --- | --- |
| Cut-out graphics | Use actual alpha when transparency is required; inspect edges on light and dark backing and at final display size. Keep subjects uncropped. Keep captions and labels outside the raster. |
| Icons | Use a consistent grid and stroke/shape language; expose color controls where appropriate. Inspect at the intended small size on both backgrounds. Pixel art need not be forced into outline-only icons. |
| Infographics | Use separately identified HTML/SVG parts, editable copy/colors, and independently retimable reveals. Reveal ideas in spoken order and verify labels remain readable over footage. |
| Hero text/numbers | Expose text, value, unit, alignment and timing. Show only supported values; retain qualifiers such as “thousands.” Count up only when it helps explain the point. |
| Motion recipes | Name recipes and expose duration, easing, distance and direction. Derive state from composition time so seeking to the same point reproduces the same frame; avoid uncontrolled timers/randomness. Verify entry, settled hold and exit. |
| Backgrounds | Expose colors/density/speed and drive motion from the timeline. Keep contrast and motion subordinate to captions and footage. |
| Layouts | Expose spacing, corners and footage/caption safe regions. Verify the requested aspect ratio; build alternate ratios only when needed. Browser frames and split screens must preserve readable source content. |
| 3D objects | Use real geometry only when the brief benefits from it; retain editable source, named material and GLB when produced. Check silhouette and lighting. If a transparent video is required, test alpha in the target renderer before promising that format. |
| Music/SFX | Add only when the brief calls for them. Record source/license and measured duration; expose gain/fades and timing. Audition against original speech for masking and clipping. Preserve original-audio timing. |
| B-roll | Add only when requested or within the agreed treatment. Retain source or generation provenance; match context and do not imply synthetic imagery documents a real event. Replacing or trimming original footage requires scope that permits it. |

Keep a preview of the actual retained component, not a stock placeholder. Start with the caption, callout, diagram or layout needed now; add variants after viewing feedback establishes which ones are useful.
