# Zanzibar Reality — Product

**Question it answers:** "Is this hotel / area in Zanzibar actually a good place to stay, beyond the marketing photos?"

## Hypothesis being tested
A map of *reality overlays* (beach quality, infrastructure, warnings, attractions) with honest
confidence and provenance is more useful to a traveler than photos and star ratings. This MVP exists to
validate that before spending on live offers, AI, paid APIs, accounts or affiliate plumbing.

## Principles
1. **Unknown beats fake.** Every score carries confidence, reasons, evidence, `lastUpdated` and a
   verification status. Seed values are *unverified* and look it (dashed outlines, "?" marks, badges).
2. **Not colour alone.** Green/yellow/orange/red bands always come with a symbol and a word.
3. **Zero cost, static.** No backend, no keys, no LLM. External Google links instead of embedded APIs.
4. **The tester is the first data source.** Calibration mode captures corrections as exportable JSON.

## Scope (MVP)
Zanzibar (Unguja) only · 10 tourist areas · 5 independent overlays · area detail panel · Reality Explorer
(Google Maps / Street View / Earth links) · attraction markers · synthetic demo hotels & DEMO offers ·
offer search over demo data (with reality filters) · tester calibration + JSON export · two-area comparison · mobile-first UI.

## Out of scope (deliberately)
Live prices, booking, accounts, database, AI summaries, review scraping, Pemba/mainland, real hotel facts.

## Success criteria for this prototype
After walking the seed areas, the tester can say which scores/warnings were right, wrong or missing, and
the exported JSON is good enough to rewrite the dataset from.
