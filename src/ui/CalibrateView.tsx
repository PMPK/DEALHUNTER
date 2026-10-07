import { useRef, useState } from 'react';
import { resolveAssessments, warningsFor } from '../domain/assess';
import { DIMENSION_LABEL, FEEDBACK_DIMENSIONS } from '../domain/dimensions';
import { RATING_LABEL, feedbackKey } from '../domain/feedback';
import { SOURCE_LABEL, formatScore } from '../domain/scoring';
import type { Dataset, FeedbackDimension, FeedbackKind, FeedbackMap, FeedbackRating, ScoreDimension } from '../domain/types';
import { FeedbackControl } from './FeedbackControl';

interface Props {
  dataset: Dataset;
  feedback: FeedbackMap;
  onChange: (kind: FeedbackKind, id: string, dim: FeedbackDimension, patch: { rating?: FeedbackRating | null; note?: string }) => void;
  onExport: () => void;
  onClear: () => void;
  storageOk: boolean;
  /** Last exported JSON, shown so it can be copied when downloads are blocked (e.g. sandboxed embeds). */
  exportJson?: string | null;
}

interface Target {
  kind: FeedbackKind;
  id: string;
  name: string;
}

function claimSummary(dataset: Dataset, t: Target, dim: FeedbackDimension): string {
  if (dim === 'warnings') {
    const n = warningsFor(dataset, { kind: t.kind, id: t.id }).length;
    return n === 0 ? 'Dataset: no warnings recorded' : `Dataset: ${n} warning${n === 1 ? '' : 's'}`;
  }
  const a = resolveAssessments(dataset, { kind: t.kind, id: t.id }, dim as ScoreDimension).list[0];
  return a ? `Dataset: ${formatScore(a.score)} · ${a.verificationStatus} · ${SOURCE_LABEL[a.sourceType]}` : 'Dataset: no evidence yet';
}

export function CalibrateView({ dataset, feedback, onChange, onExport, onClear, storageOk, exportJson }: Props) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson ?? '');
      setCopied('ok');
    } catch {
      areaRef.current?.select();
      setCopied('fail');
    }
  };

  const targets: Target[] = [
    ...dataset.areas.map((a) => ({ kind: a.properties.kind, id: a.properties.id, name: a.properties.name })),
    ...dataset.beaches.map((b) => ({ kind: 'beach' as const, id: b.properties.id, name: b.properties.name })),
  ];
  const rated = Object.keys(feedback).length;
  return (
    <div className="view calibrate" data-testid="calibrate-view">
      <h2>Reality Calibration</h2>
      <p>
        Judge each dimension of each place separately. Your input is stored in this browser as <strong>first-hand-user</strong> evidence,
        next to the dataset’s claims and never over them. Export it as JSON to feed corrections into the next dataset.
      </p>
      {!storageOk ? <p className="unverified-note" role="alert">localStorage is unavailable — feedback will be lost on reload. Export before closing.</p> : null}
      <div className="calib-bar">
        <strong>{rated} dimension rating{rated === 1 ? '' : 's'} saved</strong>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={onExport}>⬇ Export feedback JSON</button>
          <button type="button" className="btn btn-ghost" onClick={onClear} disabled={rated === 0}>Clear all</button>
        </div>
      </div>
      {exportJson ? (
        <section className="card" aria-label="Exported feedback JSON">
          <h3>Exported feedback JSON</h3>
          <p className="muted small">If no file was downloaded, copy this text and save it as a .json file.</p>
          <textarea ref={areaRef} id="export-json" readOnly rows={8} value={exportJson} aria-label="Feedback JSON" />
          <div className="btn-row">
            <button type="button" className="btn" onClick={copy}>Copy JSON</button>
            {copied === 'ok' ? <span role="status">Copied.</span> : null}
            {copied === 'fail' ? <span role="status">Copy blocked — text selected, press Ctrl/Cmd+C.</span> : null}
          </div>
        </section>
      ) : null}
      {targets.length === 0 ? (
        <p className="card" data-testid="calibrate-empty">
          There are no areas or beaches in the dataset yet, so there is nothing to calibrate. Load a dataset with <code>areas.geojson</code> /
          <code> beaches.geojson</code> (see DATA_MODEL.md).
        </p>
      ) : null}
      {targets.map((t) => {
        const count = FEEDBACK_DIMENSIONS.filter((d) => feedback[feedbackKey(t.kind, t.id, d)]).length;
        return (
          <details key={`${t.kind}:${t.id}`} className="card calib-card" aria-label={`Calibrate ${t.name}`}>
            <summary><strong>{t.name}</strong> <span className="badge">{t.kind}</span> <span className="muted small">{count}/{FEEDBACK_DIMENSIONS.length} rated</span></summary>
            {FEEDBACK_DIMENSIONS.map((dim) => {
              const e = feedback[feedbackKey(t.kind, t.id, dim)];
              return (
                <div key={dim}>
                  <p className="small muted">{claimSummary(dataset, t, dim)}{e ? ` · you: ${RATING_LABEL[e.rating]}` : ''}</p>
                  <FeedbackControl idPrefix={`cal-${t.kind}-${t.id}-${dim}`} label={`${t.name}: ${DIMENSION_LABEL[dim]}`} entry={e} onChange={(patch) => onChange(t.kind, t.id, dim, patch)} />
                </div>
              );
            })}
          </details>
        );
      })}
    </div>
  );
}
