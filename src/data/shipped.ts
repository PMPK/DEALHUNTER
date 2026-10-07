import { loadDataset } from '../domain/dataset';
// `@dataset` resolves to src/data by default; set ZR_DATASET_DIR to build/run against another directory
// containing the same six files (see vite.config.ts and DATA_MODEL.md).
import meta from '@dataset/meta.json?raw';
import areas from '@dataset/areas.geojson?raw';
import beaches from '@dataset/beaches.geojson?raw';
import attractions from '@dataset/attractions.json?raw';
import hotels from '@dataset/hotels.json?raw';
import evidence from '@dataset/reality-evidence.json?raw';

export const shipped = loadDataset({ meta, areas, beaches, attractions, hotels, evidence });
