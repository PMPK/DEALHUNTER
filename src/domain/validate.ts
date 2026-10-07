import type { Dataset, Provenance } from './types';

const STATUSES = ['verified', 'unverified', 'disputed'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Generous bounding box around Unguja (Zanzibar island). */
const BBOX = { minLat: -6.6, maxLat: -5.6, minLng: 39.0, maxLng: 39.8 };

export function inZanzibar([lat, lng]: readonly [number, number]): boolean {
  return lat >= BBOX.minLat && lat <= BBOX.maxLat && lng >= BBOX.minLng && lng <= BBOX.maxLng;
}

function checkProvenance(label: string, p: Provenance, problems: string[]) {
  if (typeof p.confidence !== 'number' || p.confidence < 0 || p.confidence > 1) problems.push(`${label}: confidence must be 0..1`);
  if (!Array.isArray(p.reasons) || p.reasons.length === 0) problems.push(`${label}: needs at least one reason`);
  if (!Array.isArray(p.evidence) || p.evidence.length === 0) problems.push(`${label}: needs at least one evidence entry`);
  if (!ISO_DATE.test(p.lastUpdated)) problems.push(`${label}: lastUpdated must be YYYY-MM-DD`);
  if (!STATUSES.includes(p.verificationStatus)) problems.push(`${label}: invalid verificationStatus`);
  // A "verified" claim without a checkable source is exactly the fake certainty we want to prevent.
  if (p.verificationStatus === 'verified' && !p.evidence?.some((e) => e.url)) {
    problems.push(`${label}: verified items must cite evidence with a url`);
  }
}

/** Returns a list of human-readable problems; empty means the dataset is consistent. */
export function validateDataset(d: Dataset): string[] {
  const problems: string[] = [];
  if (d.islandOutline.length < 4 || !d.islandOutline.every(inZanzibar)) problems.push('islandOutline: needs >=4 vertices, all inside Zanzibar');
  const areaIds = new Set<string>();
  for (const a of d.areas) {
    if (areaIds.has(a.id)) problems.push(`duplicate area id ${a.id}`);
    areaIds.add(a.id);
    if (!inZanzibar(a.center)) problems.push(`area ${a.id}: centre outside Zanzibar`);
    for (const key of ['overall', 'beach', 'infrastructure'] as const) {
      const s = a.scores[key];
      if (!s) {
        problems.push(`area ${a.id}: missing score ${key}`);
        continue;
      }
      if (s.score !== null && (s.score < 0 || s.score > 100)) problems.push(`area ${a.id}.${key}: score outside 0..100`);
      checkProvenance(`area ${a.id}.${key}`, s, problems);
    }
    const wIds = new Set<string>();
    for (const w of a.warnings) {
      if (wIds.has(w.id)) problems.push(`area ${a.id}: duplicate warning id ${w.id}`);
      wIds.add(w.id);
      checkProvenance(`warning ${w.id}`, w, problems);
    }
  }

  const zoneIds = new Set<string>();
  for (const f of d.zones.features) {
    const id = f.properties.areaId;
    zoneIds.add(id);
    if (!areaIds.has(id)) problems.push(`zone ${id}: no matching area`);
    const ring = f.geometry.coordinates[0];
    if (!ring || ring.length < 4) problems.push(`zone ${id}: ring too short`);
    else {
      const first = ring[0]!;
      const last = ring[ring.length - 1]!;
      if (first[0] !== last[0] || first[1] !== last[1]) problems.push(`zone ${id}: ring not closed`);
      if (!ring.every(([lng, lat]) => inZanzibar([lat!, lng!]))) problems.push(`zone ${id}: vertex outside Zanzibar`);
    }
  }
  for (const id of areaIds) if (!zoneIds.has(id)) problems.push(`area ${id}: no zone polygon`);

  const attractionIds = new Set<string>();
  for (const t of d.attractions) {
    if (attractionIds.has(t.id)) problems.push(`duplicate attraction id ${t.id}`);
    attractionIds.add(t.id);
    if (!inZanzibar(t.coordinates)) problems.push(`attraction ${t.id}: outside Zanzibar`);
    if (!t.source?.label) problems.push(`attraction ${t.id}: missing source`);
    if (!STATUSES.includes(t.verificationStatus)) problems.push(`attraction ${t.id}: invalid verificationStatus`);
    if (t.rating !== null && (t.rating < 0 || t.rating > 5)) problems.push(`attraction ${t.id}: rating outside 0..5`);
    if (t.verificationStatus === 'verified' && !t.source.url) problems.push(`attraction ${t.id}: verified needs source url`);
  }

  const hotelIds = new Set<string>();
  for (const h of d.hotels) {
    hotelIds.add(h.id);
    if (!areaIds.has(h.areaId)) problems.push(`hotel ${h.id}: unknown area ${h.areaId}`);
    if (h.synthetic !== true) problems.push(`hotel ${h.id}: must be flagged synthetic`);
  }
  for (const o of d.offers) {
    if (!hotelIds.has(o.hotelId)) problems.push(`offer ${o.id}: unknown hotel ${o.hotelId}`);
    if (o.demo !== true) problems.push(`offer ${o.id}: must be flagged demo`);
    const days = Math.round((Date.parse(o.returnDate) - Date.parse(o.departDate)) / 86_400_000);
    if (days !== o.nights) problems.push(`offer ${o.id}: nights (${o.nights}) does not match dates (${days})`);
  }
  return problems;
}
