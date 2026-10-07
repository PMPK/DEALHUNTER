import type { BoardType, DemoHotel, DemoOffer } from './types';

export interface OfferCriteria {
  departureCity: string;
  people: number | null;
  maxPricePerPerson: number | null;
  board: BoardType | '';
  areaLabel: string;
  departFrom: string;
  departTo: string;
  minNights: number | null;
  maxNights: number | null;
}

export const EMPTY_CRITERIA: OfferCriteria = {
  departureCity: '',
  people: null,
  maxPricePerPerson: null,
  board: '',
  areaLabel: '',
  departFrom: '',
  departTo: '',
  minNights: null,
  maxNights: null,
};

export type OfferSort = 'price-asc' | 'price-desc' | 'nights-desc' | 'date-asc';

export interface OfferResult {
  offer: DemoOffer;
  hotel: DemoHotel;
  pricePerPerson: number;
  totalPrice: number;
}

export function pricePerPerson(o: Pick<DemoOffer, 'price' | 'people'>): number {
  return o.price.per === 'person' ? o.price.amount : Math.round(o.price.amount / o.people);
}

export function totalPrice(o: Pick<DemoOffer, 'price' | 'people'>): number {
  return o.price.per === 'total' ? o.price.amount : o.price.amount * o.people;
}

export function joinOffers(offers: readonly DemoOffer[], hotels: readonly DemoHotel[]): OfferResult[] {
  const hotelById = new Map(hotels.map((h) => [h.id, h] as const));
  return offers.flatMap((offer) => {
    const hotel = hotelById.get(offer.hotelId);
    return hotel ? [{ offer, hotel, pricePerPerson: pricePerPerson(offer), totalPrice: totalPrice(offer) }] : [];
  });
}

export function filterOffers(results: readonly OfferResult[], c: OfferCriteria): OfferResult[] {
  return results.filter(({ offer, hotel, pricePerPerson: pp }) => {
    if (c.departureCity && offer.departureCity !== c.departureCity) return false;
    if (c.people !== null && offer.people !== c.people) return false;
    if (c.maxPricePerPerson !== null && pp > c.maxPricePerPerson) return false;
    if (c.board && offer.board !== c.board) return false;
    if (c.areaLabel && hotel.areaLabel !== c.areaLabel) return false;
    if (c.departFrom && offer.departDate < c.departFrom) return false;
    if (c.departTo && offer.departDate > c.departTo) return false;
    if (c.minNights !== null && offer.nights < c.minNights) return false;
    if (c.maxNights !== null && offer.nights > c.maxNights) return false;
    return true;
  });
}

export function sortOffers(results: readonly OfferResult[], sort: OfferSort): OfferResult[] {
  const by: Record<OfferSort, (a: OfferResult, b: OfferResult) => number> = {
    'price-asc': (a, b) => a.pricePerPerson - b.pricePerPerson,
    'price-desc': (a, b) => b.pricePerPerson - a.pricePerPerson,
    'nights-desc': (a, b) => b.offer.nights - a.offer.nights,
    'date-asc': (a, b) => a.offer.departDate.localeCompare(b.offer.departDate),
  };
  return [...results].sort((a, b) => by[sort](a, b) || a.pricePerPerson - b.pricePerPerson || a.offer.id.localeCompare(b.offer.id));
}
