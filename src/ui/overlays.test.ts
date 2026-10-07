import { describe, expect, it } from 'vitest';
import { dataset } from '../data';
import { BANDS } from '../domain/scoring';
import { buildAttractionMarkers, buildZones, type OverlayId } from './overlays';

const on = (...ids: OverlayId[]) => new Set<OverlayId>(ids);
const zone = (zs: ReturnType<typeof buildZones>, id: string) => zs.find((z) => z.id === id)!;

describe('buildZones', () => {
  it('draws neutral selectable zones when every overlay is off', () => {
    const zs = buildZones(dataset, on(), null, {});
    expect(zs).toHaveLength(dataset.areas.length);
    for (const z of zs) {
      expect(z.fill).toBeNull();
      expect(z.badges).toHaveLength(0);
    }
  });

  it('each score overlay adds its own labelled badge, independently', () => {
    const beachOnly = zone(buildZones(dataset, on('beach'), null, {}), 'paje');
    expect(beachOnly.badges).toHaveLength(1);
    expect(beachOnly.badges[0]!.text).toMatch(/^Beach 56/);
    const both = zone(buildZones(dataset, on('overall', 'beach', 'infrastructure'), null, {}), 'paje');
    expect(both.badges.map((b) => b.text.split(' ')[0])).toEqual(['Overall', 'Beach', 'Infra']);
  });

  it('colours the fill by band and marks unverified data with a dashed outline and "?"', () => {
    const z = zone(buildZones(dataset, on('beach'), null, {}), 'nungwi'); // 85 → strong
    expect(z.fill).toBe(BANDS.strong.color);
    expect(z.dashed).toBe(true);
    expect(z.badges[0]!.text).toContain('?');
    const stone = zone(buildZones(dataset, on('beach'), null, {}), 'stone-town'); // 12 → poor
    expect(stone.fill).toBe(BANDS.poor.color);
  });

  it('warnings overlay shows a count badge and does not fill the zone', () => {
    const z = zone(buildZones(dataset, on('warnings'), null, {}), 'kizimkazi');
    expect(z.fill).toBeNull();
    expect(z.badges).toHaveLength(1);
    expect(z.badges[0]!.title).toMatch(/warning/i);
  });

  it('shows "disputed" (!) when the tester marked the area wrong', () => {
    const fb = { paje: { areaId: 'paje', rating: 'wrong' as const, note: '', updatedAt: 'x' } };
    const z = zone(buildZones(dataset, on('overall'), null, fb), 'paje');
    expect(z.badges[0]!.text).toContain('!');
    expect(z.badges[0]!.title).toMatch(/disputed/);
  });

  it('flags the selected zone', () => {
    const zs = buildZones(dataset, on('overall'), 'paje', {});
    expect(zs.filter((z) => z.selected).map((z) => z.id)).toEqual(['paje']);
  });
});

describe('buildAttractionMarkers', () => {
  it('is empty when the Attractions overlay is off', () => {
    expect(buildAttractionMarkers(dataset.attractions, on('overall'), null)).toEqual([]);
  });
  it('returns every attraction when on, flagging unverified ones', () => {
    const m = buildAttractionMarkers(dataset.attractions, on('attractions'), 'jozani');
    expect(m).toHaveLength(dataset.attractions.length);
    expect(m.every((x) => !x.verified)).toBe(true);
    expect(m.find((x) => x.id === 'jozani')!.selected).toBe(true);
  });
});
