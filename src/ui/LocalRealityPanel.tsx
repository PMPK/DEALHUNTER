import { containingAreas, observationsFor, radiusAnalysesFor, relevantRefs, resolveAssessments, warningsFor } from '../domain/assess';
import { DIMENSION_LABEL, FEEDBACK_DIMENSIONS, LOCAL_TOPICS, SCORE_DIMENSIONS, TOPIC_LABEL, WARNING_CATEGORY_LABEL } from '../domain/dimensions';
import { RATING_LABEL, feedbackKey, isFeedbackKind } from '../domain/feedback';
import { airportDistanceKm, attractionsWithin } from '../domain/geo';
import { SEVERITY } from '../domain/scoring';
import {
  RADII_M,
  type Assessment,
  type Dataset,
  type FeedbackDimension,
  type FeedbackKind,
  type FeedbackMap,
  type FeedbackRating,
  type RadiusM,
  type Selection,
} from '../domain/types';
import { FeedbackControl } from './FeedbackControl';
import { RealityExplorer } from './RealityExplorer';
import { ProvenanceDetails, ScoreMeter, Section, SourceBadge, StatusBadge } from './common';
import { CATEGORY_GLYPH } from './layers';

const KIND_LABEL = { area: 'Area', subzone: 'Sub-zone', beach: 'Beach', hotel: 'Hotel', attraction: 'Attraction', point: 'Dropped pin' } as const;

interface Props {
  dataset: Dataset;
  selection: Selection;
  radius: RadiusM;
  feedback: FeedbackMap;
  testerMode: boolean;
  onRadius: (r: RadiusM) => void;
  onFeedback: (kind: FeedbackKind, id: string, dim: FeedbackDimension, patch: { rating?: FeedbackRating | null; note?: string }) => void;
  onCompare: () => void;
  onClose: () => void;
}

function FeatureDetails({ dataset, selection }: { dataset: Dataset; selection: Selection }) {
  const { kind, id } = selection.ref;
  if (kind === 'hotel') {
    const h = dataset.hotels.find((x) => x.id === id);
    if (!h) return null;
    return (
      <div>
        {h.synthetic ? <p className="demo-banner" role="note"><strong>TEST FIXTURE</strong> — synthetic hotel, not a real property.</p> : null}
        <div className="badge-row"><StatusBadge status={h.verificationStatus} /><SourceBadge sourceType={h.sourceType} /></div>
        <p className="muted small">Source: {h.source.label}{h.source.url ? <> · <a href={h.source.url} target="_blank" rel="noopener noreferrer">link</a></> : null}{h.source.note ? ` — ${h.source.note}` : ''}</p>
        {h.coordinatesApproximate ? <p className="muted small">Coordinates approximate.</p> : null}
        {h.note ? <p className="small">{h.note}</p> : null}
      </div>
    );
  }
  if (kind === 'attraction') {
    const a = dataset.attractions.find((x) => x.id === id);
    if (!a) return null;
    return (
      <div>
        <p className="meta">{CATEGORY_GLYPH[a.category]} {a.category} · Rating: {a.rating === null ? 'unknown' : `${a.rating}/5`}</p>
        <div className="badge-row"><StatusBadge status={a.verificationStatus} /><SourceBadge sourceType={a.sourceType} /></div>
        <p>{a.description}</p>
        <p className="muted small">Source: {a.source.label}{a.source.url ? <> · <a href={a.source.url} target="_blank" rel="noopener noreferrer">link</a></> : null}{a.source.note ? ` — ${a.source.note}` : ''} · updated {a.lastUpdated}</p>
        {a.coordinatesApproximate ? <p className="muted small">Coordinates approximate.</p> : null}
      </div>
    );
  }
  if (kind === 'area' || kind === 'subzone') {
    const f = dataset.areas.find((x) => x.properties.id === id);
    const parent = f?.properties.parentId ? dataset.areas.find((x) => x.properties.id === f.properties.parentId) : null;
    return (
      <div>
        {parent ? <p className="small muted">Part of {parent.properties.name}</p> : null}
        {f?.properties.description ? <p>{f.properties.description}</p> : null}
      </div>
    );
  }
  if (kind === 'beach') {
    const f = dataset.beaches.find((x) => x.properties.id === id);
    const area = f?.properties.areaId ? dataset.areas.find((x) => x.properties.id === f.properties.areaId) : null;
    return (
      <div>
        {area ? <p className="small muted">In {area.properties.name}</p> : null}
        {f?.properties.description ? <p>{f.properties.description}</p> : null}
      </div>
    );
  }
  return <p className="small muted">A point you dropped on the map. Nothing about it is stored.</p>;
}

export function LocalRealityPanel({ dataset, selection, radius, feedback, testerMode, onRadius, onFeedback, onCompare, onClose }: Props) {
  const { ref, position } = selection;
  const refs = relevantRefs(dataset, ref, position);
  const fbKind = isFeedbackKind(ref.kind) ? ref.kind : null;
  const containers = ref.kind === 'area' || ref.kind === 'subzone' || ref.kind === 'beach' ? [] : containingAreas(dataset, position);
  const km = airportDistanceKm(position, dataset.meta.airport);
  const nearby = attractionsWithin(position, dataset.attractions, radius).filter((n) => !(ref.kind === 'attraction' && n.attraction.id === ref.id));

  return (
    <section className="card local-panel" aria-label={`Local reality: ${selection.label}`}>
      <div className="card-head">
        <div>
          <p className="kind-tag">{KIND_LABEL[ref.kind]}</p>
          <h2>{selection.label}</h2>
        </div>
        <button type="button" className="icon-btn" aria-label="Close details" onClick={onClose}>×</button>
      </div>
      <FeatureDetails dataset={dataset} selection={selection} />

      <Section title="Reality Explorer">
        <RealityExplorer
          target={{
            label: selection.label,
            position,
            caveat: selection.derivedPosition ? 'Centre of the feature’s bounding box — a starting point, not a precise location.' : undefined,
          }}
        />
        <p className="muted small">Click empty map to drop a pin and inspect any spot yourself.</p>
      </Section>

      <Section title="Reality scores">
        {containers.length > 0 ? <p className="small muted">Located inside: {containers.map((c) => c.properties.name).join(', ')} (derived from polygons)</p> : null}
        <div className="scores">
          {SCORE_DIMENSIONS.map((dim) => {
            const entries = refs.map((r) => ({ ...r, res: resolveAssessments(dataset, r.ref, dim) }));
            const lead = entries.find((e) => e.res.list.length > 0);
            const headline: Assessment | null = lead?.res.list[0] ?? null;
            const others = entries.flatMap((e) => e.res.list.map((a) => ({ a, from: e.own ? null : e.label, inherited: e.res.inheritedFrom?.properties.name ?? null }))).filter((x) => x.a !== headline);
            const flag = fbKind ? feedback[feedbackKey(fbKind, ref.id, dim)] : undefined;
            return (
              <div key={dim} className="score-block">
                <ScoreMeter a={headline} label={DIMENSION_LABEL[dim]} />
                {headline ? (
                  <>
                    {lead && !lead.own ? <p className="small muted">From {lead.label}</p> : null}
                    {lead?.res.inheritedFrom ? <p className="small muted">Inherited from parent area {lead.res.inheritedFrom.properties.name}</p> : null}
                    <ProvenanceDetails p={headline} />
                  </>
                ) : (
                  <p className="small muted">No evidence has been supplied for this dimension. It is unknown, not zero.</p>
                )}
                {flag ? <p className="small"><strong>Your feedback:</strong> {RATING_LABEL[flag.rating]}{flag.note ? ` — ${flag.note}` : ''} <span className="muted">(first-hand-user; dataset evidence unchanged)</span></p> : null}
                {others.length > 0 ? (
                  <details className="small">
                    <summary>{others.length} other assessment{others.length === 1 ? '' : 's'}</summary>
                    {others.map(({ a, from, inherited }) => (
                      <div key={a.id} className="other-assessment">
                        <strong>{a.score === null ? 'No score' : `${a.score}/100`}</strong>{from ? ` · from ${from}` : ''}{inherited ? ` · inherited from ${inherited}` : ''}
                        <ProvenanceDetails p={a} />
                      </div>
                    ))}
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Environmental / industrial warnings">
        {(() => {
          const items = refs.flatMap((r) => warningsFor(dataset, r.ref).map((w) => ({ w, from: r.own ? null : r.label })));
          const flag = fbKind ? feedback[feedbackKey(fbKind, ref.id, 'warnings')] : undefined;
          return (
            <>
              {items.length === 0 ? <p className="muted small">No warnings recorded. That is not evidence that there are none.</p> : (
                <ul className="plain warnings">
                  {items.map(({ w, from }) => (
                    <li key={w.id} className={`warning sev-${w.severity}`}>
                      <div className="warning-head"><span aria-hidden="true">{SEVERITY[w.severity].symbol}</span> <strong>{SEVERITY[w.severity].label} · {WARNING_CATEGORY_LABEL[w.category]}: {w.title}</strong>{from ? <span className="muted small"> (from {from})</span> : null}</div>
                      <p>{w.detail}</p>
                      <ProvenanceDetails p={w} />
                    </li>
                  ))}
                </ul>
              )}
              {flag ? <p className="small"><strong>Your feedback:</strong> {RATING_LABEL[flag.rating]}{flag.note ? ` — ${flag.note}` : ''}</p> : null}
            </>
          );
        })()}
      </Section>

      <Section title="Local reality">
        <div className="radius-bar" role="group" aria-label="Analysis radius">
          <span className="small muted">Radius</span>
          {RADII_M.map((r) => (
            <button key={r} type="button" className="btn btn-small" aria-pressed={radius === r} onClick={() => onRadius(r)}>
              {r < 1000 ? `${r} m` : '1 km'}
            </button>
          ))}
        </div>
        <ul className="plain topics">
          {LOCAL_TOPICS.map((topic) => {
            const obs = refs.flatMap((r) => observationsFor(dataset, r.ref, topic).filter((o) => o.radiusM === undefined || o.radiusM === radius).map((o) => ({ o, from: r.own ? null : r.label })));
            const derived: string[] = [];
            if (topic === 'key-attractions') {
              for (const n of nearby.slice(0, 8)) derived.push(`${n.attraction.name} — ${Math.round(n.distanceM)} m`);
            }
            if (topic === 'distance-context') {
              if (containers.length > 0) derived.push(`Inside: ${containers.map((c) => c.properties.name).join(', ')}`);
              derived.push(km === null ? 'Distance to airport: unknown (no airport reference in the dataset)' : `Airport: ≈ ${km} km straight-line (not driving time)`);
            }
            return (
              <li key={topic} className="topic">
                <h4>{TOPIC_LABEL[topic]}</h4>
                {obs.length === 0 && derived.length === 0 ? <p className="muted small">No evidence yet.</p> : null}
                {obs.map(({ o, from }) => (
                  <div key={o.id} className="observation">
                    <p>{o.text}{from ? <span className="muted small"> (from {from})</span> : null}{o.radiusM ? <span className="muted small"> · within {o.radiusM} m</span> : null}</p>
                    <ProvenanceDetails p={o} />
                  </div>
                ))}
                {derived.length > 0 ? (
                  <div className="observation">
                    <div className="badge-row"><span className="badge source-derived">Source: Derived</span><span className="badge">Computed from dataset geometry within {radius} m</span></div>
                    <ul className="small">{derived.map((d) => <li key={d}>{d}</li>)}</ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <h4>Surroundings analysis within {radius < 1000 ? `${radius} m` : '1 km'}</h4>
        {(() => {
          const analyses = refs.flatMap((r) => radiusAnalysesFor(dataset, r.ref, radius).map((a) => ({ a, from: r.own ? null : r.label })));
          if (analyses.length === 0) {
            return <p className="muted small" data-testid="radius-empty">Not computed. Automated surroundings analysis is not implemented and no analysis for this radius has been supplied.</p>;
          }
          return analyses.map(({ a, from }) => (
            <div key={a.id} className="observation">
              <p className="small muted">Method: {a.method}{from ? ` · from ${from}` : ''}</p>
              <table className="metrics"><tbody>
                {a.metrics.map((m) => <tr key={m.key}><th scope="row">{m.label}</th><td>{m.value === null ? 'unknown' : `${m.value}${m.unit ? ` ${m.unit}` : ''}`}</td></tr>)}
              </tbody></table>
              <ProvenanceDetails p={a} />
            </div>
          ));
        })()}
      </Section>

      {fbKind ? (
        <div className="btn-row">
          <button type="button" className="btn" onClick={onCompare}>⇄ Compare with another area</button>
        </div>
      ) : null}

      {fbKind && testerMode ? (
        <Section title="Reality calibration (tester mode)">
          <p className="muted small">You have been here: judge each dimension on its own. Stored only in this browser as first-hand-user; it never edits the dataset evidence.</p>
          {FEEDBACK_DIMENSIONS.map((dim) => (
            <FeedbackControl
              key={dim}
              idPrefix={`fb-${fbKind}-${ref.id}-${dim}`}
              label={DIMENSION_LABEL[dim]}
              entry={feedback[feedbackKey(fbKind, ref.id, dim)]}
              onChange={(patch) => onFeedback(fbKind, ref.id, dim, patch)}
            />
          ))}
        </Section>
      ) : null}
    </section>
  );
}
