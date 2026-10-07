import { describe, expect, it } from 'vitest';
import { dataset } from '../data';
import { FEEDBACK_STORAGE_KEY, buildFeedbackExport, exportFileName, loadFeedback, saveFeedback, withFeedback } from './feedback';

const NOW = new Date('2026-10-07T12:00:00Z');

function memoryStorage(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(FEEDBACK_STORAGE_KEY, initial);
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe('withFeedback', () => {
  it('adds, updates and removes entries without mutating the input', () => {
    const empty = {};
    const a = withFeedback(empty, 'paje', { rating: 'wrong' }, NOW);
    expect(empty).toEqual({});
    expect(a.paje).toMatchObject({ rating: 'wrong', note: '', updatedAt: NOW.toISOString() });
    const b = withFeedback(a, 'paje', { note: 'tide!' }, NOW);
    expect(b.paje).toMatchObject({ rating: 'wrong', note: 'tide!' });
    const c = withFeedback(b, 'paje', { rating: null, note: '' }, NOW);
    expect(c.paje).toBeUndefined();
  });
  it('keeps a note-only entry as "not-sure"', () => {
    expect(withFeedback({}, 'paje', { note: 'hm' }, NOW).paje?.rating).toBe('not-sure');
  });
});

describe('localStorage persistence', () => {
  it('round-trips', () => {
    const s = memoryStorage();
    const fb = withFeedback({}, 'nungwi', { rating: 'accurate', note: 'great' }, NOW);
    expect(saveFeedback(fb, s)).toBe(true);
    expect(loadFeedback(s)).toEqual(fb);
  });
  it('survives corrupt JSON, wrong shapes and throwing storage', () => {
    expect(loadFeedback(memoryStorage('{not json'))).toEqual({});
    expect(loadFeedback(memoryStorage('[1,2]'))).toEqual({});
    expect(loadFeedback(memoryStorage(JSON.stringify({ paje: { areaId: 'paje', rating: 'bogus', note: '', updatedAt: 'x' } })))).toEqual({});
    const boom = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadFeedback(boom)).toEqual({});
    expect(saveFeedback({}, boom)).toBe(false);
  });
});

describe('buildFeedbackExport', () => {
  it('exports only rated areas, with a seed snapshot to diff corrections against', () => {
    const fb = withFeedback({}, 'paje', { rating: 'mostly-accurate', note: 'swimming only at high tide' }, NOW);
    const out = buildFeedbackExport(fb, dataset, NOW);
    expect(out.schema).toBe('zanzibar-reality-feedback');
    expect(out.datasetVersion).toBe(dataset.datasetVersion);
    expect(out.exportedAt).toBe(NOW.toISOString());
    expect(out.entries).toHaveLength(1);
    const paje = dataset.areas.find((a) => a.id === 'paje')!;
    expect(out.entries[0]).toMatchObject({
      areaId: 'paje', areaName: 'Paje', rating: 'mostly-accurate', note: 'swimming only at high tide',
      seed: { overall: paje.scores.overall.score, beach: paje.scores.beach.score, infrastructure: paje.scores.infrastructure.score },
    });
  });
  it('names the file by date', () => {
    expect(exportFileName(NOW)).toBe('zanzibar-reality-feedback-2026-10-07.json');
  });
});
