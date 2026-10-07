import { describe, expect, it } from 'vitest';
import { loadDataset, EMPTY_EVIDENCE } from './dataset';
import { fixtureDataset } from '../test/fixtures';
import { validateDataset } from './validate';
import type { Dataset } from './types';

const clone = (): Dataset => structuredClone(fixtureDataset);
const problems = (d: Dataset) => validateDataset(d).join('\n');

describe('validateDataset', () => {
  it('accepts the fixture and an empty dataset', () => {
    expect(validateDataset(fixtureDataset)).toEqual([]);
    const empty = clone();
    Object.assign(empty, { areas: [], beaches: [], attractions: [], hotels: [], evidence: EMPTY_EVIDENCE });
    expect(validateDataset(empty)).toEqual([]);
  });

  it('rejects a score with no evidence, no reasons, or an unknown source', () => {
    const d = clone();
    const a = d.evidence.assessments.find((x) => x.id === 'a2')!;
    a.evidence = [];
    a.reasons = [];
    expect(problems(d)).toMatch(/assessment a2: a score needs at least one reason/);
    expect(problems(d)).toMatch(/assessment a2: a score needs at least one evidence entry/);
    const e = clone();
    e.evidence.assessments.find((x) => x.id === 'a2')!.sourceType = 'unknown';
    expect(problems(e)).toMatch(/a score cannot have sourceType 'unknown'/);
  });

  it('allows an unknown assessment only with a null score', () => {
    expect(validateDataset(fixtureDataset)).toEqual([]); // a3: unknown + null
  });

  it('requires a url for verified claims and valid ranges', () => {
    const d = clone();
    d.evidence.assessments.find((x) => x.id === 'a1')!.evidence = [{ label: 'no url' }];
    d.evidence.assessments.find((x) => x.id === 'a2')!.score = 140;
    d.evidence.assessments.find((x) => x.id === 'a2')!.confidence = 2;
    const p = problems(d);
    expect(p).toMatch(/assessment a1: verified needs evidence with a url/);
    expect(p).toMatch(/assessment a2: score must be null or 0..100/);
    expect(p).toMatch(/assessment a2: confidence must be 0..1/);
  });

  it('rejects dangling targets, point targets and duplicate ids', () => {
    const d = clone();
    d.evidence.assessments[0]!.target = { kind: 'area', id: 'nope' };
    d.evidence.warnings[0]!.target = { kind: 'point', id: 'pin' };
    d.evidence.assessments[1]!.id = d.evidence.assessments[2]!.id;
    const p = problems(d);
    expect(p).toMatch(/assessment a1: target area:nope not found/);
    expect(p).toMatch(/warning w1: target not found/);
    expect(p).toMatch(/duplicate assessment id/);
  });

  it('checks geometry: closed rings, bounds, [lng,lat] order', () => {
    const d = clone();
    const ring = (d.areas[0]!.geometry as GeoJSON.Polygon).coordinates[0]!;
    ring.pop();
    expect(problems(d)).toMatch(/ring must be closed/);
    const e = clone();
    (e.areas[0]!.geometry as GeoJSON.Polygon).coordinates[0]![1] = [5, 5];
    expect(problems(e)).toMatch(/outside sanityBounds/);
  });

  it('enforces the sub-zone hierarchy', () => {
    const d = clone();
    d.areas.find((a) => a.properties.id === 'fx-town-north')!.properties.parentId = 'fx-town-north';
    expect(problems(d)).toMatch(/parent fx-town-north must be a top-level area/);
    const e = clone();
    e.areas.find((a) => a.properties.id === 'fx-town')!.properties.parentId = 'fx-cove';
    expect(problems(e)).toMatch(/top-level areas must have parentId null/);
  });

  it('checks radius values and beach links', () => {
    const d = clone();
    (d.evidence.radiusAnalyses[0] as { radiusM: number }).radiusM = 300;
    d.beaches[0]!.properties.areaId = 'nope';
    expect(problems(d)).toMatch(/radiusM must be 250, 500 or 1000/);
    expect(problems(d)).toMatch(/unknown areaId nope/);
  });
});

describe('loadDataset', () => {
  it('reports invalid JSON and wrong GeoJSON types instead of throwing', () => {
    const { problems: p, dataset } = loadDataset({
      meta: '{"datasetVersion":"x","description":"","airport":null,"mapBounds":[0,0,1,1],"sanityBounds":[0,0,1,1]}',
      areas: '{ not json',
      beaches: '{"type":"Feature"}',
      attractions: '[]',
      hotels: '[]',
      evidence: '{}',
    });
    expect(p.join('\n')).toMatch(/areas\.geojson: not valid JSON/);
    expect(p.join('\n')).toMatch(/beaches\.geojson: must be a GeoJSON FeatureCollection/);
    expect(dataset.areas).toEqual([]);
    expect(dataset.evidence.assessments).toEqual([]);
  });
});
