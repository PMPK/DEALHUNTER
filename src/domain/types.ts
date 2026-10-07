/**
 * Reality domain model. Pure data shapes — no UI or map-library imports.
 * Geometry lives in GeoJSON files; every claim about a place lives in reality-evidence.json
 * and points at a feature by FeatureRef. See DATA_MODEL.md.
 */

export type VerificationStatus = 'verified' | 'unverified' | 'disputed';

/** Where a claim comes from. 'unknown' claims can never carry a score. */
export type SourceType = 'external-source' | 'first-hand-user' | 'derived' | 'unknown';

export interface Evidence {
  label: string;
  url?: string;
  note?: string;
}

export interface Provenance {
  /** 0..1 editorial scale shown as Low / Medium / High. */
  confidence: number;
  verificationStatus: VerificationStatus;
  sourceType: SourceType;
  reasons: string[];
  evidence: Evidence[];
  /** ISO date YYYY-MM-DD. */
  lastUpdated: string;
}

export type LatLng = readonly [lat: number, lng: number];

export type ScoreDimension = 'overall' | 'beach' | 'infrastructure' | 'surroundings';
/** Tester feedback can also address the warnings of a feature. */
export type FeedbackDimension = ScoreDimension | 'warnings';

export type FeatureKind = 'area' | 'subzone' | 'beach' | 'hotel' | 'attraction' | 'point';
export interface FeatureRef {
  kind: FeatureKind;
  id: string;
}

/** A score for one dimension of one feature. score === null means unknown (never a fake number). */
export interface Assessment extends Provenance {
  id: string;
  target: FeatureRef;
  dimension: ScoreDimension;
  score: number | null;
}

export type WarningCategory = 'environmental' | 'industrial' | 'port-marina' | 'roads-built' | 'noise' | 'waste' | 'other';
export type WarningSeverity = 'info' | 'caution' | 'problem';

export interface RealityWarning extends Provenance {
  id: string;
  target: FeatureRef;
  category: WarningCategory;
  severity: WarningSeverity;
  title: string;
  detail: string;
}

export type LocalTopic =
  | 'beach-conditions'
  | 'beach-access'
  | 'infrastructure-nearby'
  | 'roads-built-environment'
  | 'ports-industrial'
  | 'surroundings'
  | 'environmental-issues'
  | 'key-attractions'
  | 'distance-context';

export const RADII_M = [250, 500, 1000] as const;
export type RadiusM = (typeof RADII_M)[number];

/** A sourced statement about the local situation of a feature (optionally limited to a radius). */
export interface Observation extends Provenance {
  id: string;
  target: FeatureRef;
  topic: LocalTopic;
  text: string;
  radiusM?: RadiusM;
}

export interface RadiusMetric {
  key: string;
  label: string;
  value: number | string | null;
  unit?: string;
}

/** Result of an (offline, future) analysis of the surroundings of a feature within a radius. */
export interface RadiusAnalysis extends Provenance {
  id: string;
  target: FeatureRef;
  radiusM: RadiusM;
  method: string;
  metrics: RadiusMetric[];
}

export interface EvidenceBundle {
  schemaVersion: number;
  assessments: Assessment[];
  warnings: RealityWarning[];
  observations: Observation[];
  radiusAnalyses: RadiusAnalysis[];
}

export interface AreaProperties {
  id: string;
  name: string;
  /** 'subzone' = part of a parent area (e.g. one stretch of a town). */
  kind: 'area' | 'subzone';
  parentId: string | null;
  description?: string;
}

export interface BeachProperties {
  id: string;
  name: string;
  areaId: string | null;
  description?: string;
}

export type AreaFeature = GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon, AreaProperties>;
export type BeachFeature = GeoJSON.Feature<
  GeoJSON.LineString | GeoJSON.MultiLineString | GeoJSON.Polygon | GeoJSON.MultiPolygon,
  BeachProperties
>;

export type AttractionCategory = 'culture' | 'nature' | 'wildlife' | 'snorkel-dive' | 'activity' | 'food-drink' | 'beach' | 'other';

export interface PointFeatureBase {
  id: string;
  name: string;
  coordinates: LatLng;
  coordinatesApproximate: boolean;
  source: Evidence;
  verificationStatus: VerificationStatus;
  sourceType: SourceType;
  lastUpdated: string;
}

export interface Attraction extends PointFeatureBase {
  category: AttractionCategory;
  rating: number | null;
  description: string;
}

export interface Hotel extends PointFeatureBase {
  /** True only for test fixtures; real datasets omit it. */
  synthetic?: boolean;
  note?: string;
}

export interface Airport {
  name: string;
  iata: string;
  coordinates: LatLng;
}

export type Bounds = readonly [south: number, west: number, north: number, east: number];

export interface DatasetMeta {
  datasetVersion: string;
  description: string;
  /** null = no airport reference supplied; distances are then reported as unknown. */
  airport: Airport | null;
  /** Initial map viewport. A navigation hint, not data. */
  mapBounds: Bounds;
  /** Sanity limits used by the validator to catch mis-ordered or wrong-region coordinates. */
  sanityBounds: Bounds;
}

export interface Dataset {
  meta: DatasetMeta;
  areas: AreaFeature[];
  beaches: BeachFeature[];
  attractions: Attraction[];
  hotels: Hotel[];
  evidence: EvidenceBundle;
}

/** What the user has selected: a dataset feature or a dropped pin. */
export interface Selection {
  ref: FeatureRef;
  label: string;
  position: LatLng;
  /** True for coordinates that are only an approximation (e.g. the centre of a polygon's bounding box). */
  derivedPosition?: boolean;
}

export type FeedbackRating = 'accurate' | 'mostly-accurate' | 'wrong' | 'not-sure';
export type FeedbackKind = 'area' | 'subzone' | 'beach';

export interface FeedbackEntry {
  featureKind: FeedbackKind;
  featureId: string;
  dimension: FeedbackDimension;
  rating: FeedbackRating;
  note: string;
  updatedAt: string;
  /** Always first-hand-user; stored apart from dataset evidence and never merged into it. */
  sourceType: 'first-hand-user';
}

/** Keyed by feedbackKey(). */
export type FeedbackMap = Record<string, FeedbackEntry>;
