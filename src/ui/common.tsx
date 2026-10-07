import type { ReactNode } from 'react';
import { BANDS, STATUS_LABEL, confidenceLabel, effectiveStatus, formatScore, scoreBand } from '../domain/scoring';
import type { FeedbackEntry, Provenance, ScoredItem, VerificationStatus } from '../domain/types';

const STATUS_ICON: Record<VerificationStatus, string> = { verified: '✔', unverified: '?', disputed: '!' };

export function StatusBadge({ status, byTester }: { status: VerificationStatus; byTester?: boolean }) {
  return (
    <span className={`badge status-${status}`} title={byTester ? 'Downgraded by your own calibration feedback' : undefined}>
      <span aria-hidden="true">{STATUS_ICON[status]}</span> {STATUS_LABEL[status]}
      {byTester ? ' (by tester)' : ''}
    </span>
  );
}

export function ItemStatus({ item, feedback }: { item: Pick<Provenance, 'verificationStatus'>; feedback?: FeedbackEntry }) {
  const eff = effectiveStatus(item, feedback);
  return <StatusBadge status={eff.status} byTester={eff.source === 'tester'} />;
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span className="badge confidence" title={`Confidence ${Math.round(confidence * 100)}%`}>
      Confidence: {confidenceLabel(confidence)}
    </span>
  );
}

export function ScoreMeter({ item, label, feedback }: { item: ScoredItem; label: string; feedback?: FeedbackEntry }) {
  const band = scoreBand(item.score);
  const meta = BANDS[band];
  const width = item.score === null ? 0 : Math.max(2, Math.min(100, item.score));
  return (
    <div className="score-card" data-band={band}>
      <div className="score-label">{label}</div>
      <div className="score-value" style={{ color: meta.color }} aria-label={`${label}: ${formatScore(item.score)} out of 100, ${meta.label}`}>
        <span>{formatScore(item.score)}</span>
        <small>/100</small>
      </div>
      <div className="meter" aria-hidden="true">
        <div className="meter-fill" style={{ width: `${width}%`, background: meta.color }} />
      </div>
      <div className="score-band">
        <span aria-hidden="true">{meta.symbol}</span> {meta.label}
      </div>
      <ConfidenceBadge confidence={item.confidence} />
      <ItemStatus item={item} feedback={feedback} />
    </div>
  );
}

export function DemoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="demo-banner" role="note">
      <strong>DEMO / NOT LIVE DATA</strong> — {children}
    </div>
  );
}

export function Section({ title, children, open = true }: { title: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="section" open={open}>
      <summary>{title}</summary>
      <div className="section-body">{children}</div>
    </details>
  );
}

export function TagList({ items }: { items: string[] }) {
  return (
    <ul className="tags">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
