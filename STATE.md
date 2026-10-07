# STATE

_Last updated: 2026-10-07 · shipped dataset `0.0.0-empty`_

## What currently works
- **Data architecture ready for an evidence-backed dataset.** Six separate files (`meta.json`, `areas.geojson`, `beaches.geojson`, `attractions.json`,
  `hotels.json`, `reality-evidence.json`), validated on load; problems are listed in the app's *Dataset* panel. Run against any directory with `ZR_DATASET_DIR`.
- **Real-geometry model:** Polygon/MultiPolygon areas with `subzone` children (inherit parent evidence only when they have none, and say so), beaches as lines/polygons.
- **Six layers + hotels marker toggle**, all independent. Unknown renders as "n/a" / grey / dashed; fill is never a made-up band.
- **Evidence model:** every assessment/warning/observation/radius analysis carries confidence, verificationStatus, sourceType (external-source / first-hand-user / derived / unknown),
  reasons, evidence, lastUpdated. Validator forbids scores without evidence/reasons/known source and `verified` without a URL. Competing assessments are all kept; first-hand-user never outranks external evidence.
- **Local reality panel** for areas, sub-zones, beaches, hotels, attractions and dropped pins: 4 score dimensions, warnings (category + severity), 9 local topics,
  250 m / 500 m / 1 km selector with map circle, radius-analysis slot, derived context (containing polygons, attractions within radius, airport distance if configured).
- **Reality Explorer** (Google Maps, Street View, Earth, satellite) for any selection or dropped pin — works even with an empty dataset.
- **Tester mode:** per-feature × per-dimension (overall, beach, infrastructure, surroundings, warnings) rating + note → localStorage v2 as `first-hand-user`; shown beside
  evidence (never edits it); export JSON v2 includes the dataset's claims at that moment; on-screen copyable JSON for sandboxed embeds.
- Compare view (two areas, dimension by dimension, "No evidence yet" where empty). Offers tab kept but **frozen** (own demo data, no link to Reality).
- `npm run validate`: typecheck + 98 tests + production build pass.

## Known limitations
- **The shipped dataset is empty on purpose:** no geometry, scores, warnings, attractions, hotels or airport. The map shows only OSM tiles until data is supplied.
- Automated surroundings analysis (250/500/1000 m) is **not implemented**; only the data slot, radius UI and a few derived facts (attractions within radius, containing polygons).
- Dropped pins cannot receive tester feedback (no dataset claim to judge); feedback targets areas, sub-zones and beaches only.
- Hotels/attractions have no per-dimension scores; assessments can target them in data, but the map colours areas/beaches only.
- Polygon labels/selection points use the bounding-box centre (can fall outside concave shapes); labels of tiny sub-zones appear only at zoom ≥ 13.
- Public OSM tiles are for light use only (`src/map/leaflet/tiles.ts`); tiles do not load inside the claude.ai Artifact sandbox.
- v1 per-area feedback is not migrated.

## Placeholder / non-evidence values still in the repo
- `meta.json` `mapBounds` / `sanityBounds`: rough viewport and sanity boxes typed from general knowledge — navigation hints, not data; replace when real bounds are known.
- `src/frozen/offers/*`: invented demo offers and hotels (frozen, unlinked).
- `src/test/fixtures/*`: fictional geometry near 0°,0° and invented evidence, test-only.
- All earlier seed scores/zones/attractions/hotels/island outline were **removed** (they came from memory, not sources).

## Architectural decisions
- Data ≠ code: a test fails if UI/domain/map code contains coordinate literals, place names or Zanzibar claims.
- Claims are separate records pointing at features (`target: {kind,id}`), so geometry and evidence can be supplied independently and evidence can come from multiple sources.
- Map provider seam: `src/map/types.ts` (plain shapes/markers/callbacks); only `src/map/leaflet/*` imports Leaflet.
- Tester truth is a distinct evidence class, stored apart from the dataset and exported with the dataset claims for later ingestion.

## Next recommended action
Supply the researched dataset in the six-file format (see DATA_MODEL.md), run `ZR_DATASET_DIR=… npm run dev`, fix whatever the Dataset panel reports, then walk the places with Tester mode.
