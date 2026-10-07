import { describe, expect, it } from 'vitest';
import { fixtureDataset as d } from '../test/fixtures';
import { containingAreas, headlineScore, observationsFor, radiusAnalysesFor, rankAssessments, relevantRefs, resolveAssessments, warningsFor } from './assess';

const town = { kind: 'area', id: 'fx-town' } as const;

describe('rankAssessments', () => {
  it('puts verified external evidence first and first-hand-user last, dropping nothing', () => {
    const list = resolveAssessments(d, town, 'overall').list;
    expect(list.map((a) => a.id)).toEqual(['a1', 'a2', 'a4']);
    expect(list.at(-1)!.sourceType).toBe('first-hand-user');
    expect(rankAssessments([...list].reverse()).map((a) => a.id)).toEqual(['a1', 'a2', 'a4']);
  });
  it('a first-hand-user score never outranks external evidence, even with higher confidence', () => {
    const user = d.evidence.assessments.find((a) => a.id === 'a4')!;
    const ext = d.evidence.assessments.find((a) => a.id === 'a2')!;
    expect(user.confidence).toBeGreaterThan(ext.confidence);
    expect(rankAssessments([user, ext])[0]!.id).toBe('a2');
  });
});

describe('resolveAssessments / headlineScore', () => {
  it('keeps unknown as unknown: a null score stays null', () => {
    const { assessment } = headlineScore(d, town, 'beach');
    expect(assessment).not.toBeNull();
    expect(assessment!.score).toBeNull();
    expect(assessment!.sourceType).toBe('unknown');
  });
  it('returns no assessment when there is no evidence for a dimension', () => {
    expect(headlineScore(d, town, 'infrastructure')).toEqual({ assessment: null, inheritedFrom: null, count: 0 });
  });
  it('sub-zones inherit from their parent only when they have nothing of their own, and say so', () => {
    const r = resolveAssessments(d, { kind: 'subzone', id: 'fx-town-north' }, 'surroundings');
    expect(r.list.map((a) => a.id)).toEqual(['a5']);
    expect(r.inheritedFrom?.properties.id).toBe('fx-town');
  });
  it('does not inherit across unrelated areas or from a sub-zone to its parent', () => {
    expect(resolveAssessments(d, { kind: 'area', id: 'fx-cove' }, 'surroundings').list).toEqual([]);
  });
});

describe('lookups', () => {
  it('finds warnings, observations and radius analyses by feature', () => {
    expect(warningsFor(d, town).map((w) => w.id)).toEqual(['w1']);
    expect(warningsFor(d, { kind: 'area', id: 'fx-cove' })).toEqual([]);
    expect(observationsFor(d, town, 'beach-access')).toHaveLength(1);
    expect(radiusAnalysesFor(d, { kind: 'hotel', id: 'fx-hotel' }, 500)).toHaveLength(1);
    expect(radiusAnalysesFor(d, { kind: 'hotel', id: 'fx-hotel' }, 250)).toHaveLength(0);
  });
});

describe('containingAreas / relevantRefs', () => {
  it('derives containing polygons, most specific (sub-zone) first', () => {
    expect(containingAreas(d, [0.015, 0.01]).map((a) => a.properties.id)).toEqual(['fx-town-north', 'fx-town']);
    expect(containingAreas(d, [0.005, 0.005]).map((a) => a.properties.id)).toEqual(['fx-town']);
    expect(containingAreas(d, [0.5, 0.5])).toEqual([]);
  });
  it('hotels and pins also draw on the areas that contain them; areas only on themselves', () => {
    expect(relevantRefs(d, { kind: 'hotel', id: 'fx-hotel' }, [0.005, 0.005]).map((r) => `${r.ref.kind}:${r.ref.id}`)).toEqual(['hotel:fx-hotel', 'area:fx-town']);
    expect(relevantRefs(d, town, [0.01, 0.01])).toHaveLength(1);
  });
});
