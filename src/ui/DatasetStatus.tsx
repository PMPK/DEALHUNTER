import type { Dataset } from '../domain/types';

export function datasetCounts(d: Dataset) {
  return [
    ['Areas / sub-zones', d.areas.length],
    ['Beaches', d.beaches.length],
    ['Attractions', d.attractions.length],
    ['Hotels', d.hotels.length],
    ['Assessments (scores)', d.evidence.assessments.length],
    ['Warnings', d.evidence.warnings.length],
    ['Local observations', d.evidence.observations.length],
    ['Radius analyses', d.evidence.radiusAnalyses.length],
  ] as const;
}

export function DatasetStatus({ dataset, problems }: { dataset: Dataset; problems: string[] }) {
  const counts = datasetCounts(dataset);
  const empty = counts.every(([, n]) => n === 0);
  return (
    <section className="card dataset-status" aria-label="Dataset status">
      <h2>Dataset</h2>
      <p className="small muted">Version {dataset.meta.datasetVersion}</p>
      {empty ? (
        <p className="unverified-note" role="note">
          No Zanzibar geometry or evidence is loaded. The map shows no scores because none have been supplied. You can still drop a
          pin and use the Reality Explorer links to inspect a place yourself.
        </p>
      ) : null}
      <dl className="offer-grid">
        {counts.map(([label, n]) => (
          <div key={label} className="count-row"><dt>{label}</dt><dd>{n}</dd></div>
        ))}
      </dl>
      {problems.length > 0 ? (
        <div role="alert" className="problems">
          <strong>{problems.length} dataset problem{problems.length === 1 ? '' : 's'}</strong>
          <ul className="small">{problems.slice(0, 12).map((p) => <li key={p}>{p}</li>)}</ul>
          {problems.length > 12 ? <p className="small">…and {problems.length - 12} more.</p> : null}
        </div>
      ) : (
        <p className="small muted">Dataset passes validation.</p>
      )}
    </section>
  );
}
