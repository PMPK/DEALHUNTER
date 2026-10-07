import type { Attraction } from '../domain/types';
import { StatusBadge } from './common';
import { CATEGORY_META } from './overlays';
import { RealityExplorer } from './RealityExplorer';

export function AttractionCard({ attraction, onClose }: { attraction: Attraction; onClose: () => void }) {
  const cat = CATEGORY_META[attraction.category];
  return (
    <section className="card attraction-card" aria-label={`Attraction: ${attraction.name}`}>
      <div className="card-head">
        <h3>
          <span aria-hidden="true">{cat.glyph}</span> {attraction.name}
        </h3>
        <button type="button" className="icon-btn" aria-label="Close attraction" onClick={onClose}>×</button>
      </div>
      <p className="meta">
        {cat.label} · Rating: {attraction.rating === null ? 'unknown' : `${attraction.rating}/5`} · <StatusBadge status={attraction.verificationStatus} />
      </p>
      <p>{attraction.description}</p>
      <p className="muted small">
        Source: {attraction.source.label}
        {attraction.source.url ? <> · <a href={attraction.source.url} target="_blank" rel="noopener noreferrer">link</a></> : null}
        {attraction.source.note ? ` — ${attraction.source.note}` : ''}
      </p>
      <p className="muted small">
        {attraction.coordinatesApproximate ? 'Coordinates approximate. ' : ''}Last updated {attraction.lastUpdated}.
      </p>
      <RealityExplorer
        target={{
          label: attraction.name,
          position: attraction.coordinates,
          caveat: attraction.coordinatesApproximate ? 'Seed coordinates are approximate — check the pin.' : undefined,
        }}
      />
    </section>
  );
}
