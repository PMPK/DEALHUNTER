import { RATINGS, RATING_LABEL } from '../domain/feedback';
import type { FeedbackEntry, FeedbackRating } from '../domain/types';

interface Props {
  areaName: string;
  entry?: FeedbackEntry;
  onChange: (patch: { rating?: FeedbackRating | null; note?: string }) => void;
}

export function FeedbackControl({ areaName, entry, onChange }: Props) {
  return (
    <div className="feedback">
      <div role="group" aria-label={`How accurate is the ${areaName} data?`} className="btn-row">
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            className={`btn rating rating-${r}`}
            aria-pressed={entry?.rating === r}
            onClick={() => onChange({ rating: entry?.rating === r ? null : r })}
          >
            {RATING_LABEL[r]}
          </button>
        ))}
      </div>
      <label className="note-label">
        <span className="small muted">Your note for {areaName}</span>
        <textarea
          rows={3}
          value={entry?.note ?? ''}
          placeholder="What is wrong, missing, or right? e.g. swimming only at high tide, vendors very persistent…"
          onChange={(e) => onChange({ note: e.target.value })}
        />
      </label>
      {entry ? <p className="muted small">Saved locally · {new Date(entry.updatedAt).toLocaleString()}</p> : null}
    </div>
  );
}
