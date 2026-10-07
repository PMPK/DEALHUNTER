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
}

export function CalibrateView({ dataset, feedback, onChange, onExport, onClear, storageOk }: Props) {
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
