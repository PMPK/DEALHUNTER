import { useState } from 'react';
import { airportDistanceKm } from '../domain/geo';
import { SEVERITY, confidenceLabel, formatScore, scoreBand, BANDS, worstSeverity } from '../domain/scoring';
import type { Area, Dataset, FeedbackMap, ScoreKey } from '../domain/types';
import { ItemStatus, TagList } from './common';

const ROWS: Array<{ key: ScoreKey; label: string }> = [
  { key: 'overall', label: 'Area Reality Score' },
  { key: 'beach', label: 'Beach / Swimming' },
  { key: 'infrastructure', label: 'Infrastructure' },
];

function ScoreCell({ area, k, feedback }: { area: Area; k: ScoreKey; feedback: FeedbackMap }) {
  const item = area.scores[k];
  const meta = BANDS[scoreBand(item.score)];
  return (
    <td>
      <div className="cmp-score" style={{ color: meta.color }}>
        {formatScore(item.score)} <small>{meta.symbol} {meta.label}</small>
      </div>
      <div className="meter" aria-hidden="true">
        <div className="meter-fill" style={{ width: `${item.score ?? 0}%`, background: meta.color }} />
      </div>
      <div className="small muted">Confidence: {confidenceLabel(item.confidence)}</div>
      <div className="small"><ItemStatus item={item} feedback={feedback[area.id]} /></div>
    </td>
  );
}

export function CompareView({ dataset, feedback, initialA, initialB }: { dataset: Dataset; feedback: FeedbackMap; initialA?: string; initialB?: string }) {
  const [aId, setA] = useState(initialA ?? dataset.areas[0]!.id);
  const [bId, setB] = useState(initialB ?? dataset.areas.find((x) => x.id !== (initialA ?? dataset.areas[0]!.id))!.id);
  const a = dataset.areas.find((x) => x.id === aId)!;
  const b = dataset.areas.find((x) => x.id === bId)!;
  const areas = [a, b] as const;
  const select = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="select-label">
      <span className="small muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {dataset.areas.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
    </label>
  );
  return (
    <div className="view compare" data-testid="compare-view">
      <h2>Compare areas</h2>
      <p className="muted small">Seed values are unverified estimates — differences of a few points are noise.</p>
      <div className="compare-pickers">
        {select('Area A', aId, setA)}
        {select('Area B', bId, setB)}
      </div>
      {aId === bId ? <p className="unverified-note" role="alert">Pick two different areas to compare.</p> : null}
      <table className="cmp">
        <thead>
          <tr><th scope="col"><span className="sr-only">Metric</span></th><th scope="col">{a.name}</th><th scope="col">{b.name}</th></tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              {areas.map((x) => <ScoreCell key={x.id + r.key} area={x} k={r.key} feedback={feedback} />)}
            </tr>
          ))}
          <tr>
            <th scope="row">Distance to airport</th>
            {areas.map((x) => <td key={x.id}>≈ {airportDistanceKm(x, dataset.airport)} km<div className="small muted">straight-line</div></td>)}
          </tr>
          <tr>
            <th scope="row">Suitable for</th>
            {areas.map((x) => <td key={x.id}><TagList items={x.suitableFor} /></td>)}
          </tr>
          <tr>
            <th scope="row">Positives</th>
            {areas.map((x) => <td key={x.id}><ul className="plain pos">{x.positives.map((p) => <li key={p}>＋ {p}</li>)}</ul></td>)}
          </tr>
          <tr>
            <th scope="row">Negatives</th>
            {areas.map((x) => <td key={x.id}><ul className="plain neg">{x.negatives.map((p) => <li key={p}>－ {p}</li>)}</ul></td>)}
          </tr>
          <tr>
            <th scope="row">Warnings</th>
            {areas.map((x) => {
              const worst = worstSeverity(x.warnings);
              return (
                <td key={x.id}>
                  <div>{worst ? <strong>{SEVERITY[worst].symbol} {x.warnings.length} (worst: {SEVERITY[worst].label})</strong> : 'None recorded'}</div>
                  <ul className="plain small">{x.warnings.map((w) => <li key={w.id}>{w.title}</li>)}</ul>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
