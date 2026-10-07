import { geometryContains } from './geo';
import type {
  AreaFeature,
  Assessment,
  Dataset,
  FeatureRef,
  LatLng,
  LocalTopic,
  Observation,
  RadiusAnalysis,
  RadiusM,
  RealityWarning,
  ScoreDimension,
} from './types';

const refEq = (a: FeatureRef, b: FeatureRef) => a.kind === b.kind && a.id === b.id;
const statusRank = { verified: 2, unverified: 1, disputed: 0 } as const;

/**
 * Order competing assessments of one feature+dimension. Nothing is dropped or overwritten:
 * external/derived evidence leads (verified first, then confidence, then recency); first-hand user
 * assessments follow. The first element is the headline value, the rest stay visible.
 */
export function rankAssessments(list: readonly Assessment[]): Assessment[] {
  return [...list].sort((a, b) => {
    const userA = a.sourceType === 'first-hand-user' ? 1 : 0;
    const userB = b.sourceType === 'first-hand-user' ? 1 : 0;
    return (
      userA - userB ||
      statusRank[b.verificationStatus] - statusRank[a.verificationStatus] ||
      b.confidence - a.confidence ||
      b.lastUpdated.localeCompare(a.lastUpdated) ||
      a.id.localeCompare(b.id)
    );
  });
}

export interface ResolvedAssessments {
  /** All assessments that apply, headline first. Empty = no evidence at all. */
  list: Assessment[];
  /** Set when the list belongs to the parent area because the sub-zone has none of its own. */
  inheritedFrom: AreaFeature | null;
}

function parentOf(dataset: Dataset, ref: FeatureRef): AreaFeature | null {
  if (ref.kind !== 'subzone') return null;
  const self = dataset.areas.find((a) => a.properties.id === ref.id);
  const parentId = self?.properties.parentId;
  return parentId ? (dataset.areas.find((a) => a.properties.id === parentId) ?? null) : null;
}

export function resolveAssessments(dataset: Dataset, ref: FeatureRef, dimension: ScoreDimension): ResolvedAssessments {
  const own = dataset.evidence.assessments.filter((a) => refEq(a.target, ref) && a.dimension === dimension);
  if (own.length > 0) return { list: rankAssessments(own), inheritedFrom: null };
  const parent = parentOf(dataset, ref);
  if (parent) {
    const inherited = dataset.evidence.assessments.filter(
      (a) => refEq(a.target, { kind: 'area', id: parent.properties.id }) && a.dimension === dimension,
    );
    if (inherited.length > 0) return { list: rankAssessments(inherited), inheritedFrom: parent };
  }
  return { list: [], inheritedFrom: null };
}

/** Headline score for map styling. null = unknown; callers must render unknown as unknown. */
export function headlineScore(dataset: Dataset, ref: FeatureRef, dimension: ScoreDimension) {
  const { list, inheritedFrom } = resolveAssessments(dataset, ref, dimension);
  return { assessment: list[0] ?? null, inheritedFrom, count: list.length };
}

export function warningsFor(dataset: Dataset, ref: FeatureRef): RealityWarning[] {
  return dataset.evidence.warnings.filter((w) => refEq(w.target, ref));
}

export function observationsFor(dataset: Dataset, ref: FeatureRef, topic: LocalTopic): Observation[] {
  return dataset.evidence.observations.filter((o) => refEq(o.target, ref) && o.topic === topic);
}

export function radiusAnalysesFor(dataset: Dataset, ref: FeatureRef, radiusM: RadiusM): RadiusAnalysis[] {
  return dataset.evidence.radiusAnalyses.filter((r) => refEq(r.target, ref) && r.radiusM === radiusM);
}

/**
 * Area / sub-zone polygons that contain a point (derived by geometry, not stored). Most specific
 * first: sub-zones before the areas that enclose them.
 */
export function containingAreas(dataset: Dataset, point: LatLng): AreaFeature[] {
  return dataset.areas
    .filter((a) => geometryContains(a.geometry, point))
    .sort((a, b) => Number(b.properties.kind === 'subzone') - Number(a.properties.kind === 'subzone'));
}

export function areaRef(a: AreaFeature): FeatureRef {
  return { kind: a.properties.kind, id: a.properties.id };
}

/**
 * Refs whose evidence is relevant to a selection: the feature itself, plus (for hotels and pins) the
 * areas that contain it. Each is tagged so the UI can say where a statement came from.
 */
export function relevantRefs(dataset: Dataset, ref: FeatureRef, position: LatLng): Array<{ ref: FeatureRef; label: string; own: boolean }> {
  const own = { ref, label: 'this location', own: true };
  if (ref.kind === 'area' || ref.kind === 'subzone' || ref.kind === 'beach') return [own];
  const containers = containingAreas(dataset, position).map((a) => ({ ref: areaRef(a), label: a.properties.name, own: false }));
  return [own, ...containers];
}
