import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadDataset } from '../domain/dataset';

const dir = join(__dirname);
const read = (f: string) => readFileSync(join(dir, f), 'utf8');
const loaded = loadDataset({
  meta: read('meta.json'),
  areas: read('areas.geojson'),
  beaches: read('beaches.geojson'),
  attractions: read('attractions.json'),
  hotels: read('hotels.json'),
  evidence: read('reality-evidence.json'),
});

describe('shipped dataset (src/data)', () => {
  it('is valid', () => {
    expect(loaded.problems).toEqual([]);
  });

  it('contains no geometry, places or evidence until an externally researched dataset is supplied', () => {
    const d = loaded.dataset;
    expect(d.areas).toEqual([]);
    expect(d.beaches).toEqual([]);
    expect(d.attractions).toEqual([]);
    expect(d.hotels).toEqual([]);
    expect(d.evidence.assessments).toEqual([]);
    expect(d.evidence.warnings).toEqual([]);
    expect(d.evidence.observations).toEqual([]);
    expect(d.evidence.radiusAnalyses).toEqual([]);
    expect(d.meta.airport).toBeNull();
  });
});

/** Guard: UI/domain/map code must not carry Zanzibar facts or coordinates; those live in data files. */
describe('no hard-coded factual claims in code', () => {
  const root = join(__dirname, '..');
  const files: string[] = [];
  const walk = (p: string) => {
    for (const name of readdirSync(p)) {
      const full = join(p, name);
      if (statSync(full).isDirectory()) {
        if (['test', 'data', 'frozen'].includes(name)) continue;
        walk(full);
      } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) files.push(full);
    }
  };
  walk(root);

  it('scans a meaningful number of source files', () => expect(files.length).toBeGreaterThan(10));

  it('has no coordinate literals', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/-?\d{1,3}\.\d{4,}/);
    }
  });

  it('makes no factual claims about Zanzibar in UI strings', () => {
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/in Zanzibar|Zanzibar (is|has|are)|patchy/i);
  });

  it('names no Zanzibar places', () => {
    const places = /(Nungwi|Kendwa|Paje|Jambiani|Bwejuu|Matemwe|Kiwengwa|Michamvi|Kizimkazi|Stone Town|Mnemba|Jozani|Prison Island|Forodhani)/i;
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(places);
  });
});
