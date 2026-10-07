import { loadDataset } from '../domain/dataset';
import meta from './fixtures/meta.json?raw';
import areas from './fixtures/areas.geojson?raw';
import beaches from './fixtures/beaches.geojson?raw';
import attractions from './fixtures/attractions.json?raw';
import hotels from './fixtures/hotels.json?raw';
import evidence from './fixtures/reality-evidence.json?raw';

/** TEST FIXTURE: fictional geometry near 0°,0° and invented evidence. Never shipped as Zanzibar data. */
export const fixture = loadDataset({ meta, areas, beaches, attractions, hotels, evidence });
export const fixtureDataset = fixture.dataset;
