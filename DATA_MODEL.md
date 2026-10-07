# Data model (contract for the external Zanzibar dataset)

Types: `src/domain/types.ts`. Validator: `src/domain/validate.ts` (runs on load; problems are shown in the app's
Dataset panel). Loader: `src/domain/dataset.ts`. **No Zanzibar fact lives in code.** All six files below are the data.

## Files (directory `src/data/`, or any directory via `ZR_DATASET_DIR=/path npm run dev|build`)
| File | Content |
|------|---------|
| `meta.json` | `datasetVersion`, `description`, `airport` (`null` if none → distances show *unknown*), `mapBounds` (initial viewport), `sanityBounds` (validator only). Order: `[south, west, north, east]`. |
| `areas.geojson` | FeatureCollection of **Polygon / MultiPolygon**. `properties`: `id`, `name`, `kind` (`area` \| `subzone`), `parentId` (`null` for `area`; an `area` id for `subzone`), optional `description`. Sub-zones let one town have parts with different quality. |
| `beaches.geojson` | FeatureCollection of LineString / MultiLineString / Polygon / MultiPolygon. `properties`: `id`, `name`, `areaId` (or `null`), optional `description`. |
| `attractions.json` | `[{ id, name, coordinates:[lat,lng], coordinatesApproximate, category, rating (null=unknown), description, source:{label,url?,note?}, verificationStatus, sourceType, lastUpdated }]` |
| `hotels.json` | Same point shape as attractions without category/rating/description; optional `synthetic` (fixtures only), `note`. |
| `reality-evidence.json` | `{ schemaVersion, assessments[], warnings[], observations[], radiusAnalyses[] }` — every claim about a place. Points at features by `target: { kind, id }`. |

GeoJSON uses `[lng, lat]`; JSON point files use `[lat, lng]`. The validator checks both against `sanityBounds`.

## Provenance (on every assessment, warning, observation, radius analysis)
```
confidence          0..1
verificationStatus  verified | unverified | disputed
sourceType          external-source | first-hand-user | derived | unknown
reasons[]           why
evidence[]          { label, url?, note? }
lastUpdated         YYYY-MM-DD
```
Validator rules: a **non-null score needs ≥1 reason, ≥1 evidence entry and a sourceType other than `unknown`**;
`unknown` sourceType ⇒ `score: null`; `verified` needs an evidence `url`; targets must exist (`point` targets are never stored).
Missing evidence is represented by *absence* (or `score: null`) — never by a placeholder number.

## Records in `reality-evidence.json`
- **Assessment** `{ id, target, dimension, score|null, …provenance }`, dimension ∈ `overall | beach | infrastructure | surroundings`.
  Several assessments may exist for the same target+dimension (different sources). Nothing is dropped:
  headline = verified external/derived first, then confidence, then recency; **first-hand-user always ranks after others**; the rest are listed.
  A sub-zone with none of its own inherits its parent area's list and the UI says so.
- **Warning** `{ id, target, category (environmental|industrial|port-marina|roads-built|noise|waste|other), severity (info|caution|problem), title, detail, …provenance }`.
- **Observation** `{ id, target, topic, text, radiusM?, …provenance }`, topic ∈ beach-conditions · beach-access · infrastructure-nearby ·
  roads-built-environment · ports-industrial · surroundings · environmental-issues · key-attractions · distance-context.
- **RadiusAnalysis** `{ id, target, radiusM ∈ 250|500|1000, method, metrics:[{key,label,value|null,unit?}], …provenance }` — output slot for the future automated
  surroundings analysis. The UI already selects the radius, draws the circle for hotels/pins/attractions and lists analyses; **no analysis code exists yet**.

## Derived (computed in the app, never stored, labelled *Derived*)
Which area/sub-zone polygons contain a hotel or pin · attractions within 250 m / 500 m / 1 km · straight-line airport distance (only if `meta.airport` is set) ·
bounding-box centre used as a label/selection point for polygons.

## Tester feedback (separate from the dataset; browser localStorage `zanzibar-reality:feedback:v2`)
One entry per **feature × dimension** (overall, beach, infrastructure, surroundings, warnings): `{ featureKind, featureId, dimension, rating, note, updatedAt, sourceType: "first-hand-user" }`,
rating ∈ accurate | mostly-accurate | wrong | not-sure. It is shown *beside* dataset evidence and never edits it.
Export (`zanzibar-reality-feedback` v2): `entries[]` each with `datasetClaims[]` (what the dataset said, with ids, scores, sourceType) so corrections can be diffed and later ingested
as `first-hand-user` assessments. v1 (per-area) feedback is not migrated.

## Adding data
1. Put the six files in a directory; 2. `ZR_DATASET_DIR=/abs/path npm run dev`; 3. read the *Dataset* panel for validation problems; 4. copy the files into `src/data/` to ship.
Test fixtures (`src/test/fixtures/`) use fictional geometry near 0°,0° on purpose and must never be shipped as Zanzibar data.
