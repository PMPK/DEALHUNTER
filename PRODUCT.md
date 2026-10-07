# Zanzibar Reality — Product

**Core question:** *Can this map give a traveler a geographically accurate, evidence-based reality check of where they are actually going in Zanzibar?*

Not in scope for this experiment: selling or searching holiday offers (the Offers tab is a frozen demo), accounts, AI, paid APIs.

## Principles
1. **Unknown beats fake.** A place without evidence shows *No evidence yet*; it never gets a score to look complete.
2. **Every claim has provenance:** score, confidence, verificationStatus, reasons, evidence, sourceType, lastUpdated.
3. **The tester is a source, not an editor.** First-hand corrections are stored separately as `first-hand-user` and never overwrite other evidence.
4. **Data is not code.** All geography and claims live in six data files; the UI holds none.
5. **Colour is never the only signal** (symbols, words, dashed = unverified/unknown).

## What the product does
Layers (independently toggleable): Overall stay attractiveness · Beach / swimming reality · Tourist infrastructure · Surroundings / visual environment ·
Environmental / industrial warnings · Attractions (+ hotel markers). Select an area, sub-zone, beach, hotel, attraction or a dropped pin to get a
*Local reality* view (beach conditions, beach access, infrastructure nearby, roads/built environment, ports/industrial, surroundings, environmental issues,
key attractions, distance/context) at 250 m / 500 m / 1 km, plus Reality Explorer links (Google Maps, Street View, Earth/satellite) to inspect the place yourself.
Compare two areas; calibrate each dimension from first-hand knowledge and export JSON.

## Success criteria
A researched dataset dropped into the six files renders correctly, validates, and a tester's per-dimension corrections can be exported and fed back as evidence.
