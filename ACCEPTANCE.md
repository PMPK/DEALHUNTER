# Acceptance checklist

✅ implemented and covered by automated tests · 🧪 verified manually in a browser · ⏳ architecture only (no data / no analysis yet)

| # | Requirement | Status | Where verified |
|---|-------------|--------|----------------|
| P1 | Real geography: GeoJSON polygons/MultiPolygons, sub-zone support, no fabricated geometry shipped (areas.geojson is empty) | ✅ (geometry ⏳ data) | `validate.test.ts`, `shipped.test.ts`, `assess.test.ts` (inheritance) |
| P2 | Six independently toggleable layers | ✅ | `App.test.tsx` "switches each of the six layers", `layers.test.ts` |
| P2 | score / confidence / verificationStatus / reasons / evidence / sourceType / lastUpdated on every scored feature; unknown never scored | ✅ | `validate.test.ts`, `layers.test.ts` ("n/a"), `App.test.tsx` |
| P3 | Local reality for point/hotel/area: 9 topics, "No evidence yet" where empty | ✅ | `App.test.tsx` |
| P3 | 250 m / 500 m / 1 km radius selector, map circle, analysis slot, derived attractions-in-radius | ✅ (automated analysis ⏳) | `App.test.tsx`, `geo.test.ts` |
| P4 | Reality Explorer: Google Maps, Street View, Earth + satellite links, no key, for any selection incl. dropped pin | ✅ | `App.test.tsx`, `geo.test.ts` |
| P5 | Per-dimension tester feedback (overall, beach, infrastructure, surroundings, warnings), 4 ratings + note, stored as first-hand-user, export JSON, never overwrites evidence | ✅🧪 | `feedback.test.ts`, `App.test.tsx`, browser download check (v1) |
| P6 | Separated data files; UI contains no Zanzibar facts or coordinates | ✅ | `shipped.test.ts` guard (no coordinates / place names / claims in code) |
| – | Offers tab frozen, independent of Reality data | ✅ | `App.test.tsx` "Offers tab (frozen demo)" |
| – | typecheck, tests, production build | ✅ | `npm run validate` |
| – | Evidence-backed Zanzibar dataset | ⏳ | **not supplied yet** |
