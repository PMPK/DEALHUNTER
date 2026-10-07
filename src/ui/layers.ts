import { headlineScore, warningsFor } from '../domain/assess';
import { DIMENSION_LABEL, DIMENSION_SHORT, SCORE_DIMENSIONS } from '../domain/dimensions';
import { feedbackKey, isFeedbackKind } from '../domain/feedback';
import { geometryCenter, geometryLines, geometryPolygons } from '../domain/geo';
import { BANDS, NO_WARNING_COLOR, SEVERITY, STATUS_LABEL, formatScore, scoreBand, testerFlag, worstSeverity } from '../domain/scoring';
import type {
  AttractionCategory,
  Dataset,
  FeatureKind,
  FeatureRef,
  FeedbackMap,
  LatLng,
  ScoreDimension,
  Selection,
} from '../domain/types';
import type { MapBadge, MapMarker, MapShape } from '../map';

export type LayerId = ScoreDimension | 'warnings' | 'attractions' | 'hotels';

export interface LayerDef {
  id: LayerId;
  label: string;
  hint: string;
}

/** The six reality layers (plus a hotel marker toggle used for selecting hotels). */
export const LAYERS: LayerDef[] = [
  { id: 'overall', label: DIMENSION_LABEL.overall, hint: 'Overall score per area' },
  { id: 'beach', label: DIMENSION_LABEL.beach, hint: 'Beach and swimming score' },
  { id: 'infrastructure', label: DIMENSION_LABEL.infrastructure, hint: 'Restaurants, services, transport' },
  { id: 'surroundings', label: DIMENSION_LABEL.surroundings, hint: 'Built environment and visual surroundings' },
  { id: 'warnings', label: DIMENSION_LABEL.warnings, hint: 'Worst recorded warning per feature' },
  { id: 'attractions', label: 'Attractions', hint: 'Attraction markers' },
  { id: 'hotels', label: 'Hotels', hint: 'Hotel markers (for selecting a hotel)' },
];

export const DEFAULT_LAYERS: ReadonlySet<LayerId> = new Set<LayerId>(['overall', 'attractions', 'hotels']);

export const CATEGORY_GLYPH: Record<AttractionCategory, string> = {
  culture: '🏛',
  nature: '🌴',
  wildlife: '🐢',
  'snorkel-dive': '🤿',
  activity: '🪁',
  'food-drink': '🍽',
  beach: '🏖',
  other: '📍',
};

const STATUS_MARK = { verified: '', unverified: '?', disputed: '!' } as const;
const DEFAULT_OUTLINE = '#35505a';

export function buildShapes(
  dataset: Dataset,
  layers: ReadonlySet<LayerId>,
  selection: Selection | null,
  feedback: FeedbackMap,
): MapShape[] {
  const activeScores = SCORE_DIMENSIONS.filter((d) => layers.has(d));
  const showWarnings = layers.has('warnings');

  const style = (ref: FeatureRef, dims: ScoreDimension[]) => {
    const badges: MapBadge[] = [];
    let dashed = false;
    const fills: string[] = [];
    for (const dim of dims) {
      const { assessment } = headlineScore(dataset, ref, dim);
      const score = assessment?.score ?? null;
      const band = BANDS[scoreBand(score)];
      const flag = isFeedbackKind(ref.kind) ? testerFlag(feedback[feedbackKey(ref.kind, ref.id, dim)]) : null;
      const status = assessment?.verificationStatus ?? 'unverified';
      if (!assessment || status !== 'verified') dashed = true;
      const mark = score === null ? '' : flag === 'wrong' ? '!' : STATUS_MARK[status];
      badges.push({
        text: `${DIMENSION_SHORT[dim]} ${formatScore(score)}${score === null ? '' : band.symbol}${mark}`,
        short: `${DIMENSION_SHORT[dim][0]}${formatScore(score)}${score === null ? '' : band.symbol}${mark}`,
        color: band.color,
        title:
          score === null
            ? `${DIMENSION_LABEL[dim]}: no evidence-based score (unknown)`
            : `${DIMENSION_LABEL[dim]}: ${formatScore(score)} (${band.label}), ${STATUS_LABEL[status].toLowerCase()}${flag === 'wrong' ? ', you marked this wrong' : ''}`,
      });
      fills.push(band.color);
    }
    return { badges, dashed, fill: fills[0] ?? null };
  };

  const warningStyle = (ref: FeatureRef, base: { badges: MapBadge[]; dashed: boolean }) => {
    const ws = warningsFor(dataset, ref);
    const worst = worstSeverity(ws);
    const color = worst ? SEVERITY[worst].color : NO_WARNING_COLOR;
    base.badges.push({
      text: worst ? `${SEVERITY[worst].symbol} ${ws.length}` : '— 0',
      short: worst ? `W${SEVERITY[worst].symbol}${ws.length}` : 'W—',
      color,
      title: worst
        ? `${ws.length} warning(s), worst: ${SEVERITY[worst].label}`
        : 'No warnings recorded (this is not evidence that none exist)',
    });
    if (ws.some((w) => w.verificationStatus !== 'verified')) base.dashed = true;
    return { color, weight: worst ? 3.5 : 1.5 };
  };

  const shapes: MapShape[] = [];
  const isSel = (ref: FeatureRef) => selection?.ref.kind === ref.kind && selection.ref.id === ref.id;

  // Areas first, then sub-zones on top.
  const areas = [...dataset.areas].sort((a, b) => Number(a.properties.kind === 'subzone') - Number(b.properties.kind === 'subzone'));
  for (const f of areas) {
    const ref: FeatureRef = { kind: f.properties.kind, id: f.properties.id };
    const st = style(ref, activeScores);
    let outline = DEFAULT_OUTLINE;
    let weight = 1.5;
    if (showWarnings) {
      const w = warningStyle(ref, st);
      outline = w.color;
      weight = w.weight;
    }
    const sel = isSel(ref);
    shapes.push({
      key: `${ref.kind}:${ref.id}`,
      kind: ref.kind,
      id: ref.id,
      name: f.properties.name,
      polygons: geometryPolygons(f.geometry),
      lines: [],
      labelAt: geometryCenter(f.geometry),
      labelMinZoom: ref.kind === 'subzone' ? 13 : 0,
      fill: st.fill,
      outline: sel ? '#0b1f26' : outline,
      outlineWeight: sel ? 5 : weight,
      dashed: activeScores.length === 0 && !showWarnings ? true : st.dashed,
      selected: sel,
      badges: st.badges,
    });
  }

  // Beaches are drawn only while the beach layer (or warnings layer) is on, or when selected.
  for (const f of dataset.beaches) {
    const ref: FeatureRef = { kind: 'beach', id: f.properties.id };
    const sel = isSel(ref);
    if (!layers.has('beach') && !showWarnings && !sel) continue;
    const dims: ScoreDimension[] = layers.has('beach') ? ['beach'] : [];
    const st = style(ref, dims);
    let color = st.fill ?? DEFAULT_OUTLINE;
    let weight = 5;
    if (showWarnings) {
      const w = warningStyle(ref, st);
      if (!layers.has('beach')) {
        color = w.color;
        weight = Math.max(5, w.weight + 2);
      }
    }
    shapes.push({
      key: `beach:${ref.id}`,
      kind: 'beach',
      id: ref.id,
      name: f.properties.name,
      polygons: geometryPolygons(f.geometry),
      lines: geometryLines(f.geometry),
      labelAt: geometryCenter(f.geometry),
      labelMinZoom: 13,
      fill: st.fill && geometryPolygons(f.geometry).length ? st.fill : null,
      outline: sel ? '#0b1f26' : color,
      outlineWeight: sel ? weight + 2 : weight,
      dashed: st.dashed,
      selected: sel,
      badges: st.badges,
    });
  }
  return shapes;
}

export function buildMarkers(dataset: Dataset, layers: ReadonlySet<LayerId>, selection: Selection | null): MapMarker[] {
  const out: MapMarker[] = [];
  const sel = (kind: FeatureKind, id: string) => selection?.ref.kind === kind && selection.ref.id === id;
  if (layers.has('attractions')) {
    for (const a of dataset.attractions) {
      out.push({ key: `attraction:${a.id}`, kind: 'attraction', id: a.id, name: a.name, position: a.coordinates, glyph: CATEGORY_GLYPH[a.category] ?? '📍', verified: a.verificationStatus === 'verified', selected: sel('attraction', a.id) });
    }
  }
  if (layers.has('hotels')) {
    for (const h of dataset.hotels) {
      out.push({ key: `hotel:${h.id}`, kind: 'hotel', id: h.id, name: h.name, position: h.coordinates, glyph: '🏨', verified: h.verificationStatus === 'verified', selected: sel('hotel', h.id) });
    }
  }
  return out;
}

/** Build a Selection for a dataset feature. Areas/beaches use their bounding-box centre (derived). */
export function selectionFor(dataset: Dataset, kind: FeatureKind, id: string): Selection | null {
  switch (kind) {
    case 'area':
    case 'subzone': {
      const f = dataset.areas.find((a) => a.properties.id === id);
      const c = f ? geometryCenter(f.geometry) : null;
      return f && c ? { ref: { kind, id }, label: f.properties.name, position: c, derivedPosition: true } : null;
    }
    case 'beach': {
      const f = dataset.beaches.find((b) => b.properties.id === id);
      const c = f ? geometryCenter(f.geometry) : null;
      return f && c ? { ref: { kind, id }, label: f.properties.name, position: c, derivedPosition: true } : null;
    }
    case 'hotel': {
      const h = dataset.hotels.find((x) => x.id === id);
      return h ? { ref: { kind, id }, label: h.name, position: h.coordinates } : null;
    }
    case 'attraction': {
      const a = dataset.attractions.find((x) => x.id === id);
      return a ? { ref: { kind, id }, label: a.name, position: a.coordinates } : null;
    }
    default:
      return null;
  }
}

export const pinSelection = (position: LatLng): Selection => ({ ref: { kind: 'point', id: 'pin' }, label: 'Dropped pin', position });
