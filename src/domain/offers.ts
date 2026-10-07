import type { Area, BoardType, DemoOffer, Hotel } from './types';

export interface OfferCriteria {
  departureCity: string; // '' = any
  people: number | null; // null = any
  maxPricePerPerson: number | null;
  board: BoardType | '';
  areaId: string; // '' = any
  departFrom: string; // YYYY-MM-DD or ''
  departTo: string; // YYYY-MM-DD or ''
  minNights: number | null;
  maxNights: number | null;
  /** Reality filters: minimum seed score for the hotel's area. */
  minOverall: number | null;
  minBeach: number | null;
}

export const EMPTY_CRITERIA: OfferCriteria = {
  departureCity: '',
  people: null,
  maxPricePerPerson: null,
  board: '',
  areaId: '',
  departFrom: '',
  departTo: '',
  minNights: null,
  maxNights: null,
  minOverall: null,
  minBeach: null,
};

export type OfferSort = 'price-asc' | 'price-desc' | 'reality-desc' | 'beach-desc' | 'nights-desc' | 'date-asc';

export interface OfferResult {
  offer: DemoOffer;
  hotel: Hotel;
  area: Area;
  pricePerPerson: number;
  totalPrice: number;
}

export function pricePerPerson(o: DemoOffer): number {
  return o.price.per === 'person' ? o.price.amount : Math.round(o.price.amount / o.people);
}

export function totalPrice(o: DemoOffer): number {
  return o.price.per === 'total' ? o.price.amount : o.price.amount * o.people;
}

/** Join offers with their hotel and area; offers with dangling links are dropped. */
export function joinOffers(offers: readonly DemoOffer[], hotels: readonly Hotel[], areas: readonly Area[]): OfferResult[] {
  const hotelById = new Map(hotels.map((h) => [h.id, h] as const));
  const areaById = new Map(areas.map((a) => [a.id, a] as const));
  return offers.flatMap((offer) => {
    const hotel = hotelById.get(offer.hotelId);
    const area = hotel ? areaById.get(hotel.areaId) : undefined;
    if (!hotel || !area) return [];
    return [{ offer, hotel, area, pricePerPerson: pricePerPerson(offer), totalPrice: totalPrice(offer) }];
  });
}

/** Unknown (null) scores never pass a minimum-score filter: unknown is not "good enough". */
const meets = (score: number | null, min: number | null) => min === null || (score !== null && score >= min);

export function filterOffers(results: readonly OfferResult[], c: OfferCriteria): OfferResult[] {
  return results.filter(({ offer, hotel, area, pricePerPerson: pp }) => {
    if (c.departureCity && offer.departureCity !== c.departureCity) return false;
    if (c.people !== null && offer.people !== c.people) return false;
    if (c.maxPricePerPerson !== null && pp > c.maxPricePerPerson) return false;
    if (c.board && offer.board !== c.board) return false;
    if (c.areaId && hotel.areaId !== c.areaId) return false;
    if (c.departFrom && offer.departDate < c.departFrom) return false;
    if (c.departTo && offer.departDate > c.departTo) return false;
    if (c.minNights !== null && offer.nights < c.minNights) return false;
    if (c.maxNights !== null && offer.nights > c.maxNights) return false;
    if (!meets(area.scores.overall.score, c.minOverall)) return false;
    if (!meets(area.scores.beach.score, c.minBeach)) return false;
    return true;
  });
}

const scoreOrNeg = (s: number | null) => (s === null ? -1 : s);

export function sortOffers(results: readonly OfferResult[], sort: OfferSort): OfferResult[] {
  const by: Record<OfferSort, (a: OfferResult, b: OfferResult) => number> = {
    'price-asc': (a, b) => a.pricePerPerson - b.pricePerPerson,
    'price-desc': (a, b) => b.pricePerPerson - a.pricePerPerson,
    'reality-desc': (a, b) => scoreOrNeg(b.area.scores.overall.score) - scoreOrNeg(a.area.scores.overall.score),
    'beach-desc': (a, b) => scoreOrNeg(b.area.scores.beach.score) - scoreOrNeg(a.area.scores.beach.score),
    'nights-desc': (a, b) => b.offer.nights - a.offer.nights,
    'date-asc': (a, b) => a.offer.departDate.localeCompare(b.offer.departDate),
  };
  // Stable tie-break on price so ordering is deterministic.
  return [...results].sort((a, b) => by[sort](a, b) || a.pricePerPerson - b.pricePerPerson || a.offer.id.localeCompare(b.offer.id));
}
