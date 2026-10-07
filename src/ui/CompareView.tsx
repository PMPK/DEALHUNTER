import { useState } from 'react';
import { resolveAssessments, warningsFor } from '../domain/assess';
import { DIMENSION_LABEL, SCORE_DIMENSIONS } from '../domain/dimensions';
import { airportDistanceKm, geometryCenter } from '../domain/geo';
import { BANDS, SEVERITY, SOURCE_LABEL, STATUS_LABEL, confidenceLabel, formatScore, scoreBand, worstSeverity } from '../domain/scoring';
import type { AreaFeature, Dataset, FeatureRef } from '../domain/types';

const refOf = (a: AreaFeature): FeatureRef => ({ kind: a.properties.kind, id: a.properties.id });

function Cell({ dataset, area, dim }: { dataset: Dataset; area: AreaFeature; dim: (typeof SCORE_DIMENSIONS)[number] }) {
  const { list, inheritedFrom } = resolveAssessments(dataset, refOf(area), dim);
  const a = list[0];
  if (!a) return <td><span className="muted">No evidence yet</span></td>;
  const band = BANDS[scoreBand(a.score)];
  return (
    <td>
      <div className="cmp-score" style={{ color: band.color }}>{formatScore(a.score)} <small>{band.symbol} {a.score === null ? 'Unknown' : band.label}</small></div>
      <div className="small muted">Confidence: {confidenceLabel(a.confidence)}</div>
      <div className="small">{STATUS_LABEL[a.verificationStatus]} · {SOURCE_LABEL[a.sourceType]}</div>
      {inheritedFrom ? <div className="small muted">Inherited from {inheritedFrom.properties.name}</div> : null}
      {list.length > 1 ? <div className="small muted">+{list.length - 1} more assessment{list.length === 2 ? '' : 's'}</div> : null}
    </td>
  );
}

export function CompareView({ dataset, initialA }: { dataset: Dataset; initialA?: string }) {
  const options = dataset.areas;
  const [aId, setA] = useState(initialA ?? options[0]?.properties.id ?? '');
  const [bId, setB] = useState(options.find((x) => x.properties.id !== (initialA ?? options[0]?.properties.id))?.properties.id ?? '');

  if (options.length < 2) {
    return (
      <div className="view compare" data-testid="compare-view">
        <h2>Compare areas</h2>
        <p className="card">Comparison needs at least two areas in the dataset (found {options.length}). Supply <code>areas.geojson</code> to enable it.</p>
      </div>
    );
  }
  const a = options.find((x) => x.properties.id === aId) ?? options[0]!;
  const b = options.find((x) => x.properties.id === bId) ?? options[1]!;
  const both = [a, b] as const;
  const select = (label: string, value: string, onChange: (v: string) => void) => (
    <label className="select-label">
      <span className="small muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((x) => <option key={x.properties.id} value={x.properties.id}>{x.properties.name}{x.properties.kind === 'subzone' ? ' (sub-zone)' : ''}</option>)}
      </select>
    </label>
  );
  return (
    <div className="view compare" data-testid="compare-view">
      <h2>Compare areas</h2>
      <p className="muted small">Only evidence in the dataset is shown. “No evidence yet” means unknown.</p>
      <div className="compare-pickers">{select('Area A', a.properties.id, setA)}{select('Area B', b.properties.id, setB)}</div>
      {a === b ? <p className="unverified-note" role="alert">Pick two different areas to compare.</p> : null}
      <table className="cmp">
        <thead><tr><th scope="col"><span className="sr-only">Metric</span></th><th scope="col">{a.properties.name}</th><th scope="col">{b.properties.name}</th></tr></thead>
        <tbody>
          {SCORE_DIMENSIONS.map((dim) => (
            <tr key={dim}><th scope="row">{DIMENSION_LABEL[dim]}</th>{both.map((x) => <Cell key={x.properties.id + dim} dataset={dataset} area={x} dim={dim} />)}</tr>
          ))}
          <tr>
            <th scope="row">Warnings</th>
            {both.map((x) => {
              const ws = warningsFor(dataset, refOf(x));
              const worst = worstSeverity(ws);
              return (
                <td key={x.properties.id}>
                  {worst ? <strong>{SEVERITY[worst].symbol} {ws.length} (worst: {SEVERITY[worst].label})</strong> : <span className="muted">None recorded</span>}
                  <ul className="plain small">{ws.map((w) => <li key={w.id}>{w.title}</li>)}</ul>
                </td>
              );
            })}
          </tr>
          <tr>
            <th scope="row">Distance to airport</th>
            {both.map((x) => {
              const c = geometryCenter(x.geometry);
              const km = c ? airportDistanceKm(c, dataset.meta.airport) : null;
              return <td key={x.properties.id}>{km === null ? <span className="muted">Unknown</span> : <>≈ {km} km<div className="small muted">straight-line from bbox centre</div></>}</td>;
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
