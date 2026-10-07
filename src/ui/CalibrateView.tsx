import { useRef, useState } from 'react';
import { RATING_LABEL } from '../domain/feedback';
import type { Dataset, FeedbackMap, FeedbackRating } from '../domain/types';
import { FeedbackControl } from './FeedbackControl';
import { ScoreMeter } from './common';

interface Props {
  dataset: Dataset;
  feedback: FeedbackMap;
  onChange: (areaId: string, patch: { rating?: FeedbackRating | null; note?: string }) => void;
  onExport: () => void;
  onClear: () => void;
  storageOk: boolean;
  /** Last exported JSON, shown so it can be copied when downloads are blocked (e.g. sandboxed embeds). */
  exportJson?: string | null;
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
  const done = dataset.areas.filter((a) => feedback[a.id]).length;
  return (
    <div className="view calibrate" data-testid="calibrate-view">
      <h2>Reality Calibration</h2>
      <p>
        You have been to Zanzibar — tell the system where it is right or wrong. Feedback is kept in this browser's
        localStorage only. Export it as JSON to feed corrections back into the dataset.
      </p>
      {!storageOk ? <p className="unverified-note" role="alert">localStorage is unavailable — feedback will be lost on reload. Export before closing.</p> : null}
      <div className="calib-bar">
        <strong>{done}/{dataset.areas.length} areas rated</strong>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={onExport}>⬇ Export feedback JSON</button>
          <button type="button" className="btn btn-ghost" onClick={onClear} disabled={done === 0}>Clear all</button>
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
      {dataset.areas.map((a) => {
        const f = feedback[a.id];
        return (
          <article key={a.id} className="card calib-card" aria-label={`Calibrate ${a.name}`}>
            <h3>
              {a.name} {f ? <span className={`badge rating-tag rating-${f.rating}`}>{RATING_LABEL[f.rating]}</span> : <span className="badge">Not rated</span>}
            </h3>
            <div className="scores compact">
              <ScoreMeter item={a.scores.overall} label="Overall (seed)" feedback={f} />
              <ScoreMeter item={a.scores.beach} label="Beach (seed)" feedback={f} />
              <ScoreMeter item={a.scores.infrastructure} label="Infra (seed)" feedback={f} />
            </div>
            <FeedbackControl areaName={a.name} entry={f} onChange={(patch) => onChange(a.id, patch)} />
          </article>
        );
      })}
    </div>
  );
}
