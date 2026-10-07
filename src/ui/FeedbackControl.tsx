import { RATINGS, RATING_LABEL } from '../domain/feedback';
import type { FeedbackEntry, FeedbackRating } from '../domain/types';

interface Props {
  /** Visible label, e.g. "Beach / swimming reality". */
  label: string;
  /** Unique within the page; used for ids and accessible names. */
  idPrefix: string;
  entry?: FeedbackEntry;
  onChange: (patch: { rating?: FeedbackRating | null; note?: string }) => void;
}

export function FeedbackControl({ label, idPrefix, entry, onChange }: Props) {
  return (
    <fieldset className="feedback">
      <legend>{label}</legend>
      <div role="group" aria-label={`Accuracy of: ${label}`} className="btn-row">
        {RATINGS.map((r) => (
          <button
            key={r}
            type="button"
            className={`btn btn-small rating rating-${r}`}
            aria-pressed={entry?.rating === r}
            onClick={() => onChange({ rating: entry?.rating === r ? null : r })}
          >
            {RATING_LABEL[r]}
          </button>
        ))}
      </div>
      <label htmlFor={`${idPrefix}-note`} className="small muted">Note ({label})</label>
      <textarea
        id={`${idPrefix}-note`}
        rows={2}
        value={entry?.note ?? ''}
        placeholder="What did you see? Corrections go here."
        onChange={(e) => onChange({ note: e.target.value })}
      />
      {entry ? <p className="muted small">Saved locally as first-hand-user · {new Date(entry.updatedAt).toLocaleString()}</p> : null}
    </fieldset>
  );
}
