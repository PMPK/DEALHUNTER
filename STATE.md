# STATE

_Last updated: 2026-10-07 · dataset `0.1.0-seed`_

## What currently works
- Leaflet map of Zanzibar (OSM tiles) with 10 schematic area zones, 9 attraction markers, a dropped-pin tool.
- 5 independent overlays: Overall, Beach/Swimming, Infrastructure, Reality Warnings, Attractions.
  With all overlays off, neutral outlines remain so areas stay selectable.
- Area panel: 3 scores (each with confidence + verification badge), positives/negatives, warnings, airport
  distance, suitable-for, nearby attractions, hotels + DEMO offers, reasons, sources & evidence.
- Reality Explorer: Google Maps / Street View / Google Earth / satellite links (no API key) for zone centre,
  attraction, synthetic hotel or dropped pin.
- Tester mode: Accurate / Mostly accurate / Wrong / Not sure + note per area, localStorage, export JSON.
  "Wrong" displays the area as *disputed* locally.
- Compare view (two areas); responsive layout (stacked sheet on phones, side panel ≥900 px).
- `npm run validate` = typecheck + tests + production build, all passing.

## Known limitations
- **All scores, warnings and attractions are unverified editorial priors** from general knowledge — no
  source was checked (egress to e.g. UNESCO was blocked in the build environment, so nothing is `verified`).
- Island silhouette (`src/data/island.json`) is a hand-drawn rough outline so the map reads when tiles are blocked (e.g. inside the claude.ai Artifact, which blocks external images). Not survey-accurate.
- Export: also shown as copyable JSON on the Calibrate page because sandboxed embeds block file downloads.
- Zone polygons are schematic rounded rectangles, not real boundaries; attraction/hotel coordinates are approximate.
- Distance to airport is straight-line, not road distance or time.
- OSM public tile server is for light use only; map tiles need internet. Swap in `src/map/leaflet/tiles.ts`.
- At island-wide zoom, labels of neighbouring areas overlap (Nungwi/Kendwa, Bwejuu/Paje/Jambiani); zoom in.
  Chips collapse to a short form (O78▲?) below zoom 11.
- Feedback is per area only (not per score); no import of an exported file; no multi-device sync.
- Street View has patchy coverage in Zanzibar; the link falls back to the map.
- The Leaflet component itself is not unit-tested (jsdom has no layout); checked via browser smoke test only.
  Map tiles never loaded in the build sandbox (no egress), so tile rendering itself was not seen.

## Unfinished / not started
- Verification pass: replace "Editorial prior" evidence with real sources, then promote items to `verified`.
- Per-score tester corrections (e.g. "beach should be 40"); feedback import/merge tool.
- Real polygons (OSM-derived), more areas (Dongwe, Uroa, Fumba, Makunduchi), hotels from a real source.
- Deal Score algorithm; live offers; Pemba.
- Accessibility audit (map labels are keyboard-focusable via Leaflet; not screen-reader tested).

## Architectural decisions
- **Static SPA**: Vite + React + TS, `base: './'`, deployable from any static host. No backend.
- **Data ≠ UI**: JSON in `src/data`, pure logic in `src/domain` (no React/Leaflet imports), UI in `src/ui`.
- **Map provider seam**: `src/map/types.ts` is a provider-neutral contract (plain zones/markers/callbacks);
  `src/map/index.ts` picks the implementation; only `src/map/leaflet/*` imports Leaflet.
- **Honesty enforced in code**: `validateDataset` rejects verified-without-URL, bad ranges, non-synthetic hotels,
  non-demo offers; `scoreBand(null)` is "unknown"; positive feedback never upgrades verification.
- Overlay rendering: fill colour = first enabled score layer (Overall → Beach → Infra); a labelled chip per
  enabled layer; warnings use outline colour + count chip. Dashed outline = unverified.
- Dependencies kept minimal: react, react-dom, leaflet (+ vite/vitest/testing-library dev only).

## Next recommended action
Walk the areas, export the feedback JSON, then rewrite scores/warnings with real evidence (or lower confidence).
After that add per-score tester corrections so the next calibration round is more precise.
