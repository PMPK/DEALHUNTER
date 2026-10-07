import type { Dataset, FeedbackEntry, FeedbackMap, FeedbackRating } from './types';

export const FEEDBACK_STORAGE_KEY = 'zanzibar-reality:feedback:v1';
export const EXPORT_SCHEMA_VERSION = 1;

export const RATING_LABEL: Record<FeedbackRating, string> = {
  accurate: 'Accurate',
  'mostly-accurate': 'Mostly accurate',
  wrong: 'Wrong',
  'not-sure': 'Not sure',
};

export const RATINGS: FeedbackRating[] = ['accurate', 'mostly-accurate', 'wrong', 'not-sure'];

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isEntry(v: unknown): v is FeedbackEntry {
  if (typeof v !== 'object' || v === null) return false;
  const e = v as Record<string, unknown>;
  return (
    typeof e.areaId === 'string' &&
    typeof e.note === 'string' &&
    typeof e.updatedAt === 'string' &&
    typeof e.rating === 'string' &&
    (RATINGS as string[]).includes(e.rating)
  );
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
      if (isEntry(value) && value.areaId === key) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** Returns false if the write failed (quota, private mode, ...). */
export function saveFeedback(map: FeedbackMap, storage: StorageLike | undefined = safeStorage()): boolean {
  try {
    storage?.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(map));
    return storage !== undefined;
  } catch {
    return false;
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** Pure update. Passing rating=null and an empty note removes the entry. */
export function withFeedback(
  map: FeedbackMap,
  areaId: string,
  patch: { rating?: FeedbackRating | null; note?: string },
  now: Date = new Date(),
): FeedbackMap {
  const prev = map[areaId];
  const rating = patch.rating === undefined ? prev?.rating ?? null : patch.rating;
  const note = patch.note ?? prev?.note ?? '';
  const next = { ...map };
  if (rating === null && note.trim() === '') {
    delete next[areaId];
    return next;
  }
  next[areaId] = { areaId, rating: rating ?? 'not-sure', note, updatedAt: now.toISOString() };
  return next;
}

export interface FeedbackExport {
  schema: 'zanzibar-reality-feedback';
  schemaVersion: number;
  exportedAt: string;
  datasetVersion: string;
  entries: Array<{
    areaId: string;
    areaName: string;
    rating: FeedbackRating;
    note: string;
    updatedAt: string;
    /** What the dataset claimed when the tester judged it — so corrections can be diffed. */
    seed: {
      overall: number | null;
      beach: number | null;
      infrastructure: number | null;
      verificationStatus: string;
    };
  }>;
}

export function buildFeedbackExport(feedback: FeedbackMap, dataset: Dataset, now: Date = new Date()): FeedbackExport {
  const entries = dataset.areas
    .filter((a) => feedback[a.id])
    .map((area) => {
      const f = feedback[area.id]!;
      return {
        areaId: area.id,
        areaName: area.name,
        rating: f.rating,
        note: f.note,
        updatedAt: f.updatedAt,
        seed: {
          overall: area.scores.overall.score,
          beach: area.scores.beach.score,
          infrastructure: area.scores.infrastructure.score,
          verificationStatus: area.scores.overall.verificationStatus,
        },
      };
    });
  return {
    schema: 'zanzibar-reality-feedback',
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    datasetVersion: dataset.datasetVersion,
    entries,
  };
}

export function exportFileName(now: Date = new Date()): string {
  return `zanzibar-reality-feedback-${now.toISOString().slice(0, 10)}.json`;
}
