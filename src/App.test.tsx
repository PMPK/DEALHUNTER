import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MapViewProps } from './map';

// Leaflet needs a real layout engine; the map is behind a provider seam, so tests swap it for a probe.
let mapProps: MapViewProps;
vi.mock('./map', () => ({
  ZanzibarMap: (props: MapViewProps) => {
    mapProps = props;
    return (
      <div data-testid="map">
        {props.zones.map((z) => (
          <button key={z.id} type="button" data-fill={z.fill ?? ''} onClick={() => props.onSelectZone(z.id)}>
            zone:{z.id}
          </button>
        ))}
        {props.attractions.map((a) => (
          <button key={a.id} type="button" onClick={() => props.onSelectAttraction(a.id)}>
            attraction:{a.id}
          </button>
        ))}
        <button type="button" onClick={() => props.onPickPoint([-6.2, 39.3])}>
          pick-point
        </button>
      </div>
    );
  },
}));

import { App } from './App';

const user = () => userEvent.setup();
const zoneBtn = (id: string) => screen.getByRole('button', { name: `zone:${id}` });

beforeEach(() => {
  window.localStorage.clear();
});

describe('overlays', () => {
  it('switches every overlay independently', async () => {
    const u = user();
    render(<App />);
    const group = screen.getByRole('group', { name: 'Map overlays' });
    const toggle = (name: RegExp) => within(group).getByRole('button', { name });
    const pressed = () => within(group).getAllByRole('button').map((b) => b.getAttribute('aria-pressed'));

    expect(pressed()).toEqual(['true', 'false', 'false', 'false', 'true']); // defaults: overall + attractions
    expect(mapProps.attractions.length).toBeGreaterThan(0);

    await u.click(toggle(/Attractions/));
    expect(mapProps.attractions).toHaveLength(0);
    expect(mapProps.zones[0]!.badges).toHaveLength(1); // overall untouched

    await u.click(toggle(/Beach/));
    await u.click(toggle(/Infrastructure/));
    await u.click(toggle(/Reality Warnings/));
    expect(mapProps.zones[0]!.badges).toHaveLength(4);

    await u.click(toggle(/Overall/));
    expect(mapProps.zones[0]!.badges).toHaveLength(3);
    for (const name of [/Beach/, /Infrastructure/, /Reality Warnings/]) await u.click(toggle(name));
    expect(mapProps.zones[0]!.badges).toHaveLength(0);
    expect(mapProps.zones[0]!.fill).toBeNull();
  });
});

describe('area detail panel', () => {
  it('shows scores, positives, negatives, warnings, confidence, sources, airport distance and suitability', async () => {
    const u = user();
    render(<App />);
    await u.click(zoneBtn('paje'));
    const panel = screen.getByRole('region', { name: /Area details: Paje/ });
    const p = within(panel);
    for (const label of ['Area Reality Score', 'Beach / Swimming', 'Infrastructure']) {
      expect(p.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(panel.querySelectorAll('.score-card')).toHaveLength(3);
    expect(p.getByText('Main positives')).toBeInTheDocument();
    expect(p.getByText('Main negatives')).toBeInTheDocument();
    expect(p.getByRole('heading', { name: 'Warnings' })).toBeInTheDocument();
    expect(p.getAllByText(/Confidence: /).length).toBeGreaterThanOrEqual(3);
    expect(p.getByText(/Distance to airport/)).toBeInTheDocument();
    expect(p.getByText(/straight-line/)).toBeInTheDocument();
    expect(p.getByText('Suitable for')).toBeInTheDocument();
    expect(p.getByText('watersports')).toBeInTheDocument();
    expect(p.getByText('Sources & evidence')).toBeInTheDocument();
    expect(p.getByText(/Nearby attractions/)).toBeInTheDocument();
  });

  it('marks unverified seed values clearly', async () => {
    const u = user();
    render(<App />);
    await u.click(zoneBtn('nungwi'));
    const panel = screen.getByRole('region', { name: /Area details: Nungwi/ });
    expect(within(panel).getAllByText(/Unverified/).length).toBeGreaterThanOrEqual(3);
    expect(within(panel).getByText(/Seed values below are/)).toHaveTextContent(/unverified/i);
  });

  it('Reality Explorer links open Google Maps / Street View / Earth for the zone centre, and follow a dropped pin', async () => {
    const u = user();
    render(<App />);
    await u.click(zoneBtn('stone-town'));
    const link = (n: RegExp) => screen.getByRole('link', { name: n });
    expect(link(/Open Google Maps/)).toHaveAttribute('href', expect.stringContaining('google.com/maps/search/?api=1&query=-6.163000,39.192000'));
    expect(link(/Open Street View/)).toHaveAttribute('href', expect.stringContaining('map_action=pano'));
    expect(link(/Google Earth/)).toHaveAttribute('href', expect.stringContaining('earth.google.com'));
    expect(link(/Open Google Maps/)).toHaveAttribute('rel', expect.stringContaining('noopener'));

    await u.click(screen.getByRole('button', { name: 'pick-point' }));
    expect(link(/Open Google Maps/)).toHaveAttribute('href', expect.stringContaining('-6.200000,39.300000'));
    expect(mapProps.pin).not.toBeNull();
  });

  it('labels hotels as synthetic and offers as DEMO / NOT LIVE DATA', async () => {
    const u = user();
    render(<App />);
    await u.click(zoneBtn('nungwi'));
    await u.click(screen.getByText('Hotels & demo offers'));
    expect(screen.getAllByText('DEMO / NOT LIVE DATA').length).toBeGreaterThan(0);
    expect(screen.getByText('SYNTHETIC')).toBeInTheDocument();
    const offer = screen.getByTestId('demo-offer');
    expect(within(offer).getByText('DEMO / NOT LIVE DATA')).toBeInTheDocument();
    for (const label of ['People', 'From', 'Dates', 'Duration', 'Board']) expect(within(offer).getByText(label)).toBeInTheDocument();
    expect(within(offer).getByText(/Deal Score: placeholder/)).toBeInTheDocument();
  });

  it('opens an attraction card with source and verification state', async () => {
    const u = user();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'attraction:jozani' }));
    const card = screen.getByRole('region', { name: /Attraction: Jozani Forest/ });
    expect(within(card).getByText(/Source: Editorial seed/)).toBeInTheDocument();
    expect(within(card).getByText(/Unverified/)).toBeInTheDocument();
    expect(within(card).getByText(/Rating: unknown/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Open Street View/ })).toBeInTheDocument();
  });
});

describe('tester / calibration mode', () => {
  it('stores rating and note in localStorage and shows them in the export', async () => {
    const u = user();
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((b: Blob) => (blobs.push(b), 'blob:fake'));
    URL.revokeObjectURL = vi.fn();
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download);
    });

    render(<App />);
    await u.click(zoneBtn('paje'));
    const panel = screen.getByRole('region', { name: /Area details: Paje/ });
    for (const name of ['Accurate', 'Mostly accurate', 'Wrong', 'Not sure']) {
      expect(within(panel).getByRole('button', { name })).toBeInTheDocument();
    }
    await u.click(within(panel).getByRole('button', { name: 'Wrong' }));
    await u.type(within(panel).getByLabelText(/Your note for Paje/), 'Only swimmable at high tide');

    const stored = JSON.parse(window.localStorage.getItem('zanzibar-reality:feedback:v1')!);
    expect(stored.paje).toMatchObject({ rating: 'wrong', note: 'Only swimmable at high tide' });

    // "wrong" downgrades the displayed status to disputed
    expect(within(panel).getAllByText(/Disputed/).length).toBeGreaterThanOrEqual(3);

    await u.click(screen.getByRole('button', { name: 'Calibrate' }));
    expect(screen.getByText('1/10 areas rated')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: /Export feedback JSON/ }));
    expect(clicks[0]).toMatch(/^zanzibar-reality-feedback-\d{4}-\d{2}-\d{2}\.json$/);
    const json = JSON.parse(await blobs[0]!.text());
    expect(json.entries).toHaveLength(1);
    expect(json.entries[0]).toMatchObject({ areaId: 'paje', rating: 'wrong', note: 'Only swimmable at high tide' });
    // same JSON is also shown on screen for environments that block downloads
    expect(JSON.parse((screen.getByLabelText('Feedback JSON') as HTMLTextAreaElement).value).entries).toHaveLength(1);
  });

  it('restores saved feedback after reload', async () => {
    const u = user();
    const first = render(<App />);
    await u.click(zoneBtn('jambiani'));
    await u.click(within(screen.getByRole('region', { name: /Area details: Jambiani/ })).getByRole('button', { name: 'Accurate' }));
    first.unmount();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Calibrate' }));
    expect(screen.getByText('1/10 areas rated')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Calibrate Jambiani' })).getByRole('button', { name: 'Accurate' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('hides the in-panel calibration form when tester mode is off', async () => {
    const u = user();
    render(<App />);
    await u.click(zoneBtn('paje'));
    expect(screen.getByText('Reality calibration (tester mode)')).toBeInTheDocument();
    await u.click(screen.getByLabelText('Tester mode'));
    expect(screen.queryByText('Reality calibration (tester mode)')).not.toBeInTheDocument();
  });
});

describe('compare view', () => {
  it('compares two areas side by side and updates on selection', async () => {
    const u = user();
    render(<App />);
    await u.click(screen.getByRole('button', { name: 'Compare' }));
    const view = screen.getByTestId('compare-view');
    await u.selectOptions(within(view).getByLabelText('Area A'), 'nungwi');
    await u.selectOptions(within(view).getByLabelText('Area B'), 'stone-town');
    const table = within(view).getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Nungwi' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Stone Town' })).toBeInTheDocument();
    const beachRow = within(table).getByRole('row', { name: /Beach \/ Swimming/ });
    expect(beachRow).toHaveTextContent('85');
    expect(beachRow).toHaveTextContent('12');
    expect(within(table).getByRole('rowheader', { name: 'Distance to airport' })).toBeInTheDocument();
  });

  it('opens from an area panel pre-seeded with that area', async () => {
    const u = user();
    render(<App />);
    await u.click(zoneBtn('kendwa'));
    await u.click(screen.getByRole('button', { name: /Compare with another area/ }));
    expect(within(screen.getByTestId('compare-view')).getByLabelText('Area A')).toHaveValue('kendwa');
  });
});
