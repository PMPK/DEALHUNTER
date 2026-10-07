import { airportDistanceKm, nearbyAttractions } from '../domain/geo';
import { SEVERITY } from '../domain/scoring';
import type { Area, Dataset, FeedbackEntry, FeedbackRating, ScoreKey } from '../domain/types';
import { FeedbackControl } from './FeedbackControl';
import { HotelsSection } from './HotelsSection';
import { RealityExplorer, type ExplorerTarget } from './RealityExplorer';
import { ItemStatus, ScoreMeter, Section, TagList } from './common';
import { CATEGORY_META } from './overlays';

const SCORE_LABELS: Record<ScoreKey, string> = {
  overall: 'Area Reality Score',
  beach: 'Beach / Swimming',
  infrastructure: 'Infrastructure',
};
const KEYS: ScoreKey[] = ['overall', 'beach', 'infrastructure'];

interface Props {
  area: Area;
  dataset: Dataset;
  feedback?: FeedbackEntry;
  testerMode: boolean;
  explorerTarget: ExplorerTarget;
  onExplore: (t: ExplorerTarget) => void;
  onSelectAttraction: (id: string) => void;
  onFeedback: (patch: { rating?: FeedbackRating | null; note?: string }) => void;
  onCompare: () => void;
  onClose: () => void;
}

export function AreaPanel({ area, dataset, feedback, testerMode, explorerTarget, onExplore, onSelectAttraction, onFeedback, onCompare, onClose }: Props) {
  const nearby = nearbyAttractions(area, dataset.attractions);
  const km = airportDistanceKm(area, dataset.airport);
  return (
    <section className="card area-panel" aria-label={`Area details: ${area.name}`}>
      <div className="card-head">
        <h2>{area.name}</h2>
        <button type="button" className="icon-btn" aria-label="Close area details" onClick={onClose}>×</button>
      </div>
      <p>{area.summary}</p>
      {area.scores.overall.verificationStatus !== 'verified' ? (
        <p className="unverified-note" role="note">
          ? Seed values below are <strong>unverified</strong> editorial estimates, not facts. Treat them as hypotheses to check.
        </p>
      ) : null}

      <div className="scores">
        {KEYS.map((k) => (
          <ScoreMeter key={k} item={area.scores[k]} label={SCORE_LABELS[k]} feedback={feedback} />
        ))}
      </div>

      <div className="two-col">
        <div>
          <h3>Main positives</h3>
          <ul className="plain pos">{area.positives.map((p) => <li key={p}>＋ {p}</li>)}</ul>
        </div>
        <div>
          <h3>Main negatives</h3>
          <ul className="plain neg">{area.negatives.map((p) => <li key={p}>－ {p}</li>)}</ul>
        </div>
      </div>

      <h3>Warnings</h3>
      {area.warnings.length === 0 ? (
        <p className="muted">No warnings recorded. That does not mean none exist.</p>
      ) : (
        <ul className="plain warnings">
          {area.warnings.map((w) => (
            <li key={w.id} className={`warning sev-${w.severity}`}>
              <div className="warning-head">
                <span aria-hidden="true">{SEVERITY[w.severity].symbol}</span> <strong>{SEVERITY[w.severity].label}: {w.title}</strong>
              </div>
              <p>{w.detail}</p>
              <p className="small"><ItemStatus item={w} feedback={feedback} /> <span className="muted">Confidence {Math.round(w.confidence * 100)}% · updated {w.lastUpdated}</span></p>
            </li>
          ))}
        </ul>
      )}

      <dl className="facts">
        <dt>Distance to airport (ZNZ)</dt>
        <dd>≈ {km} km straight-line <span className="muted small">(not driving distance or time)</span></dd>
        <dt>Suitable for</dt>
        <dd><TagList items={area.suitableFor} /></dd>
      </dl>

      <Section title="Reality Explorer">
        <RealityExplorer target={explorerTarget} />
        <p className="muted small">Tip: click empty map to drop a pin and explore that exact spot.</p>
      </Section>

      <Section title={`Nearby attractions (${nearby.length})`}>
        {nearby.length === 0 ? <p className="muted">None in the seed data.</p> : (
          <ul className="plain">
            {nearby.map(({ attraction, distanceKm }) => (
              <li key={attraction.id}>
                <button type="button" className="link-btn" onClick={() => onSelectAttraction(attraction.id)}>
                  <span aria-hidden="true">{CATEGORY_META[attraction.category].glyph}</span> {attraction.name}
                </button>{' '}
                <span className="muted small">≈ {distanceKm.toFixed(0)} km · {attraction.verificationStatus}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Hotels & demo offers" open={false}>
        <HotelsSection areaId={area.id} dataset={dataset} onExplore={onExplore} />
      </Section>

      <Section title="Why these scores" open={false}>
        {KEYS.map((k) => (
          <div key={k}>
            <h4>{SCORE_LABELS[k]}</h4>
            <ul>{area.scores[k].reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>
        ))}
      </Section>

      <Section title="Sources & evidence" open={false}>
        {KEYS.map((k) => (
          <div key={k}>
            <h4>{SCORE_LABELS[k]}</h4>
            <ul>
              {area.scores[k].evidence.map((e) => (
                <li key={e.label + (e.note ?? '')}>
                  {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer">{e.label}</a> : e.label}
                  {e.note ? <span className="muted"> — {e.note}</span> : null}
                </li>
              ))}
            </ul>
            <p className="muted small">Last updated {area.scores[k].lastUpdated}</p>
          </div>
        ))}
      </Section>

      <div className="btn-row">
        <button type="button" className="btn" onClick={onCompare}>⇄ Compare with another area</button>
      </div>

      {testerMode ? (
        <Section title="Reality calibration (tester mode)">
          <p className="muted small">You have visited: how accurate is this area's data? Stored only in this browser.</p>
          <FeedbackControl areaName={area.name} entry={feedback} onChange={onFeedback} />
        </Section>
      ) : null}
    </section>
  );
}
