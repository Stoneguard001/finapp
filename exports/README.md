# EvenKeel — logo asset pack

Brand colors (sRGB hex, converted from the master oklch values):

| Token | Hex | Use |
|-------|-----|-----|
| Ink (navy hull) | `#1b3043` | primary dark, headings, app-icon tile |
| Sea (teal) | `#04869c` | accent, "Keel", links, buttons |
| Sun (gold) | `#e1b446` | emblem only — warm accent |
| Paper | `#ffffff` | light backgrounds, knockouts |

## Vector (SVG) — scale to any size
- `mark-iron.svg` — single-color navy mark, transparent knockouts (use on any light bg)
- `mark-white.svg` — single-color white mark, transparent knockouts (use on dark bg/photos)
- `app-icon.svg` — navy rounded tile + white mark (the app icon)
- `app-icon-light.svg` — white tile + navy mark (for dark headers)
- `favicon.svg` — same as app icon, for the browser tab
- `emblem-color.svg` — full-color sun emblem (kept "in pocket")

## Raster (PNG) — fixed sizes where SVG isn't practical
App icon / favicon (square):
- `app-icon-1024.png`, `app-icon-512.png`, `app-icon-180.png` (iOS), `app-icon-120.png`
- `favicon-32.png`, `favicon-16.png`
- `app-icon-light-1024.png`

Wordmark lockups (mark + "EvenKeel", Hanken Grotesk — rasterized so the font travels):
- `lockup-light.png` — on white, 733×240
- `lockup-dark.png` — on navy, 733×240

Other marks:
- `mark-iron-512.png`, `mark-white-512.png`, `emblem-color-512.png`, `emblem-color-1024.png`

## Notes
- The wordmark font is **Hanken Grotesk** (700). For editable/vector wordmark text, set type in Hanken Grotesk Bold with letter-spacing ≈ -0.015em; color "Even" `#1b3043` and "Keel" `#04869c`.
- For favicon, link `favicon.svg` (modern browsers) with `favicon-32.png` / `favicon-16.png` fallbacks.
