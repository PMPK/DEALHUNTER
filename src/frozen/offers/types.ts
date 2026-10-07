/**
 * FROZEN: the Offers tab is a UI demo only and is out of scope for the Reality experiment.
 * It has its own invented data (demo-offers.json / demo-hotels.json), no coordinates, and no
 * link to the Reality dataset. Do not extend it.
 */
export type BoardType = 'All inclusive' | 'Half board' | 'Bed & breakfast' | 'Room only';

export interface DemoHotel {
  id: string;
  name: string;
  style: string;
  /** Free-text label only; deliberately not linked to Reality areas. */
  areaLabel: string;
  synthetic: true;
}

export interface DemoOffer {
  id: string;
  hotelId: string;
  demo: true;
  price: { amount: number; currency: string; per: 'person' | 'total' };
  people: number;
  departureCity: string;
  departDate: string;
  returnDate: string;
  nights: number;
  board: BoardType;
  dealScore: number | null;
}
