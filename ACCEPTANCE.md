# Acceptance checklist

Status: ✅ done and covered by automated tests · 🧪 also/only verified manually in a browser · ⏳ not done

| # | Requirement | Status | Where verified |
|---|-------------|--------|----------------|
| 1 | Zanzibar-only interactive map (Leaflet + OSM tiles, attribution shown) | ✅🧪 | browser smoke test; tiles need internet |
| 2 | Areas are data entities (10 areas; add one = add JSON + zone) | ✅ | `dataset.test.ts` |
| 3 | 5 overlays, each independently toggleable | ✅ | `App.test.tsx` "switches every overlay independently", `overlays.test.ts` |
| 4 | Coloured zones with 0–100 score; score has confidence, reasons, evidence, lastUpdated, verificationStatus | ✅ | `validate.ts` + `dataset.test.ts` |
| 4b | Unverified seed values clearly marked in UI | ✅ | `App.test.tsx`, dashed outline / "?" chip |
| 5 | Area panel: scores, positives, negatives, warnings, confidence, sources, nearby attractions, airport distance, suitable-for | ✅ | `App.test.tsx` |
| 6 | Reality Explorer: Google Maps, Street View, Google Earth/satellite — no API key | ✅ | `geo.test.ts`, `App.test.tsx` |
| 7 | Attraction markers with name, coords, category, rating, description, source, verification | ✅ | `dataset.test.ts`, attraction card test |
| 8 | Hotels linked to areas, clearly synthetic | ✅ | `dataset.test.ts`, `App.test.tsx` |
| 9 | DEMO holiday offers (price, people, city, dates, duration, hotel, board, Deal Score placeholder) labelled DEMO / NOT LIVE DATA | ✅ | `App.test.tsx` |
| 10 | Tester mode: 4 ratings + note per area, localStorage, "Export feedback JSON" | ✅🧪 | `feedback.test.ts`, `App.test.tsx`, real browser download check |
| 11 | Compare two areas side-by-side | ✅ | `App.test.tsx` |
| 12 | Mobile-first responsive UI | 🧪 | screenshots at 390 px and 1280 px |
| – | Static build; typecheck, tests and `npm run build` pass | ✅ | `npm run validate` |
| – | Map provider isolated behind `src/map` | ✅ | `src/map/types.ts` contract |
| – | Any item marked `verified` must cite an evidence URL | ✅ | `validate.ts` rule + test |
