import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { MapViewProps } from './map';
import { EMPTY_EVIDENCE, loadDataset } from './domain/dataset';
import { fixture, fixtureDataset } from './test/fixtures';

// Leaflet needs a real layout engine; the map sits behind a provider seam, so tests swap it for a probe.
let mapProps: MapViewProps;
vi.mock('./map', () => ({
  ZanzibarMap: (props: MapViewProps) => {
    mapProps = props;
    return (
      <div data-testid="map">
        {props.shapes.map((s) => (
          <button key={s.key} type="button" onClick={() => props.onSelectShape(s.kind, s.id)}>shape:{s.key}</button>
        ))}
        {props.markers.map((m) => (
          <button key={m.key} type="button" onClick={() => props.onSelectMarker(m.kind, m.id)}>marker:{m.key}</button>
        ))}
        <button type="button" onClick={() => props.onPickPoint([0.005, 0.0051])}>pick-point</button>
      </div>
    );
  },
}));

import { App } from './App';

const user = () => userEvent.setup();
const renderFixture = () => render(<App dataset={fixtureDataset} problems={fixture.problems} />);
const shapeBtn = (k: string) => screen.getByRole('button', { name: `shape:${k}` });
const panel = (name: RegExp) => screen.getByRole('region', { name });

describe('layers', () => {
  it('switches each of the six layers (and hotels) independently', async () => {
    const u = user();
    renderFixture();
    const group = screen.getByRole('group', { name: 'Map layers' });
    const toggle = (n: RegExp) => within(group).getByRole('button', { name: n });
    const state = () => within(group).getAllByRole('button').map((b) => b.getAttribute('aria-pressed'));

    expect(within(group).getAllByRole('button')).toHaveLength(7);
    expect(state()).toEqual(['true', 'false', 'false', 'false', 'false', 'true', 'true']); // overall, attractions, hotels

    await u.click(toggle(/Beach/));
    await u.click(toggle(/Tourist infrastructure/));
    await u.click(toggle(/Surroundings/));
    await u.click(toggle(/Environmental/));
    const town = () => mapProps.shapes.find((s) => s.key === 'area:fx-town')!;
    expect(town().badges).toHaveLength(5); // overall, beach, infra, surroundings, warnings
    expect(mapProps.shapes.some((s) => s.kind === 'beach')).toBe(true);

    await u.click(toggle(/Overall/));
    expect(town().badges).toHaveLength(4);
    await u.click(toggle(/Attractions/));
    expect(mapProps.markers.map((m) => m.kind)).toEqual(['hotel', 'hotel']);
    await u.click(toggle(/Hotels/));
    expect(mapProps.markers).toEqual([]);
    for (const n of [/Beach/, /Tourist infrastructure/, /Surroundings/, /Environmental/]) await u.click(toggle(n));
    expect(town().badges).toEqual([]);
  });
});

describe('local reality panel: area', () => {
  it('shows every dimension with provenance, and unknown stays unknown', async () => {
    const u = user();
    renderFixture();
    await u.click(shapeBtn('area:fx-town'));
    const p = within(panel(/Local reality: FIXTURE Town/));
    expect(p.getByText('Overall stay attractiveness', { selector: '.score-label' })).toBeInTheDocument();
    expect(p.getByText('Surroundings / visual environment', { selector: '.score-label' })).toBeInTheDocument();
    // headline for overall is the verified external-source assessment, others remain listed
    expect(p.getAllByText(/Source: External source/).length).toBeGreaterThan(0);
    expect(p.getByText(/2 other assessments/)).toBeInTheDocument();
    // no evidence for infrastructure: explicit unknown, not a number
    expect(p.getByText(/No evidence has been supplied for this dimension/)).toBeInTheDocument();
    expect(p.getAllByText('No evidence yet').length).toBeGreaterThan(0);
    // null beach score: unknown source, no number
    expect(p.getAllByText('No score')).toHaveLength(2); // beach (null score) and infrastructure (no assessment)
    expect(p.getAllByText(/Source: Unknown source/).length).toBeGreaterThan(0);
  });

  it('lists warnings with category, severity and provenance', async () => {
    const u = user();
    renderFixture();
    await u.click(shapeBtn('area:fx-town'));
    const p = within(panel(/Local reality: FIXTURE Town/));
    expect(p.getByText(/Problem · Industrial: FIXTURE warning/)).toBeInTheDocument();
  });

  it('shows the local-reality topics and says "No evidence yet" where there is none', async () => {
    const u = user();
    renderFixture();
    await u.click(shapeBtn('area:fx-town'));
    const p = within(panel(/Local reality: FIXTURE Town/));
    for (const t of ['Beach / swimming conditions', 'Access to the beach', 'Tourist infrastructure nearby', 'Roads / built environment', 'Ports / marinas / industrial features', 'Surroundings attractiveness', 'Known environmental issues', 'Key attractions', 'Distance / context']) {
      expect(p.getByRole('heading', { name: t })).toBeInTheDocument();
    }
    expect(p.getByText('FIXTURE: access note.')).toBeInTheDocument();
    expect(p.getAllByText(/^No evidence yet\.$/).length).toBeGreaterThan(3);
    expect(p.getByText(/Airport: ≈/)).toBeInTheDocument();
  });

  it('sub-zones show an inherited parent value and say so', async () => {
    const u = user();
    renderFixture();
    await u.click(shapeBtn('subzone:fx-town-north'));
    const p = within(panel(/Local reality: FIXTURE Town North/));
    expect(p.getAllByText(/Inherited from parent area FIXTURE Town/).length).toBeGreaterThan(0);
    expect(p.getByText(/Part of FIXTURE Town/)).toBeInTheDocument();
  });

  it('beach features open with the beach assessment', async () => {
    const u = user();
    renderFixture();
    await u.click(within(screen.getByRole('group', { name: 'Map layers' })).getByRole('button', { name: /Beach/ }));
    await u.click(shapeBtn('beach:fx-beach'));
    const p = within(panel(/Local reality: FIXTURE Beach/));
    expect(p.getByText('Beach / swimming reality', { selector: '.score-label' })).toBeInTheDocument();
    expect(p.getByLabelText(/Beach \/ swimming reality: 45 out of 100/)).toBeInTheDocument();
  });
});

describe('local reality panel: hotel, pin, radius', () => {
  it('a hotel draws on the areas containing it, shows derived context and an analysis circle', async () => {
    const u = user();
    renderFixture();
    await u.click(screen.getByRole('button', { name: 'marker:hotel:fx-hotel' }));
    const p = within(panel(/Local reality: FIXTURE Hotel/));
    expect(p.getByText(/TEST FIXTURE/)).toBeInTheDocument();
    expect(p.getByText(/Located inside: FIXTURE Town/)).toBeInTheDocument();
    expect(p.getAllByText(/From FIXTURE Town/).length).toBeGreaterThan(0);
    expect(mapProps.circle).toMatchObject({ radiusM: 500 });
    // key attractions within radius are computed from geometry and labelled as derived
    expect(p.getByText(/FIXTURE Attraction — 1\d\d m/)).toBeInTheDocument();
    expect(p.getAllByText(/Source: Derived/).length).toBeGreaterThan(0);
  });

  it('switches between 250 m, 500 m and 1 km; analyses exist only where supplied', async () => {
    const u = user();
    renderFixture();
    await u.click(screen.getByRole('button', { name: 'marker:hotel:fx-hotel' }));
    const p = within(panel(/Local reality: FIXTURE Hotel/));
    const radiusGroup = p.getByRole('group', { name: 'Analysis radius' });
    for (const [label, m] of [['250 m', 250], ['500 m', 500], ['1 km', 1000]] as const) {
      await u.click(within(radiusGroup).getByRole('button', { name: label }));
      expect(mapProps.circle?.radiusM).toBe(m);
    }
    await u.click(within(radiusGroup).getByRole('button', { name: '500 m' }));
    expect(p.getByText('FIXTURE method', { exact: false })).toBeInTheDocument();
    expect(p.getByText('1.2 km')).toBeInTheDocument();
    await u.click(within(radiusGroup).getByRole('button', { name: '250 m' }));
    expect(p.getByTestId('radius-empty')).toHaveTextContent(/Not computed/);
    // observation limited to 250 m only appears at 250 m
    expect(p.queryByText('FIXTURE: 250 m only.')).toBeInTheDocument();
    await u.click(within(radiusGroup).getByRole('button', { name: '1 km' }));
    expect(p.queryByText('FIXTURE: 250 m only.')).not.toBeInTheDocument();
  });

  it('a dropped pin gets Reality Explorer links, containment and no invented scores', async () => {
    const u = user();
    renderFixture();
    await u.click(screen.getByRole('button', { name: 'pick-point' }));
    const p = within(panel(/Local reality: Dropped pin/));
    expect(p.getByText('Dropped pin', { selector: '.kind-tag' })).toBeInTheDocument();
    expect(p.getByRole('link', { name: /Open Google Maps/ })).toHaveAttribute('href', expect.stringContaining('query=0.005000,0.005100'));
    expect(p.getByRole('link', { name: /Open Street View/ })).toHaveAttribute('href', expect.stringContaining('map_action=pano'));
    expect(p.getByRole('link', { name: /Google Earth/ })).toHaveAttribute('href', expect.stringContaining('earth.google.com'));
    expect(p.getByRole('link', { name: /Satellite/ })).toHaveAttribute('href', expect.stringContaining('basemap=satellite'));
    expect(p.getByText(/Located inside: FIXTURE Town/)).toBeInTheDocument();
    expect(mapProps.pin).toMatchObject({ position: [0.005, 0.0051] });
    expect(mapProps.circle).not.toBeNull();
    expect(p.queryByText('Reality calibration (tester mode)')).not.toBeInTheDocument(); // pins have no dataset claims to rate
  });
});

describe('Reality Explorer on a feature', () => {
  it('is available for areas, with a note that the position is a derived centre', async () => {
    const u = user();
    renderFixture();
    await u.click(shapeBtn('area:fx-cove'));
    const p = within(panel(/Local reality: FIXTURE Cove/));
    expect(p.getByRole('link', { name: /Open Google Maps/ })).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(p.getByText(/bounding box/)).toBeInTheDocument();
  });
});

describe('tester mode: per-dimension calibration', () => {
  const fbBlock = (p: ReturnType<typeof within>, label: string) => p.getByRole('group', { name: `Accuracy of: ${label}` });

  it('stores independent ratings and notes per dimension as first-hand-user and flags without overwriting evidence', async () => {
    const u = user();
    renderFixture();
    await u.click(shapeBtn('area:fx-town'));
    const p = within(panel(/Local reality: FIXTURE Town/));
    for (const label of ['Overall stay attractiveness', 'Beach / swimming reality', 'Tourist infrastructure', 'Surroundings / visual environment', 'Environmental / industrial warnings']) {
      expect(fbBlock(p, label)).toBeInTheDocument();
    }
    for (const r of ['Accurate', 'Mostly accurate', 'Wrong', 'Not sure']) {
      expect(within(fbBlock(p, 'Overall stay attractiveness')).getByRole('button', { name: r })).toBeInTheDocument();
    }
    await u.click(within(fbBlock(p, 'Beach / swimming reality')).getByRole('button', { name: 'Wrong' }));
    await u.type(p.getByLabelText('Note (Beach / swimming reality)'), 'seaweed everywhere');
    await u.click(within(fbBlock(p, 'Overall stay attractiveness')).getByRole('button', { name: 'Accurate' }));

    const stored = JSON.parse(window.localStorage.getItem('zanzibar-reality:feedback:v2')!);
    expect(Object.keys(stored).sort()).toEqual(['area:fx-town:beach', 'area:fx-town:overall']);
    expect(stored['area:fx-town:beach']).toMatchObject({ rating: 'wrong', note: 'seaweed everywhere', sourceType: 'first-hand-user' });
    expect(stored['area:fx-town:overall']).toMatchObject({ rating: 'accurate', sourceType: 'first-hand-user' });

    // other dimensions untouched; the dataset's own assessments are still shown unchanged next to your feedback
    expect(within(fbBlock(p, 'Tourist infrastructure')).getAllByRole('button').every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    expect(p.getAllByText(/Your feedback:/, { selector: 'p strong' })).toHaveLength(2); // beach and overall
    expect(p.getAllByText(/dataset evidence unchanged/).length).toBeGreaterThan(0);
    expect(fixtureDataset.evidence.assessments.find((a) => a.id === 'a1')!.score).toBe(60);
  });

  it('exports structured JSON with the dataset claims alongside', async () => {
    const u = user();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:fake'));
    URL.revokeObjectURL = vi.fn();
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { downloads.push(this.download); });

    renderFixture();
    await u.click(shapeBtn('area:fx-town'));
    const p = within(panel(/Local reality: FIXTURE Town/));
    await u.click(within(fbBlock(p, 'Environmental / industrial warnings')).getByRole('button', { name: 'Wrong' }));
    await u.click(screen.getByRole('button', { name: 'Calibrate' }));
    expect(screen.getByText('1 dimension rating saved')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Export feedback JSON/ }));
    expect(downloads[0]).toMatch(/^zanzibar-reality-feedback-\d{4}-\d{2}-\d{2}\.json$/);
    const json = JSON.parse(await blobs[0]!.text());
    expect(json.schemaVersion).toBe(2);
    expect(json.entries).toHaveLength(1);
    expect(json.entries[0]).toMatchObject({ featureId: 'fx-town', dimension: 'warnings', rating: 'wrong', sourceType: 'first-hand-user' });
    expect(json.entries[0].datasetClaims[0]).toMatchObject({ id: 'w1', severity: 'problem' });
    expect(JSON.parse((screen.getByLabelText('Feedback JSON') as HTMLTextAreaElement).value).entries).toHaveLength(1);
  });

  it('restores saved feedback after a reload', async () => {
    const u = user();
    const first = renderFixture();
    await u.click(shapeBtn('area:fx-cove'));
    await u.click(within(fbBlock(within(panel(/Local reality: FIXTURE Cove/)), 'Tourist infrastructure')).getByRole('button', { name: 'Mostly accurate' }));
    first.unmount();
    renderFixture();
    await u.click(screen.getByRole('button', { name: 'Calibrate' }));
    expect(screen.getByText('1 dimension rating saved')).toBeInTheDocument();
  });

  it('calibrates every area, sub-zone and beach from the Calibrate tab', async () => {
    const u = user();
    renderFixture();
    await u.click(screen.getByRole('button', { name: 'Calibrate' }));
    for (const n of ['FIXTURE Town', 'FIXTURE Town North', 'FIXTURE Cove', 'FIXTURE Beach']) {
      expect(screen.getByLabelText(`Calibrate ${n}`)).toBeInTheDocument();
    }
  });

  it('hides the in-panel calibration when tester mode is off', async () => {
    const u = user();
    renderFixture();
    await u.click(shapeBtn('area:fx-town'));
    expect(screen.getByText('Reality calibration (tester mode)')).toBeInTheDocument();
    await u.click(screen.getByLabelText('Tester mode'));
    expect(screen.queryByText('Reality calibration (tester mode)')).not.toBeInTheDocument();
  });
});

describe('compare view', () => {
  it('compares two areas using only dataset evidence', async () => {
    const u = user();
    renderFixture();
    await u.click(screen.getByRole('button', { name: 'Compare' }));
    const view = screen.getByTestId('compare-view');
    await u.selectOptions(within(view).getByLabelText('Area A'), 'fx-town');
    await u.selectOptions(within(view).getByLabelText('Area B'), 'fx-cove');
    const table = within(view).getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'FIXTURE Town' })).toBeInTheDocument();
    const overall = within(table).getByRole('row', { name: /Overall stay attractiveness/ });
    expect(overall).toHaveTextContent('60');
    expect(overall).toHaveTextContent('30');
    expect(within(table).getByRole('row', { name: /Tourist infrastructure/ })).toHaveTextContent('No evidence yet');
  });
});

describe('empty dataset (nothing supplied yet)', () => {
  const empty = loadDataset({
    meta: JSON.stringify({ datasetVersion: 'empty', description: '', airport: null, mapBounds: [0, 0, 1, 1], sanityBounds: [-1, -1, 2, 2] }),
    areas: '{"type":"FeatureCollection","features":[]}',
    beaches: '{"type":"FeatureCollection","features":[]}',
    attractions: '[]',
    hotels: '[]',
    evidence: JSON.stringify(EMPTY_EVIDENCE),
  });

  it('says plainly that no data is loaded and shows no scores', () => {
    render(<App dataset={empty.dataset} problems={empty.problems} />);
    expect(screen.getByText(/No Zanzibar geometry or evidence is loaded/)).toBeInTheDocument();
    expect(mapProps.shapes).toEqual([]);
    expect(mapProps.markers).toEqual([]);
    expect(screen.getByText('Dataset passes validation.')).toBeInTheDocument();
  });

  it('still lets you drop a pin and inspect the place with Reality Explorer', async () => {
    const u = user();
    render(<App dataset={empty.dataset} problems={empty.problems} />);
    await u.click(screen.getByRole('button', { name: 'pick-point' }));
    const p = within(panel(/Local reality: Dropped pin/));
    expect(p.getByRole('link', { name: /Open Street View/ })).toBeInTheDocument();
    expect(p.getAllByText(/No evidence has been supplied for this dimension/)).toHaveLength(4);
    expect(p.getByText(/Distance to airport: unknown/)).toBeInTheDocument();
  });

  it('explains empty Compare and Calibrate views instead of inventing content', async () => {
    const u = user();
    render(<App dataset={empty.dataset} problems={empty.problems} />);
    await u.click(screen.getByRole('button', { name: 'Compare' }));
    expect(screen.getByText(/needs at least two areas/)).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Calibrate' }));
    expect(screen.getByTestId('calibrate-empty')).toBeInTheDocument();
  });

  it('surfaces dataset problems to whoever is supplying data', () => {
    render(<App dataset={empty.dataset} problems={['areas.geojson: not valid JSON (x)']} />);
    expect(screen.getByRole('alert')).toHaveTextContent('areas.geojson: not valid JSON');
  });
});

describe('Offers tab (frozen demo)', () => {
  it('still renders, labelled demo, and is independent of the Reality dataset', async () => {
    const u = user();
    render(<App dataset={loadDataset({ meta: JSON.stringify({ datasetVersion: 'e', description: '', airport: null, mapBounds: [0, 0, 1, 1], sanityBounds: [-1, -1, 2, 2] }), areas: '{"type":"FeatureCollection","features":[]}', beaches: '{"type":"FeatureCollection","features":[]}', attractions: '[]', hotels: '[]', evidence: '{}' }).dataset} problems={[]} />);
    await u.click(screen.getByRole('button', { name: 'Offers' }));
    const view = screen.getByTestId('offers-view');
    expect(within(view).getByText('frozen demo')).toBeInTheDocument();
    expect(within(view).getAllByTestId('offer-result').length).toBeGreaterThan(0);
    for (const card of within(view).getAllByTestId('offer-result')) expect(within(card).getByText('DEMO / NOT LIVE DATA')).toBeInTheDocument();
  });
});
