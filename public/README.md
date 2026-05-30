# Public assets

## Letterhead / brand header

The club letterhead is rendered as a **live component** —
`src/components/site/BrandHeader.tsx` — not a flat image. It shows above the
main navigation on every public page. Edit the `CLUB` block in that file to
update the office bearers, Lions year, club number, district/region/zone, etc.

## Brand logos used by the header

The header references two logo files from this folder:

| File | Position | Artwork |
| --- | --- | --- |
| `logo-lions.png` | left | Lions Club International crest (gold disc, twin lion heads, central "L") |
| `logo-rising-star.png` | right | Club "Rising Star" diya emblem — "3232 F1 • 2025-26 / SHINE FOR BETTER TOMORROW" |

**These two files are placeholders.** Replace them with the official artwork,
keeping the same filenames. Transparent-background PNG (or SVG) at roughly
square dimensions (≈400×400 or larger) gives the crispest result.

## Other assets

- `logo.png` — square lion-crest brand mark used by the nav, footer and admin
  headers (via `NEXT_PUBLIC_BRAND_LOGO_URL`, falling back to `/logo.png`).
