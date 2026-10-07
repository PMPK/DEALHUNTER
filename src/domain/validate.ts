import { geometryPositions } from './geo';
import type { Bounds, Dataset, FeatureRef, Provenance, VerificationStatus } from './types';

const STATUSES: VerificationStatus[] = ['verified', 'unverified', 'disputed'];
const SOURCE_TYPES = ['external-source', 'first-hand-user', 'derived', 'unknown'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const AREA_GEOMS = ['Polygon', 'MultiPolygon'];
const BEACH_GEOMS = ['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'];

const inBounds = ([lat, lng]: readonly [number, number], [s, w, n, e]: Bounds) => lat >= s && lat <= n && lng >= w && lng <= e;

function ringsOf(g: GeoJSON.Geometry): GeoJSON.Position[][] {
  if (g.type === 'Polygon') return g.coordinates;
  if (g.type === 'MultiPolygon') return g.coordinates.flat();
  return [];
}

/**
 * Checks structure and the honesty rules. Returns human-readable problems; empty = consistent.
 * Rules that matter most for evidence quality:
 *  - a non-null score needs reasons AND evidence AND a known sourceType
 *  - a sourceType of 'unknown' can never carry a score
 *  - 'verified' needs an evidence entry with a url
 */
export function validateDataset(d: Dataset): string[] {
  const problems: string[] = [];
  const { sanityBounds, mapBounds } = d.meta;
  if (!d.meta.datasetVersion) problems.push('meta: datasetVersion missing');
  for (const [name, b] of [['sanityBounds', sanityBounds], ['mapBounds', mapBounds]] as const) {
    if (!Array.isArray(b) || b.length !== 4 || b.some((x) => typeof x !== 'number') || b[0] >= b[2] || b[1] >= b[3]) {
      problems.push(`meta.${name}: must be [south, west, north, east] with south<north and west<east`);
    }
  }
  if (d.meta.airport && !inBounds(d.meta.airport.coordinates, sanityBounds)) problems.push('meta.airport: outside sanityBounds');

  const geometryOk = (label: string, g: GeoJSON.Geometry) => {
    for (const p of geometryPositions(g)) {
      if (typeof p[0] !== 'number' || typeof p[1] !== 'number' || !inBounds([p[1], p[0]], sanityBounds)) {
        problems.push(`${label}: vertex outside sanityBounds (GeoJSON order is [lng, lat])`);
        return;
      }
    }
    for (const ring of ringsOf(g)) {
      const a = ring[0];
      const z = ring[ring.length - 1];
      if (ring.length < 4 || !a || !z || a[0] !== z[0] || a[1] !== z[1]) {
        problems.push(`${label}: polygon ring must be closed with >=4 positions`);
        return;
      }
    }
  };

  const areaIds = new Map<string, 'area' | 'subzone'>();
  for (const f of d.areas) {
    const p = f.properties;
    if (areaIds.has(p.id)) problems.push(`duplicate area id ${p.id}`);
    areaIds.set(p.id, p.kind);
    if (!AREA_GEOMS.includes(f.geometry?.type)) problems.push(`area ${p.id}: geometry must be Polygon or MultiPolygon`);
    else geometryOk(`area ${p.id}`, f.geometry);
    if (p.kind !== 'area' && p.kind !== 'subzone') problems.push(`area ${p.id}: kind must be area or subzone`);
  }
  for (const f of d.areas) {
    const p = f.properties;
    if (p.kind === 'area' && p.parentId !== null) problems.push(`area ${p.id}: top-level areas must have parentId null`);
    if (p.kind === 'subzone') {
      if (!p.parentId) problems.push(`subzone ${p.id}: parentId required`);
      else if (areaIds.get(p.parentId) !== 'area') problems.push(`subzone ${p.id}: parent ${p.parentId} must be a top-level area`);
    }
  }

  const beachIds = new Set<string>();
  for (const f of d.beaches) {
    const p = f.properties;
    if (beachIds.has(p.id)) problems.push(`duplicate beach id ${p.id}`);
    beachIds.add(p.id);
    if (!BEACH_GEOMS.includes(f.geometry?.type)) problems.push(`beach ${p.id}: unsupported geometry`);
    else geometryOk(`beach ${p.id}`, f.geometry);
    if (p.areaId !== null && !areaIds.has(p.areaId)) problems.push(`beach ${p.id}: unknown areaId ${p.areaId}`);
  }

  const pointChecks = (kind: 'attraction' | 'hotel', list: Dataset['attractions'] | Dataset['hotels']) => {
    const ids = new Set<string>();
    for (const x of list) {
      if (ids.has(x.id)) problems.push(`duplicate ${kind} id ${x.id}`);
      ids.add(x.id);
      if (!inBounds(x.coordinates, sanityBounds)) problems.push(`${kind} ${x.id}: coordinates outside sanityBounds ([lat, lng] order)`);
      if (!x.source?.label) problems.push(`${kind} ${x.id}: source.label missing`);
      if (!STATUSES.includes(x.verificationStatus)) problems.push(`${kind} ${x.id}: invalid verificationStatus`);
      if (!SOURCE_TYPES.includes(x.sourceType)) problems.push(`${kind} ${x.id}: invalid sourceType`);
      if (!ISO_DATE.test(x.lastUpdated)) problems.push(`${kind} ${x.id}: lastUpdated must be YYYY-MM-DD`);
      if (x.verificationStatus === 'verified' && !x.source?.url) problems.push(`${kind} ${x.id}: verified needs source.url`);
    }
    return ids;
  };
  const attractionIds = pointChecks('attraction', d.attractions);
  const hotelIds = pointChecks('hotel', d.hotels);
  for (const a of d.attractions) if (a.rating !== null && (a.rating < 0 || a.rating > 5)) problems.push(`attraction ${a.id}: rating outside 0..5`);

  const exists = (t: FeatureRef): boolean => {
    switch (t?.kind) {
      case 'area': return areaIds.get(t.id) === 'area';
      case 'subzone': return areaIds.get(t.id) === 'subzone';
      case 'beach': return beachIds.has(t.id);
      case 'hotel': return hotelIds.has(t.id);
      case 'attraction': return attractionIds.has(t.id);
      default: return false; // 'point' targets are user-only and never stored in a dataset
    }
  };

  const provenance = (label: string, p: Provenance, hasScore: boolean) => {
    if (typeof p.confidence !== 'number' || p.confidence < 0 || p.confidence > 1) problems.push(`${label}: confidence must be 0..1`);
    if (!STATUSES.includes(p.verificationStatus)) problems.push(`${label}: invalid verificationStatus`);
    if (!SOURCE_TYPES.includes(p.sourceType)) problems.push(`${label}: invalid sourceType`);
    if (!ISO_DATE.test(p.lastUpdated)) problems.push(`${label}: lastUpdated must be YYYY-MM-DD`);
    if (!Array.isArray(p.reasons) || !Array.isArray(p.evidence)) {
      problems.push(`${label}: reasons[] and evidence[] must be arrays`);
      return;
    }
    if (hasScore && p.sourceType === 'unknown') problems.push(`${label}: a score cannot have sourceType 'unknown'`);
    if (hasScore && p.reasons.length === 0) problems.push(`${label}: a score needs at least one reason`);
    if (hasScore && p.evidence.length === 0) problems.push(`${label}: a score needs at least one evidence entry`);
    if (p.verificationStatus === 'verified' && !p.evidence.some((e) => e.url)) problems.push(`${label}: verified needs evidence with a url`);
  };

  const ev = d.evidence;
  const ids = new Set<string>();
  const unique = (kind: string, id: string) => {
    const k = `${kind}:${id}`;
    if (ids.has(k)) problems.push(`duplicate ${kind} id ${id}`);
    ids.add(k);
  };
  for (const a of ev.assessments) {
    unique('assessment', a.id);
    if (!exists(a.target)) problems.push(`assessment ${a.id}: target ${a.target?.kind}:${a.target?.id} not found`);
    if (a.score !== null && (typeof a.score !== 'number' || a.score < 0 || a.score > 100)) problems.push(`assessment ${a.id}: score must be null or 0..100`);
    provenance(`assessment ${a.id}`, a, a.score !== null);
  }
  for (const w of ev.warnings) {
    unique('warning', w.id);
    if (!exists(w.target)) problems.push(`warning ${w.id}: target not found`);
    if (!w.title) problems.push(`warning ${w.id}: title missing`);
    provenance(`warning ${w.id}`, w, w.sourceType !== 'unknown');
  }
  for (const o of ev.observations) {
    unique('observation', o.id);
    if (!exists(o.target)) problems.push(`observation ${o.id}: target not found`);
    provenance(`observation ${o.id}`, o, false);
    if (!o.text) problems.push(`observation ${o.id}: text missing`);
  }
  for (const r of ev.radiusAnalyses) {
    unique('radiusAnalysis', r.id);
    if (!exists(r.target)) problems.push(`radiusAnalysis ${r.id}: target not found`);
    if (![250, 500, 1000].includes(r.radiusM)) problems.push(`radiusAnalysis ${r.id}: radiusM must be 250, 500 or 1000`);
    provenance(`radiusAnalysis ${r.id}`, r, r.metrics?.some((m) => m.value !== null) ?? false);
  }
  return problems;
}
