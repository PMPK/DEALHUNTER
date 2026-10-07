import { describe, expect, it } from 'vitest';
import { BANDS, confidenceLabel, formatScore, scoreBand, testerFlag, worstSeverity } from './scoring';
import type { FeedbackEntry } from './types';

const entry = (rating: FeedbackEntry['rating']): FeedbackEntry => ({ featureKind: 'area', featureId: 'x', dimension: 'overall', rating, note: '', updatedAt: 'x', sourceType: 'first-hand-user' });

describe('scoreBand', () => {
  it.each([[100, 'strong'], [70, 'strong'], [69, 'mixed'], [50, 'mixed'], [49, 'weak'], [30, 'weak'], [29, 'poor'], [0, 'poor']] as const)('%i → %s', (s, b) => {
    expect(scoreBand(s)).toBe(b);
  });
  it('null / NaN are unknown, never a low score', () => {
    expect(scoreBand(null)).toBe('unknown');
    expect(scoreBand(Number.NaN)).toBe('unknown');
    expect(formatScore(null)).toBe('n/a');
  });
  it('has a distinct non-colour symbol per band', () => {
    const symbols = Object.values(BANDS).map((b) => b.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });
});

describe('confidenceLabel / worstSeverity', () => {
  it('buckets confidence', () => {
    expect([0.1, 0.5, 0.9].map(confidenceLabel)).toEqual(['Low', 'Medium', 'High']);
  });
  it('picks the most severe warning', () => {
    expect(worstSeverity([])).toBeNull();
    expect(worstSeverity([{ severity: 'info' }, { severity: 'problem' }, { severity: 'caution' }])).toBe('problem');
  });
});

describe('testerFlag', () => {
  it('flags wrong / confirmed / neither without touching evidence', () => {
    expect(testerFlag(entry('wrong'))).toBe('wrong');
    expect(testerFlag(entry('accurate'))).toBe('confirmed');
    expect(testerFlag(entry('mostly-accurate'))).toBe('confirmed');
    expect(testerFlag(entry('not-sure'))).toBeNull();
    expect(testerFlag(undefined)).toBeNull();
  });
});
