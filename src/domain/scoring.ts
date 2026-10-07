import type {
  FeedbackEntry,
  Provenance,
  RealityWarning,
  VerificationStatus,
  WarningSeverity,
} from './types';

export type Band = 'strong' | 'mixed' | 'weak' | 'poor' | 'unknown';

export interface BandMeta {
  label: string;
  /** Short non-colour cue so the meaning never depends on colour alone. */
  symbol: string;
  color: string;
  /** Human-readable score range. */
  range: string;
}

/** green = strong, yellow = mixed, orange = weak, red = poor/problem. */
export const BANDS: Record<Band, BandMeta> = {
  strong: { label: 'Strong', symbol: '▲', color: '#2e9d57', range: '70–100' },
  mixed: { label: 'Mixed', symbol: '◆', color: '#e3b505', range: '50–69' },
  weak: { label: 'Weak', symbol: '▼', color: '#ee8a2b', range: '30–49' },
  poor: { label: 'Poor', symbol: '✖', color: '#d64045', range: '0–29' },
  unknown: { label: 'Unknown', symbol: '?', color: '#8a96a0', range: 'n/a' },
};

export function scoreBand(score: number | null): Band {
  if (score === null || Number.isNaN(score)) return 'unknown';
  if (score >= 70) return 'strong';
  if (score >= 50) return 'mixed';
  if (score >= 30) return 'weak';
  return 'poor';
}

export function formatScore(score: number | null): string {
  return score === null ? 'n/a' : String(Math.round(score));
}

export type ConfidenceLabel = 'Low' | 'Medium' | 'High';

export function confidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence < 0.34) return 'Low';
  if (confidence < 0.67) return 'Medium';
  return 'High';
}

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  verified: 'Verified',
  unverified: 'Unverified',
  disputed: 'Disputed',
};

export interface SeverityMeta {
  label: string;
  symbol: string;
  color: string;
  rank: number;
}

export const SEVERITY: Record<WarningSeverity, SeverityMeta> = {
  info: { label: 'Note', symbol: 'ℹ', color: '#e3b505', rank: 1 },
  caution: { label: 'Caution', symbol: '⚠', color: '#ee8a2b', rank: 2 },
  problem: { label: 'Problem', symbol: '⛔', color: '#d64045', rank: 3 },
};

export const NO_WARNING_COLOR = '#8a96a0';

export function worstSeverity(warnings: readonly Pick<RealityWarning, 'severity'>[]): WarningSeverity | null {
  let worst: WarningSeverity | null = null;
  for (const w of warnings) {
    if (worst === null || SEVERITY[w.severity].rank > SEVERITY[worst].rank) worst = w.severity;
  }
  return worst;
}

export interface EffectiveStatus {
  status: VerificationStatus;
  /** 'tester' when the local calibration feedback changed the status shown. */
  source: 'dataset' | 'tester';
}

/**
 * A tester marking an area "wrong" downgrades the displayed status to disputed.
 * Positive feedback never upgrades to verified — one visit is not a source.
 */
export function effectiveStatus(item: Pick<Provenance, 'verificationStatus'>, feedback?: FeedbackEntry): EffectiveStatus {
  if (feedback?.rating === 'wrong' && item.verificationStatus !== 'disputed') {
    return { status: 'disputed', source: 'tester' };
  }
  return { status: item.verificationStatus, source: 'dataset' };
}

export function formatDealScore(score: number | null): string {
  return score === null ? 'Deal Score: placeholder (not computed)' : `Deal Score: ${score}`;
}
