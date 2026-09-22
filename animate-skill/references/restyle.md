# Restyle a RoboNuggets element or template to Ryan's style

RoboNuggets' files hard-code their ROBO palette (69 of about 106 text files, almost none through CSS variables). Restyling is a colour swap plus a visual check, done when you actually use an element.

| ROBO | Role | Ryan (What We Built) |
|---|---|---|
| `#f2efe8` | paper / canvas | `#D9DCDF` |
| `#faf8f2` | light card | `#EEF0F2` |
| `#1c1a16` | ink | `#161819` |
| `#131311` | black | `#161819` |
| `#e8e2d2` | cream (dividers, dim) | `#A7ADB2` |
| `#6f6a5c` | muted | `#6D747A` |
| `#ff6b1a` | orange accent | `#E65D20` |

Also change by hand (the script cannot know): Outfit and Copernicus to Inter (500/800) and Pixelify Sans 700 (fonts in `~/AgentVault/Projects/animate/sample/assets/`); soft shadows and glows to hard offset shadows; any getrubric dot-wave background to flat wolf grey; RoboNuggets brand marks and "ROBO" agent icon out unless Ryan wants them.

## Steps

1. Copy the element or template into your video project first; never restyle the pack's original in place.
2. Dry run: `node ~/AgentVault/Skills/Personal/animate/scripts/restyle-colors.mjs <file-or-folder>` lists every colour it would change.
3. Apply: add `--write`. Case-insensitive; 3-digit forms are left alone and reported.
4. Fix fonts, shadows and background by hand, render a poster in both aspects, compare with the approved anchor.
5. If the restyled element is worth keeping, register it as a new library entry (`node library/register-asset.mjs entry.json` from the pack root) so the ROBO original stays intact.
