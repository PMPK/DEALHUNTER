import { describe, expect, it } from 'vitest';
import { fixtureDataset as d } from '../test/fixtures';
import { withFeedback } from '../domain/feedback';
import { BANDS, SEVERITY } from '../domain/scoring';
import { DEFAULT_LAYERS, LAYERS, buildMarkers, buildShapes, pinSelection, selectionFor, type LayerId } from './layers';

const on = (...ids: LayerId[]) => new Set<LayerId>(ids);
const shape = (s: ReturnType<typeof buildShapes>, key: string) => s.find((x) => x.key === key)!;
const shapes = (layers: LayerId[], sel = null as ReturnType<typeof pinSelection> | null, fb = {}) => buildShapes(d, on(...layers), sel, fb);

describe('layer catalogue', () => {
  it('has the six reality layers with distinct ids', () => {
    const ids = LAYERS.map((l) => l.id);
    for (const id of ['overall', 'beach', 'infrastructure', 'surroundings', 'warnings', 'attractions']) expect(ids).toContain(id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(DEFAULT_LAYERS.has('overall')).toBe(true);
  });
});

describe('buildShapes', () => {
  it('with no layer on: neutral outlines, no badges, beaches hidden', () => {
    const s = shapes([]);
    expect(s.map((x) => x.key).sort()).toEqual(['area:fx-cove', 'area:fx-town', 'subzone:fx-town-north']);
    for (const x of s) {
      expect(x.fill).toBeNull();
      expect(x.badges).toEqual([]);
    }
  });

  it('each score layer adds its own badge, independently', () => {
    expect(shape(shapes(['overall']), 'area:fx-town').badges).toHaveLength(1);
    expect(shape(shapes(['beach']), 'area:fx-town').badges[0]!.text).toMatch(/^Beach/);
    expect(shape(shapes(['overall', 'beach', 'infrastructure', 'surroundings']), 'area:fx-town').badges.map((b) => b.text.split(' ')[0])).toEqual(['Overall', 'Beach', 'Infra', 'Surr.']);
  });

  it('colours by headline band; verified headline is not dashed, unverified is', () => {
    const town = shape(shapes(['overall']), 'area:fx-town'); // a1 = 60 verified
    expect(town.fill).toBe(BANDS.mixed.color);
    expect(town.dashed).toBe(false);
    expect(town.badges[0]!.text).toBe('Overall 60◆');
    const cove = shape(shapes(['overall']), 'area:fx-cove'); // a6 = 30 unverified
    expect(cove.fill).toBe(BANDS.weak.color);
    expect(cove.dashed).toBe(true);
    expect(cove.badges[0]!.text).toContain('?');
  });

  it('renders missing or null evidence as unknown ("n/a"), never as a number or a band colour', () => {
    const town = shape(shapes(['beach', 'infrastructure']), 'area:fx-town');
    expect(town.badges.map((b) => b.text)).toEqual(['Beach n/a', 'Infra n/a']);
    for (const b of town.badges) {
      expect(b.color).toBe(BANDS.unknown.color);
      expect(b.title).toMatch(/no evidence-based score/);
    }
    expect(town.fill).toBe(BANDS.unknown.color);
    expect(town.dashed).toBe(true);
  });

  it('sub-zones show their own badge, or the parent’s when they have none; labels appear only when zoomed in', () => {
    const north = shape(shapes(['overall']), 'subzone:fx-town-north');
    expect(north.badges[0]!.text).toBe('Overall 60◆');
    expect(north.labelMinZoom).toBeGreaterThan(shape(shapes(['overall']), 'area:fx-town').labelMinZoom);
  });

  it('fill follows the first enabled score layer in fixed order', () => {
    expect(shape(shapes(['surroundings', 'overall']), 'area:fx-town').fill).toBe(BANDS.mixed.color); // overall wins
    expect(shape(shapes(['surroundings']), 'area:fx-town').fill).toBe(BANDS.strong.color);
  });

  it('beach layer draws beach lines coloured by their own assessment', () => {
    const s = shapes(['beach']);
    const b = shape(s, 'beach:fx-beach');
    expect(b.lines).toHaveLength(1);
    expect(b.outline).toBe(BANDS.weak.color); // a7 = 45; lines carry colour on the outline
    expect(b.badges[0]!.text).toContain('45');
    expect(shapes(['overall']).some((x) => x.kind === 'beach')).toBe(false);
  });

  it('warnings layer: outline by worst severity, count badge, "— 0" where none recorded, no fill', () => {
    const s = shapes(['warnings']);
    const town = shape(s, 'area:fx-town');
    expect(town.outline).toBe(SEVERITY.problem.color);
    expect(town.badges[0]!.text).toContain('1');
    expect(town.fill).toBeNull();
    expect(shape(s, 'area:fx-cove').badges[0]!.text).toBe('— 0');
    expect(shape(s, 'area:fx-cove').badges[0]!.title).toMatch(/not evidence that none exist/);
    expect(s.some((x) => x.kind === 'beach')).toBe(true); // beaches carry warnings too
  });

  it('shows "!" when the tester marked that dimension wrong, without changing the score', () => {
    const fb = withFeedback({}, { kind: 'area', id: 'fx-cove' }, 'overall', { rating: 'wrong' });
    const cove = shape(shapes(['overall'], null, fb), 'area:fx-cove');
    expect(cove.badges[0]!.text).toMatch(/30.*!/);
    expect(cove.badges[0]!.title).toMatch(/you marked this wrong/);
  });

  it('highlights the selected feature', () => {
    const sel = selectionFor(d, 'area', 'fx-cove');
    expect(shapes(['overall'], sel).filter((x) => x.selected).map((x) => x.key)).toEqual(['area:fx-cove']);
  });
});

describe('buildMarkers', () => {
  it('toggles attractions and hotels independently', () => {
    expect(buildMarkers(d, on(), null)).toEqual([]);
    expect(buildMarkers(d, on('attractions'), null).map((m) => m.kind)).toEqual(['attraction']);
    expect(buildMarkers(d, on('hotels'), null).map((m) => m.kind)).toEqual(['hotel', 'hotel']);
    expect(buildMarkers(d, on('attractions', 'hotels'), null)).toHaveLength(3);
  });
  it('flags unverified markers and the selection', () => {
    const m = buildMarkers(d, on('hotels'), selectionFor(d, 'hotel', 'fx-hotel'));
    expect(m.every((x) => !x.verified)).toBe(true);
    expect(m.find((x) => x.id === 'fx-hotel')!.selected).toBe(true);
  });
});

describe('selectionFor / pinSelection', () => {
  it('areas and beaches use a derived bbox centre; hotels use their coordinates', () => {
    expect(selectionFor(d, 'area', 'fx-town')).toMatchObject({ derivedPosition: true, position: [0.01, 0.01] });
    expect(selectionFor(d, 'beach', 'fx-beach')?.derivedPosition).toBe(true);
    expect(selectionFor(d, 'hotel', 'fx-hotel')).toMatchObject({ position: [0.005, 0.005] });
    expect(selectionFor(d, 'hotel', 'nope')).toBeNull();
    expect(selectionFor(d, 'point', 'pin')).toBeNull();
  });
  it('a dropped pin is a point selection', () => {
    expect(pinSelection([1, 2])).toMatchObject({ ref: { kind: 'point' }, position: [1, 2] });
  });
});
