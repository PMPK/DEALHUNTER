import type { ReactNode } from 'react';
import { BANDS, SOURCE_LABEL, STATUS_LABEL, confidenceLabel, formatScore, scoreBand } from '../domain/scoring';
import type { Assessment, Provenance, SourceType, VerificationStatus } from '../domain/types';

const STATUS_ICON: Record<VerificationStatus, string> = { verified: '✔', unverified: '?', disputed: '!' };

export function StatusBadge({ status }: { status: VerificationStatus }) {
  return (
    <span className={`badge status-${status}`}>
      <span aria-hidden="true">{STATUS_ICON[status]}</span> {STATUS_LABEL[status]}
    </span>
  );
}

export function SourceBadge({ sourceType }: { sourceType: SourceType }) {
  return <span className={`badge source-${sourceType}`}>Source: {SOURCE_LABEL[sourceType]}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span className="badge confidence" title={`Confidence ${Math.round(confidence * 100)}%`}>
      Confidence: {confidenceLabel(confidence)}
    </span>
  );
}

/** Badges + reasons + evidence for anything carrying provenance. */
export function ProvenanceDetails({ p }: { p: Provenance }) {
  return (
    <div className="prov">
      <div className="badge-row">
        <StatusBadge status={p.verificationStatus} />
        <SourceBadge sourceType={p.sourceType} />
        <ConfidenceBadge confidence={p.confidence} />
        <span className="badge">Updated {p.lastUpdated}</span>
      </div>
      {p.reasons.length > 0 ? (
        <ul className="small">
          {p.reasons.map((r) => <li key={r}>{r}</li>)}
        </ul>
      ) : null}
      {p.evidence.length > 0 ? (
        <ul className="small evidence">
          {p.evidence.map((e) => (
            <li key={e.label + (e.url ?? '') + (e.note ?? '')}>
              {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer">{e.label}</a> : e.label}
              {e.note ? <span className="muted"> — {e.note}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">No evidence entries.</p>
      )}
    </div>
  );
}

/** Score card for one assessment; `null` renders as an explicit "no evidence" state, never a number. */
export function ScoreMeter({ a, label }: { a: Assessment | null; label: string }) {
  const score = a?.score ?? null;
  const band = scoreBand(score);
  const meta = BANDS[band];
  return (
    <div className="score-card" data-band={band}>
      <div className="score-label">{label}</div>
      {score === null ? (
        <div className="score-value unknown">No score</div>
      ) : (
        <div className="score-value" style={{ color: meta.color }} aria-label={`${label}: ${formatScore(score)} out of 100, ${meta.label}`}>
          <span>{formatScore(score)}</span>
          <small>/100</small>
        </div>
      )}
      <div className="meter" aria-hidden="true">
        <div className="meter-fill" style={{ width: `${score ?? 0}%`, background: meta.color }} />
      </div>
      <div className="score-band">
        <span aria-hidden="true">{meta.symbol}</span> {score === null ? (a ? 'Unknown' : 'No evidence yet') : meta.label}
      </div>
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
