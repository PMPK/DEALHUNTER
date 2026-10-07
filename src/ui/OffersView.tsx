import { useMemo, useState } from 'react';
import { EMPTY_CRITERIA, filterOffers, joinOffers, sortOffers, type OfferCriteria, type OfferSort } from '../domain/offers';
import { BANDS, SEVERITY, formatDealScore, formatScore, scoreBand, worstSeverity } from '../domain/scoring';
import type { BoardType, Dataset } from '../domain/types';
import { DemoBanner } from './common';

const BOARDS: BoardType[] = ['All inclusive', 'Half board', 'Bed & breakfast', 'Room only'];
const SORTS: Array<[OfferSort, string]> = [
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['reality-desc', 'Area reality score'],
  ['beach-desc', 'Beach / swimming score'],
  ['nights-desc', 'Longest stay'],
  ['date-asc', 'Earliest departure'],
];
const numOrNull = (v: string) => (v === '' ? null : Number(v));

function Chip({ label, score }: { label: string; score: number | null }) {
  const b = BANDS[scoreBand(score)];
  return (
    <span className="reality-chip" style={{ borderColor: b.color }} title={`${label} (seed, unverified): ${formatScore(score)} ${b.label}`}>
      {label} <strong style={{ color: b.color }}>{formatScore(score)}{b.symbol}?</strong>
    </span>
  );
}

export function OffersView({ dataset, onShowArea }: { dataset: Dataset; onShowArea: (areaId: string) => void }) {
  const [c, setC] = useState<OfferCriteria>(EMPTY_CRITERIA);
  const [sort, setSort] = useState<OfferSort>('price-asc');
  const set = <K extends keyof OfferCriteria>(k: K, v: OfferCriteria[K]) => setC((p) => ({ ...p, [k]: v }));

  const all = useMemo(() => joinOffers(dataset.offers, dataset.hotels, dataset.areas), [dataset]);
  const cities = useMemo(() => [...new Set(dataset.offers.map((o) => o.departureCity))].sort(), [dataset]);
  const results = useMemo(() => sortOffers(filterOffers(all, c), sort), [all, c, sort]);

  return (
    <div className="view offers" data-testid="offers-view">
      <h2>Holiday offers</h2>
      <DemoBanner>
        every offer here is invented to show the future search. No live prices or availability. Real offers need a travel-data
        source (API / affiliate feed), which is not connected in this prototype.
      </DemoBanner>

      <form className="filters card" onSubmit={(e) => e.preventDefault()} aria-label="Offer filters">
        <label>Departure city
          <select id="f-city" value={c.departureCity} onChange={(e) => set('departureCity', e.target.value)}>
            <option value="">Any</option>
            {cities.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label>Area
          <select id="f-area" value={c.areaId} onChange={(e) => set('areaId', e.target.value)}>
            <option value="">Any</option>
            {dataset.areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>
        <label>People
          <select id="f-people" value={c.people ?? ''} onChange={(e) => set('people', numOrNull(e.target.value))}>
            <option value="">Any</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Max price per person (EUR)
          <input id="f-price" type="number" min={0} step={50} inputMode="numeric" placeholder="e.g. 1500" value={c.maxPricePerPerson ?? ''} onChange={(e) => set('maxPricePerPerson', numOrNull(e.target.value))} />
        </label>
        <label>Board
          <select id="f-board" value={c.board} onChange={(e) => set('board', e.target.value as BoardType | '')}>
            <option value="">Any</option>
            {BOARDS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </label>
        <label>Departing from
          <input id="f-from" type="date" value={c.departFrom} onChange={(e) => set('departFrom', e.target.value)} />
        </label>
        <label>Departing until
          <input id="f-to" type="date" value={c.departTo} onChange={(e) => set('departTo', e.target.value)} />
        </label>
        <label>Min nights
          <input id="f-minn" type="number" min={1} inputMode="numeric" value={c.minNights ?? ''} onChange={(e) => set('minNights', numOrNull(e.target.value))} />
        </label>
        <label>Max nights
          <input id="f-maxn" type="number" min={1} inputMode="numeric" value={c.maxNights ?? ''} onChange={(e) => set('maxNights', numOrNull(e.target.value))} />
        </label>
        <label>Min area reality score
          <select id="f-overall" value={c.minOverall ?? ''} onChange={(e) => set('minOverall', numOrNull(e.target.value))}>
            <option value="">Any</option>
            <option value="50">50+ (mixed or better)</option>
            <option value="70">70+ (strong)</option>
          </select>
        </label>
        <label>Min beach / swimming score
          <select id="f-beach" value={c.minBeach ?? ''} onChange={(e) => set('minBeach', numOrNull(e.target.value))}>
            <option value="">Any</option>
            <option value="50">50+ (mixed or better)</option>
            <option value="70">70+ (strong)</option>
          </select>
        </label>
        <div className="filter-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setC(EMPTY_CRITERIA)}>Reset filters</button>
        </div>
      </form>

      <div className="results-bar">
        <strong role="status" aria-live="polite">{results.length} of {all.length} demo offers</strong>
        <label className="inline">Sort by
          <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as OfferSort)}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>

      {results.length === 0 ? (
        <p className="card">No demo offers match. Loosen a filter — the reality filters hide areas with lower seed scores.</p>
      ) : (
        <ul className="plain offer-results">
          {results.map(({ offer, hotel, area, pricePerPerson: pp, totalPrice: total }) => {
            const worst = worstSeverity(area.warnings);
            return (
              <li key={offer.id} className="card offer-card" data-testid="offer-result">
                <div className="offer-top">
                  <span className="badge demo">DEMO / NOT LIVE DATA</span>
                  <span className="badge demo">SYNTHETIC HOTEL</span>
                </div>
                <h3>{hotel.name}</h3>
                <p className="muted small">{area.name} · {hotel.style}</p>
                <div className="offer-price">
                  <strong>{pp} EUR</strong> <span className="muted">per person</span> · <span>{total} EUR total for {offer.people}</span>
                </div>
                <p className="small">
                  {offer.departDate} → {offer.returnDate} · {offer.nights} nights · {offer.board} · from {offer.departureCity}
                </p>
                <div className="reality-row" aria-label={`Reality check for ${area.name}`}>
                  <Chip label="Area" score={area.scores.overall.score} />
                  <Chip label="Beach" score={area.scores.beach.score} />
                  <Chip label="Infra" score={area.scores.infrastructure.score} />
                  <span className="reality-chip">
                    {worst ? `${SEVERITY[worst].symbol} ${area.warnings.length} warning${area.warnings.length === 1 ? '' : 's'}` : 'No warnings recorded'}
                  </span>
                </div>
                <div className="offer-foot">
                  <span className="deal-score muted small">{formatDealScore(offer.dealScore)}</span>
                  <button type="button" className="btn btn-small" onClick={() => onShowArea(area.id)}>See {area.name} reality check →</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
