import { useMemo, useState } from 'react';
import { DemoBanner } from '../../ui/common';
import { EMPTY_CRITERIA, filterOffers, joinOffers, sortOffers, type OfferCriteria, type OfferSort } from './offers';
import demoHotels from './demo-hotels.json';
import demoOffers from './demo-offers.json';
import type { BoardType, DemoHotel, DemoOffer } from './types';

const HOTELS = demoHotels as unknown as DemoHotel[];
const OFFERS = demoOffers as unknown as DemoOffer[];
const formatDealScore = (s: number | null) => (s === null ? 'Deal Score: placeholder (not computed)' : `Deal Score: ${s}`);

const BOARDS: BoardType[] = ['All inclusive', 'Half board', 'Bed & breakfast', 'Room only'];
const SORTS: Array<[OfferSort, string]> = [
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['nights-desc', 'Longest stay'],
  ['date-asc', 'Earliest departure'],
];
const numOrNull = (v: string) => (v === '' ? null : Number(v));

export function OffersView() {
  const [c, setC] = useState<OfferCriteria>(EMPTY_CRITERIA);
  const [sort, setSort] = useState<OfferSort>('price-asc');
  const set = <K extends keyof OfferCriteria>(k: K, v: OfferCriteria[K]) => setC((p) => ({ ...p, [k]: v }));

  const all = useMemo(() => joinOffers(OFFERS, HOTELS), []);
  const cities = useMemo(() => [...new Set(OFFERS.map((o) => o.departureCity))].sort(), []);
  const areaLabels = useMemo(() => [...new Set(HOTELS.map((h) => h.areaLabel))].sort(), []);
  const results = useMemo(() => sortOffers(filterOffers(all, c), sort), [all, c, sort]);

  return (
    <div className="view offers" data-testid="offers-view">
      <h2>Holiday offers <span className="badge">frozen demo</span></h2>
      <p className="muted small">Out of scope for the Reality experiment. These offers are invented and are not linked to any Reality data.</p>
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
        <label>Area label (demo text only)
          <select id="f-area" value={c.areaLabel} onChange={(e) => set('areaLabel', e.target.value)}>
            <option value="">Any</option>
            {areaLabels.map((a) => <option key={a}>{a}</option>)}
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
          {results.map(({ offer, hotel, pricePerPerson: pp, totalPrice: total }) => {
            return (
              <li key={offer.id} className="card offer-card" data-testid="offer-result">
                <div className="offer-top">
                  <span className="badge demo">DEMO / NOT LIVE DATA</span>
                  <span className="badge demo">SYNTHETIC HOTEL</span>
                </div>
                <h3>{hotel.name}</h3>
                <p className="muted small">{hotel.areaLabel} · {hotel.style}</p>
                <div className="offer-price">
                  <strong>{pp} EUR</strong> <span className="muted">per person</span> · <span>{total} EUR total for {offer.people}</span>
                </div>
                <p className="small">
                  {offer.departDate} → {offer.returnDate} · {offer.nights} nights · {offer.board} · from {offer.departureCity}
                </p>
                <div className="offer-foot">
                  <span className="deal-score muted small">{formatDealScore(offer.dealScore)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
