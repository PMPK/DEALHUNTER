import type { Dataset, DemoOffer, Hotel } from '../domain/types';
import { formatDealScore } from '../domain/scoring';
import { DemoBanner } from './common';
import type { ExplorerTarget } from './RealityExplorer';

function OfferRow({ offer }: { offer: DemoOffer }) {
  return (
    <div className="offer" data-testid="demo-offer">
      <span className="badge demo">DEMO / NOT LIVE DATA</span>
      <div className="offer-main">
        <strong>
          {offer.price.amount} {offer.price.currency}
        </strong>{' '}
        <span className="muted">per {offer.price.per}</span>
      </div>
      <dl className="offer-grid">
        <dt>People</dt><dd>{offer.people}</dd>
        <dt>From</dt><dd>{offer.departureCity}</dd>
        <dt>Dates</dt><dd>{offer.departDate} → {offer.returnDate}</dd>
        <dt>Duration</dt><dd>{offer.nights} nights</dd>
        <dt>Board</dt><dd>{offer.board}</dd>
      </dl>
      <div className="deal-score muted">{formatDealScore(offer.dealScore)}</div>
    </div>
  );
}

export function HotelsSection({
  areaId,
  dataset,
  onExplore,
}: {
  areaId: string;
  dataset: Dataset;
  onExplore: (t: ExplorerTarget) => void;
}) {
  const hotels: Hotel[] = dataset.hotels.filter((h) => h.areaId === areaId);
  if (hotels.length === 0) {
    return <p className="muted">No demo hotels for this area yet.</p>;
  }
  return (
    <div>
      <DemoBanner>hotels and offers below are synthetic, invented only to demonstrate the future UI.</DemoBanner>
      {hotels.map((h) => (
        <article key={h.id} className="hotel">
          <h4>
            {h.name} <span className="badge demo">SYNTHETIC</span>
          </h4>
          <p className="muted small">{h.style} · {h.note}</p>
          <button
            type="button"
            className="btn btn-small"
            onClick={() =>
              onExplore({
                label: h.name,
                position: h.coordinates,
                caveat: 'Synthetic demo hotel — this position is not a real property.',
              })
            }
          >
            Use as Reality Explorer location
          </button>
          {dataset.offers.filter((o) => o.hotelId === h.id).map((o) => (
            <OfferRow key={o.id} offer={o} />
          ))}
        </article>
      ))}
    </div>
  );
}
