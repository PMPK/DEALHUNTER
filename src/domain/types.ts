/**
 * Domain model. Pure data shapes — no UI or map-library imports allowed here.
 * See DATA_MODEL.md for the human-readable description.
 */

export type VerificationStatus = 'verified' | 'unverified' | 'disputed';

export interface Evidence {
  /** Short human label, e.g. "UNESCO World Heritage listing". */
  label: string;
  url?: string;
  note?: string;
}

/** Provenance block shared by everything the app presents as an assessment. */
export interface Provenance {
  /** 0..1 — how much we trust the assessment. NOT a probability, a rough editorial scale. */
  confidence: number;
  reasons: string[];
  evidence: Evidence[];
  /** ISO date (YYYY-MM-DD). */
  lastUpdated: string;
  verificationStatus: VerificationStatus;
}

/** A 0-100 score. `score: null` means "we do not know" (rendered as n/a). */
export interface ScoredItem extends Provenance {
  score: number | null;
}

export type ScoreKey = 'overall' | 'beach' | 'infrastructure';

export type WarningSeverity = 'info' | 'caution' | 'problem';

export interface RealityWarning extends Provenance {
  id: string;
  severity: WarningSeverity;
  title: string;
  detail: string;
}

export type SuitableTag = 'beach' | 'nightlife' | 'quiet' | 'couples' | 'exploring' | 'families' | 'watersports' | 'culture';

export type LatLng = readonly [lat: number, lng: number];

export interface Area {
  id: string;
  name: string;
  /** Approximate centre of the zone. Not an official boundary. */
  center: LatLng;
  summary: string;
  scores: Record<ScoreKey, ScoredItem>;
  positives: string[];
  negatives: string[];
  warnings: RealityWarning[];
  suitableFor: SuitableTag[];
}

export type AttractionCategory = 'culture' | 'nature' | 'wildlife' | 'snorkel-dive' | 'activity' | 'food-drink' | 'beach';

export interface Attraction {
  id: string;
  name: string;
  coordinates: LatLng;
  /** Seed coordinates are hand-entered; true unless a precise source is cited. */
  coordinatesApproximate: boolean;
  category: AttractionCategory;
  /** 0..5, or null when unknown. */
  rating: number | null;
  description: string;
  source: Evidence;
  verificationStatus: VerificationStatus;
  lastUpdated: string;
}

export interface Hotel {
  id: string;
  areaId: string;
  name: string;
  /** Every MVP hotel is synthetic. The type forces it so nobody mistakes seed data for real facts. */
  synthetic: true;
  coordinates: LatLng;
  style: string;
  note: string;
}

export type BoardType = 'All inclusive' | 'Half board' | 'Bed & breakfast' | 'Room only';

export interface DemoOffer {
  id: string;
  hotelId: string;
  /** Always true in this MVP. */
  demo: true;
  price: { amount: number; currency: string; per: 'person' | 'total' };
  people: number;
  departureCity: string;
  departDate: string;
  returnDate: string;
  nights: number;
  board: BoardType;
  /** Placeholder for a future computed Deal Score. null = not implemented. */
  dealScore: number | null;
}

export interface Airport {
  name: string;
  iata: string;
  coordinates: LatLng;
}

export interface Dataset {
  datasetVersion: string;
  airport: Airport;
  areas: Area[];
  /** GeoJSON zone polygons; `properties.areaId` links to an Area. */
  zones: GeoJSON.FeatureCollection<GeoJSON.Polygon, { areaId: string }>;
  attractions: Attraction[];
  hotels: Hotel[];
  offers: DemoOffer[];
}

export type FeedbackRating = 'accurate' | 'mostly-accurate' | 'wrong' | 'not-sure';

export interface FeedbackEntry {
  areaId: string;
  rating: FeedbackRating;
  note: string;
  updatedAt: string;
}

export type FeedbackMap = Record<string, FeedbackEntry>;
