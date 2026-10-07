import { describe, expect, it } from 'vitest';
import { fixtureDataset as d } from '../test/fixtures';
import { FEEDBACK_STORAGE_KEY, buildFeedbackExport, exportFileName, feedbackKey, loadFeedback, saveFeedback, withFeedback } from './feedback';

const NOW = new Date('2026-10-07T12:00:00Z');
const town = { kind: 'area', id: 'fx-town' } as const;

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(FEEDBACK_STORAGE_KEY, initial);
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('withFeedback (per dimension)', () => {
  it('keeps each dimension independent and tags it first-hand-user', () => {
    let m = withFeedback({}, town, 'beach', { rating: 'wrong', note: 'seaweed' }, NOW);
    m = withFeedback(m, town, 'overall', { rating: 'accurate' }, NOW);
    expect(Object.keys(m).sort()).toEqual([feedbackKey('area', 'fx-town', 'beach'), feedbackKey('area', 'fx-town', 'overall')].sort());
    expect(m[feedbackKey('area', 'fx-town', 'beach')]).toMatchObject({ rating: 'wrong', note: 'seaweed', dimension: 'beach', sourceType: 'first-hand-user' });
    m = withFeedback(m, town, 'beach', { rating: null, note: '' }, NOW);
    expect(m[feedbackKey('area', 'fx-town', 'beach')]).toBeUndefined();
    expect(m[feedbackKey('area', 'fx-town', 'overall')]).toBeDefined();
  });
  it('does not mutate its input; note-only entries become "not-sure"', () => {
    const empty = {};
    const next = withFeedback(empty, town, 'warnings', { note: 'hm' }, NOW);
    expect(empty).toEqual({});
    expect(next[feedbackKey('area', 'fx-town', 'warnings')]!.rating).toBe('not-sure');
  });
});

describe('localStorage', () => {
  it('round-trips', () => {
    const s = memoryStorage();
    const m = withFeedback({}, town, 'surroundings', { rating: 'mostly-accurate', note: 'n' }, NOW);
    expect(saveFeedback(m, s)).toBe(true);
    expect(loadFeedback(s)).toEqual(m);
  });
  it('survives corrupt, mismatched and throwing storage', () => {
    expect(loadFeedback(memoryStorage('{nope'))).toEqual({});
    expect(loadFeedback(memoryStorage('[]'))).toEqual({});
    const bad = JSON.stringify({ 'area:x:overall': { featureKind: 'area', featureId: 'x', dimension: 'overall', rating: 'accurate', note: '', updatedAt: 'x', sourceType: 'external-source' } });
    expect(loadFeedback(memoryStorage(bad))).toEqual({});
    const boom = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(loadFeedback(boom)).toEqual({});
    expect(saveFeedback({}, boom)).toBe(false);
  });
  it('ignores legacy v1 per-area feedback (different key, different schema)', () => {
    const s = { getItem: (k: string) => (k === 'zanzibar-reality:feedback:v1' ? '{"paje":{}}' : null), setItem: () => {} };
    expect(loadFeedback(s)).toEqual({});
  });
});

describe('buildFeedbackExport', () => {
  it('exports structured per-dimension entries as first-hand-user, with the dataset claims kept alongside', () => {
    let m = withFeedback({}, town, 'overall', { rating: 'wrong', note: 'should be lower' }, NOW);
    m = withFeedback(m, town, 'warnings', { rating: 'accurate' }, NOW);
    const out = buildFeedbackExport(m, d, NOW);
    expect(out).toMatchObject({ schema: 'zanzibar-reality-feedback', schemaVersion: 2, datasetVersion: d.meta.datasetVersion, exportedAt: NOW.toISOString() });
    expect(out.entries).toHaveLength(2);
    const overall = out.entries.find((e) => e.dimension === 'overall')!;
    expect(overall).toMatchObject({ featureKind: 'area', featureId: 'fx-town', featureName: 'FIXTURE Town', rating: 'wrong', note: 'should be lower', sourceType: 'first-hand-user' });
    expect(overall.datasetClaims.map((c) => c.id)).toEqual(['a1', 'a2', 'a4']);
    expect(overall.datasetClaims.find((c) => c.id === 'a4')!.sourceType).toBe('first-hand-user'); // dataset's own claims stay labelled
    expect(out.entries.find((e) => e.dimension === 'warnings')!.datasetClaims[0]).toMatchObject({ id: 'w1', severity: 'problem' });
  });
  it('never modifies the dataset evidence', () => {
    const before = JSON.stringify(d.evidence);
    buildFeedbackExport(withFeedback({}, town, 'overall', { rating: 'wrong' }, NOW), d, NOW);
    expect(JSON.stringify(d.evidence)).toBe(before);
  });
  it('exports an empty list for no feedback and names the file by date', () => {
    expect(buildFeedbackExport({}, d, NOW).entries).toEqual([]);
    expect(exportFileName(NOW)).toBe('zanzibar-reality-feedback-2026-10-07.json');
  });
});
