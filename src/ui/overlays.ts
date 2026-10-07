import type { Area, Attraction, AttractionCategory, Dataset, FeedbackMap, ScoreKey } from '../domain/types';
import { BANDS, NO_WARNING_COLOR, SEVERITY, effectiveStatus, formatScore, scoreBand, worstSeverity } from '../domain/scoring';
import type { MapAttraction, MapBadge, MapZone } from '../map';

export type OverlayId = ScoreKey | 'warnings' | 'attractions';

export interface OverlayDef {
  id: OverlayId;
  label: string;
  short: string;
  hint: string;
}

export const OVERLAYS: OverlayDef[] = [
  { id: 'overall', label: 'Overall Area Attractiveness', short: 'Overall', hint: 'Overall 0–100 score per area' },
  { id: 'beach', label: 'Beach / Swimming Quality', short: 'Beach', hint: 'Beach and swimming score' },
  { id: 'infrastructure', label: 'Tourist Infrastructure', short: 'Infra', hint: 'Restaurants, services, transport score' },
  { id: 'warnings', label: 'Reality Warnings', short: 'Warnings', hint: 'Worst known warning per area' },
  { id: 'attractions', label: 'Attractions', short: 'Attractions', hint: 'Attraction markers' },
];

export const DEFAULT_OVERLAYS: ReadonlySet<OverlayId> = new Set<OverlayId>(['overall', 'attractions']);

export const SCORE_OVERLAYS: ScoreKey[] = ['overall', 'beach', 'infrastructure'];

export const CATEGORY_META: Record<AttractionCategory, { label: string; glyph: string }> = {
  culture: { label: 'Culture', glyph: '🏛' },
  nature: { label: 'Nature', glyph: '🌴' },
  wildlife: { label: 'Wildlife', glyph: '🐢' },
  'snorkel-dive': { label: 'Snorkel / dive', glyph: '🤿' },
  activity: { label: 'Activity', glyph: '🪁' },
  'food-drink': { label: 'Food & drink', glyph: '🍽' },
  beach: { label: 'Beach', glyph: '🏖' },
};

const STATUS_MARK = { verified: '', unverified: '?', disputed: '!' } as const;
const DEFAULT_OUTLINE = '#35505a';

export function buildZones(
  dataset: Dataset,
  overlays: ReadonlySet<OverlayId>,
  selectedAreaId: string | null,
  feedback: FeedbackMap,
): MapZone[] {
  const areaById = new Map(dataset.areas.map((a) => [a.id, a] as const));
  const activeScores = SCORE_OVERLAYS.filter((k) => overlays.has(k));
  const showWarnings = overlays.has('warnings');

  return dataset.zones.features.flatMap((f) => {
    const area: Area | undefined = areaById.get(f.properties.areaId);
    if (!area) return [];
    const fb = feedback[area.id];
    const badges: MapBadge[] = [];
    let dashed = false;
    for (const key of activeScores) {
      const item = area.scores[key];
      const def = OVERLAYS.find((o) => o.id === key)!;
      const band = scoreBand(item.score);
      const { status } = effectiveStatus(item, fb);
      if (status !== 'verified') dashed = true;
      badges.push({
        text: `${def.short} ${formatScore(item.score)}${BANDS[band].symbol}${STATUS_MARK[status]}`,
        short: `${def.short[0]}${formatScore(item.score)}${BANDS[band].symbol}${STATUS_MARK[status]}`,
        color: BANDS[band].color,
        title: `${def.label}: ${formatScore(item.score)} (${BANDS[band].label}), ${status}`,
      });
    }
    let outline = DEFAULT_OUTLINE;
    let outlineWeight = 1.5;
    if (showWarnings) {
      const worst = worstSeverity(area.warnings);
      outline = worst ? SEVERITY[worst].color : NO_WARNING_COLOR;
      outlineWeight = worst ? 3.5 : 1.5;
      badges.push({
        text: worst ? `${SEVERITY[worst].symbol} ${area.warnings.length}` : '— 0',
        short: worst ? `W${SEVERITY[worst].symbol}${area.warnings.length}` : 'W—',
        color: outline,
        title: worst
          ? `${area.warnings.length} reality warning(s), worst: ${SEVERITY[worst].label}`
          : 'No warnings recorded (this does not mean the area is risk-free)',
      });
      if (area.warnings.some((w) => w.verificationStatus !== 'verified')) dashed = true;
    }
    if (activeScores.length === 0 && !showWarnings) {
      dashed = effectiveStatus(area.scores.overall, fb).status !== 'verified';
    }
    const first = activeScores[0];
    const fill = first ? BANDS[scoreBand(area.scores[first].score)].color : null;
    if (selectedAreaId === area.id) outlineWeight = 5;
    return [
      {
        id: area.id,
        name: area.name,
        ring: f.geometry.coordinates[0]!.map(([lng, lat]) => [lat!, lng!] as const) as unknown as MapZone['ring'],
        labelAt: area.center,
        fill,
        outline: selectedAreaId === area.id ? '#0b1f26' : outline,
        outlineWeight,
        dashed,
        selected: selectedAreaId === area.id,
        badges,
      } satisfies MapZone,
    ];
  });
}

export function buildAttractionMarkers(
  attractions: readonly Attraction[],
  overlays: ReadonlySet<OverlayId>,
  selectedId: string | null,
): MapAttraction[] {
  if (!overlays.has('attractions')) return [];
  return attractions.map((a) => ({
    id: a.id,
    name: a.name,
    position: a.coordinates,
    glyph: CATEGORY_META[a.category].glyph,
    verified: a.verificationStatus === 'verified',
    selected: a.id === selectedId,
  }));
}
