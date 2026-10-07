import { describe, expect, it } from 'vitest';
import { BANDS, confidenceLabel, effectiveStatus, formatDealScore, formatScore, scoreBand, worstSeverity } from './scoring';
import type { FeedbackEntry } from './types';

const entry = (rating: FeedbackEntry['rating']): FeedbackEntry => ({ areaId: 'x', rating, note: '', updatedAt: '2026-01-01T00:00:00Z' });

describe('scoreBand', () => {
  it.each([
    [100, 'strong'], [70, 'strong'], [69, 'mixed'], [50, 'mixed'], [49, 'weak'], [30, 'weak'], [29, 'poor'], [0, 'poor'],
  ] as const)('score %i is %s', (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });
  it('treats null / NaN as unknown, never as a low score', () => {
    expect(scoreBand(null)).toBe('unknown');
    expect(scoreBand(Number.NaN)).toBe('unknown');
    expect(formatScore(null)).toBe('n/a');
  });
  it('maps bands to the agreed colour language and has a non-colour symbol for each', () => {
    expect(BANDS.strong.color).toMatch(/^#2e/i); // green
    const symbols = Object.values(BANDS).map((b) => b.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });
});

describe('confidenceLabel', () => {
  it('buckets confidence', () => {
    expect(confidenceLabel(0.1)).toBe('Low');
    expect(confidenceLabel(0.5)).toBe('Medium');
    expect(confidenceLabel(0.9)).toBe('High');
  });
});

describe('worstSeverity', () => {
  it('returns null for no warnings', () => expect(worstSeverity([])).toBeNull());
  it('picks the most severe', () => {
    expect(worstSeverity([{ severity: 'info' }, { severity: 'problem' }, { severity: 'caution' }])).toBe('problem');
    expect(worstSeverity([{ severity: 'info' }, { severity: 'caution' }])).toBe('caution');
  });
});

describe('effectiveStatus', () => {
  it('keeps the dataset status without feedback', () => {
    expect(effectiveStatus({ verificationStatus: 'unverified' })).toEqual({ status: 'unverified', source: 'dataset' });
  });
  it('downgrades to disputed when the tester says wrong', () => {
    expect(effectiveStatus({ verificationStatus: 'verified' }, entry('wrong'))).toEqual({ status: 'disputed', source: 'tester' });
  });
  it('never upgrades to verified from positive feedback', () => {
    expect(effectiveStatus({ verificationStatus: 'unverified' }, entry('accurate')).status).toBe('unverified');
  });
});

describe('formatDealScore', () => {
  it('labels the placeholder honestly', () => {
    expect(formatDealScore(null)).toMatch(/placeholder/i);
    expect(formatDealScore(82)).toBe('Deal Score: 82');
  });
});
