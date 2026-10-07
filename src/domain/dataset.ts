import type { Attraction, Dataset, DatasetMeta, EvidenceBundle, Hotel } from './types';
import { validateDataset } from './validate';

/** Raw file contents (JSON text), exactly as stored in the data directory. */
export interface RawDataset {
  meta: string;
  areas: string;
  beaches: string;
  attractions: string;
  hotels: string;
  evidence: string;
}

export const EMPTY_EVIDENCE: EvidenceBundle = {
  schemaVersion: 1,
  assessments: [],
  warnings: [],
  observations: [],
  radiusAnalyses: [],
};

export interface LoadedDataset {
  dataset: Dataset;
  /** Parse and validation problems. The dataset is still returned (best effort) so the UI can explain them. */
  problems: string[];
}

function parse<T>(name: string, text: string, fallback: T, problems: string[]): T {
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    problems.push(`${name}: not valid JSON (${e instanceof Error ? e.message : 'parse error'})`);
    return fallback;
  }
}

function features<T extends GeoJSON.Feature>(name: string, text: string, problems: string[]): T[] {
  const fc = parse<GeoJSON.FeatureCollection | null>(name, text, null, problems);
  if (!fc) return [];
  if (fc.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
    problems.push(`${name}: must be a GeoJSON FeatureCollection`);
    return [];
  }
  return fc.features as T[];
}

const FALLBACK_META: DatasetMeta = {
  datasetVersion: 'invalid',
  description: 'meta file could not be read',
  airport: null,
  mapBounds: [-90, -180, 90, 180],
  sanityBounds: [-90, -180, 90, 180],
};

export function loadDataset(raw: RawDataset): LoadedDataset {
  const problems: string[] = [];
  const dataset: Dataset = {
    meta: parse<DatasetMeta>('meta.json', raw.meta, FALLBACK_META, problems),
    areas: features('areas.geojson', raw.areas, problems),
    beaches: features('beaches.geojson', raw.beaches, problems),
    attractions: parse<Attraction[]>('attractions.json', raw.attractions, [], problems),
    hotels: parse<Hotel[]>('hotels.json', raw.hotels, [], problems),
    evidence: { ...EMPTY_EVIDENCE, ...parse<Partial<EvidenceBundle>>('reality-evidence.json', raw.evidence, {}, problems) },
  };
  if (problems.length === 0) problems.push(...validateDataset(dataset));
  return { dataset, problems };
}
