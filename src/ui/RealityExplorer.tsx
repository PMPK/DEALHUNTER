import { googleEarthUrl, googleMapsUrl, satelliteUrl, streetViewUrl } from '../domain/links';
import type { LatLng } from '../domain/types';

export interface ExplorerTarget {
  label: string;
  position: LatLng;
  /** Extra caveat shown under the label, e.g. "synthetic position". */
  caveat?: string;
}

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const;

export function RealityExplorer({ target }: { target: ExplorerTarget }) {
  const [lat, lng] = target.position;
  return (
    <div className="explorer">
      <p className="explorer-target">
        <strong>Location:</strong> {target.label} <span className="muted">({lat.toFixed(4)}, {lng.toFixed(4)})</span>
      </p>
      {target.caveat ? <p className="muted small">{target.caveat}</p> : null}
      <div className="btn-row">
        <a className="btn" href={googleMapsUrl(target.position)} {...ext}>🗺 Open Google Maps</a>
        <a className="btn" href={streetViewUrl(target.position)} {...ext}>🚶 Open Street View</a>
        <a className="btn" href={googleEarthUrl(target.position)} {...ext}>🌍 Google Earth</a>
        <a className="btn btn-ghost" href={satelliteUrl(target.position)} {...ext}>🛰 Satellite (Maps)</a>
      </div>
      <p className="muted small">Opens Google in a new tab — no API key used. Street View coverage in Zanzibar may be patchy.</p>
    </div>
  );
}
