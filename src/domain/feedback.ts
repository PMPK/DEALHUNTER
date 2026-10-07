import { resolveAssessments, warningsFor } from './assess';
import { DIMENSION_LABEL, FEEDBACK_DIMENSIONS } from './dimensions';
import type {
  Dataset,
  FeatureRef,
  FeedbackDimension,
  FeedbackEntry,
  FeedbackKind,
  FeedbackMap,
  FeedbackRating,
  ScoreDimension,
} from './types';

/** v2: per-dimension feedback. v1 (per-area) entries are intentionally not migrated. */
export const FEEDBACK_STORAGE_KEY = 'zanzibar-reality:feedback:v2';
export const EXPORT_SCHEMA = 'zanzibar-reality-feedback';
export const EXPORT_SCHEMA_VERSION = 2;

export const RATING_LABEL: Record<FeedbackRating, string> = {
  accurate: 'Accurate',
  'mostly-accurate': 'Mostly accurate',
  wrong: 'Wrong',
  'not-sure': 'Not sure',
};
export const RATINGS: FeedbackRating[] = ['accurate', 'mostly-accurate', 'wrong', 'not-sure'];
export const FEEDBACK_KINDS: FeedbackKind[] = ['area', 'subzone', 'beach'];

export const feedbackKey = (kind: FeedbackKind, id: string, dimension: FeedbackDimension) => `${kind}:${id}:${dimension}`;

export const isFeedbackKind = (k: string): k is FeedbackKind => (FEEDBACK_KINDS as string[]).includes(k);

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isEntry(v: unknown): v is FeedbackEntry {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.featureId === 'string' &&
    typeof e.featureKind === 'string' &&
    isFeedbackKind(e.featureKind) &&
    typeof e.dimension === 'string' &&
    (FEEDBACK_DIMENSIONS as string[]).includes(e.dimension) &&
    typeof e.note === 'string' &&
    typeof e.updatedAt === 'string' &&
    typeof e.rating === 'string' &&
    (RATINGS as string[]).includes(e.rating) &&
    e.sourceType === 'first-hand-user'
  );
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** Never throws: corrupt or unavailable storage yields an empty map. */
export function loadFeedback(storage: StorageLike | undefined = safeStorage()): FeedbackMap {
  try {
    const raw = storage?.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: FeedbackMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (isEntry(value) && feedbackKey(value.featureKind, value.featureId, value.dimension) === key) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** Returns false if the write failed (quota, private mode, ...). */
export function saveFeedback(map: FeedbackMap, storage: StorageLike | undefined = safeStorage()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

/** Pure update. rating=null with an empty note removes the entry. */
export function withFeedback(
  map: FeedbackMap,
  target: { kind: FeedbackKind; id: string },
  dimension: FeedbackDimension,
  patch: { rating?: FeedbackRating | null; note?: string },
  now: Date = new Date(),
): FeedbackMap {
  const key = feedbackKey(target.kind, target.id, dimension);
  const prev = map[key];
  const rating = patch.rating === undefined ? (prev?.rating ?? null) : patch.rating;
  const note = patch.note ?? prev?.note ?? '';
  const next = { ...map };
  if (rating === null && note.trim() === '') {
    delete next[key];
    return next;
  }
  next[key] = {
    featureKind: target.kind,
    featureId: target.id,
    dimension,
    rating: rating ?? 'not-sure',
    note,
    updatedAt: now.toISOString(),
    sourceType: 'first-hand-user',
  };
  return next;
}

export interface ExportedClaim {
  id: string;
  score?: number | null;
  severity?: string;
  confidence: number;
  verificationStatus: string;
  sourceType: string;
  lastUpdated: string;
}

export interface FeedbackExport {
  schema: typeof EXPORT_SCHEMA;
  schemaVersion: number;
  exportedAt: string;
  datasetVersion: string;
  /** Everything below was entered by the tester and is first-hand-user evidence. */
  entries: Array<{
    featureKind: FeedbackKind;
    featureId: string;
    featureName: string | null;
    dimension: FeedbackDimension;
    dimensionLabel: string;
    rating: FeedbackRating;
    note: string;
    updatedAt: string;
    sourceType: 'first-hand-user';
    /** The dataset's claims at judgement time, kept separate so nothing is overwritten and corrections can be diffed. */
    datasetClaims: ExportedClaim[];
  }>;
}

function featureName(dataset: Dataset, kind: FeedbackKind, id: string): string | null {
  if (kind === 'beach') return dataset.beaches.find((b) => b.properties.id === id)?.properties.name ?? null;
  return dataset.areas.find((a) => a.properties.id === id)?.properties.name ?? null;
}

function claimsFor(dataset: Dataset, ref: FeatureRef, dimension: FeedbackDimension): ExportedClaim[] {
  if (dimension === 'warnings') {
    return warningsFor(dataset, ref).map((w) => ({
      id: w.id,
      severity: w.severity,
      confidence: w.confidence,
      verificationStatus: w.verificationStatus,
      sourceType: w.sourceType,
      lastUpdated: w.lastUpdated,
    }));
  }
  return resolveAssessments(dataset, ref, dimension as ScoreDimension).list.map((a) => ({
    id: a.id,
    score: a.score,
    confidence: a.confidence,
    verificationStatus: a.verificationStatus,
    sourceType: a.sourceType,
    lastUpdated: a.lastUpdated,
  }));
}

export function buildFeedbackExport(feedback: FeedbackMap, dataset: Dataset, now: Date = new Date()): FeedbackExport {
  const entries = Object.values(feedback)
    .sort((a, b) => a.featureKind.localeCompare(b.featureKind) || a.featureId.localeCompare(b.featureId) || a.dimension.localeCompare(b.dimension))
    .map((f) => ({
      featureKind: f.featureKind,
      featureId: f.featureId,
      featureName: featureName(dataset, f.featureKind, f.featureId),
      dimension: f.dimension,
      dimensionLabel: DIMENSION_LABEL[f.dimension],
      rating: f.rating,
      note: f.note,
      updatedAt: f.updatedAt,
      sourceType: f.sourceType,
      datasetClaims: claimsFor(dataset, { kind: f.featureKind, id: f.featureId }, f.dimension),
    }));
  return {
    schema: EXPORT_SCHEMA,
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    datasetVersion: dataset.meta.datasetVersion,
    entries,
  };
}

export function exportFileName(now: Date = new Date()): string {
  return `zanzibar-reality-feedback-${now.toISOString().slice(0, 10)}.json`;
}
