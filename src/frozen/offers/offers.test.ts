import { describe, expect, it } from 'vitest';
import { EMPTY_CRITERIA, filterOffers, joinOffers, pricePerPerson, sortOffers, totalPrice } from './offers';
import demoHotels from './demo-hotels.json';
import demoOffers from './demo-offers.json';
import type { DemoHotel, DemoOffer } from './types';

const hotels = demoHotels as unknown as DemoHotel[];
const offers = demoOffers as unknown as DemoOffer[];

const all = joinOffers(offers, hotels);
const f = (patch: Partial<typeof EMPTY_CRITERIA>) => filterOffers(all, { ...EMPTY_CRITERIA, ...patch });

describe('price helpers', () => {
  const o = (per: 'person' | 'total', amount: number, people: number) => ({ price: { amount, currency: 'EUR', per }, people }) as DemoOffer;
  it('normalises per-person and total', () => {
    expect(pricePerPerson(o('person', 1000, 2))).toBe(1000);
    expect(totalPrice(o('person', 1000, 2))).toBe(2000);
    expect(pricePerPerson(o('total', 2000, 4))).toBe(500);
    expect(totalPrice(o('total', 2000, 4))).toBe(2000);
  });
});

describe('joinOffers', () => {
  it('joins every seed offer to a hotel and area', () => {
    expect(all).toHaveLength(offers.length);
  });
  it('drops offers with dangling hotel links', () => {
    const bad = [{ ...offers[0]!, hotelId: 'nope' }];
    expect(joinOffers(bad, hotels)).toEqual([]);
  });
});

describe('filterOffers', () => {
  it('returns everything with empty criteria', () => expect(f({})).toHaveLength(all.length));
  it('filters by city, people, board, area', () => {
    const cities = new Set(all.map((r) => r.offer.departureCity));
    const city = [...cities][0]!;
    expect(f({ departureCity: city }).every((r) => r.offer.departureCity === city)).toBe(true);
    expect(f({ people: 2 }).every((r) => r.offer.people === 2)).toBe(true);
    expect(f({ board: 'All inclusive' }).every((r) => r.offer.board === 'All inclusive')).toBe(true);
    expect(f({ areaLabel: 'Nungwi' }).every((r) => r.hotel.areaLabel === 'Nungwi')).toBe(true);
    expect(f({ areaLabel: 'Nungwi' }).length).toBeGreaterThan(0);
  });
  it('filters by price per person, nights and departure window (inclusive)', () => {
    expect(f({ maxPricePerPerson: 1000 }).every((r) => r.pricePerPerson <= 1000)).toBe(true);
    expect(f({ minNights: 10, maxNights: 10 }).every((r) => r.offer.nights === 10)).toBe(true);
    const win = f({ departFrom: '2027-02-01', departTo: '2027-02-28' });
    expect(win.length).toBeGreaterThan(0);
    expect(win.every((r) => r.offer.departDate >= '2027-02-01' && r.offer.departDate <= '2027-02-28')).toBe(true);
  });
  it('can legitimately return nothing', () => expect(f({ maxPricePerPerson: 1 })).toEqual([]));
});

describe('sortOffers', () => {
  it('sorts by price both ways without mutating the input', () => {
    const before = all.map((r) => r.offer.id);
    const asc = sortOffers(all, 'price-asc').map((r) => r.pricePerPerson);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = sortOffers(all, 'price-desc').map((r) => r.pricePerPerson);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(all.map((r) => r.offer.id)).toEqual(before);
  });
  it('sorts by earliest departure', () => {
    const d = sortOffers(all, 'date-asc').map((r) => r.offer.departDate);
    expect(d).toEqual([...d].sort());
  });
});
