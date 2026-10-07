import type { Area, Attraction, Dataset, DemoOffer, Hotel } from '../domain/types';
import { validateDataset } from '../domain/validate';
import areas from './areas.json';
import attractions from './attractions.json';
import hotels from './hotels.json';
import offers from './offers.json';
import meta from './meta.json';
import zones from './zones.geojson.json';

/**
 * The only place JSON is turned into typed data. JSON imports lose literal types, so we cast
 * once here and rely on validateDataset() (run in tests, and logged in dev) to guard the shape.
 */
export const dataset: Dataset = {
  datasetVersion: meta.datasetVersion,
  airport: { ...meta.airport, coordinates: meta.airport.coordinates as [number, number] },
  areas: areas as unknown as Area[],
  zones: zones as unknown as Dataset['zones'],
  attractions: attractions as unknown as Attraction[],
  hotels: hotels as unknown as Hotel[],
  offers: offers as unknown as DemoOffer[],
};

if (import.meta.env?.DEV) {
  const problems = validateDataset(dataset);
  if (problems.length) console.error('Dataset problems:', problems);
}
