import { BANDS, SEVERITY } from '../domain/scoring';
import type { Band } from '../domain/scoring';
import { OVERLAYS, type OverlayId } from './overlays';

export function OverlayControls({ active, onToggle }: { active: ReadonlySet<OverlayId>; onToggle: (id: OverlayId) => void }) {
  return (
    <div className="overlay-controls" role="group" aria-label="Map overlays">
      {OVERLAYS.map((o) => {
        const on = active.has(o.id);
        return (
          <button
            key={o.id}
            type="button"
            className={`chip-toggle${on ? ' on' : ''}`}
            aria-pressed={on}
            title={o.hint}
            onClick={() => onToggle(o.id)}
          >
            <span aria-hidden="true">{on ? '☑' : '☐'}</span> {o.label}
          </button>
        );
      })}
    </div>
  );
}

const LEGEND_BANDS: Band[] = ['strong', 'mixed', 'weak', 'poor'];

export function Legend() {
  return (
    <details className="legend">
      <summary>Legend</summary>
      <ul className="plain">
        {LEGEND_BANDS.map((b) => (
          <li key={b}>
            <span className="swatch" style={{ background: BANDS[b].color }} /> {BANDS[b].symbol} {BANDS[b].label} {BANDS[b].range}
          </li>
        ))}
        <li><span className="swatch" style={{ background: BANDS.unknown.color }} /> ? Unknown</li>
      </ul>
      <p className="small">Dashed outline and “?” = <strong>unverified</strong> seed data; “!” = disputed. Fill uses the first enabled score layer (Overall → Beach → Infra); chips show every enabled one.</p>
      <p className="small">Beige island shape is a rough schematic silhouette for orientation, not a survey. Zones are schematic too.</p>
      <p className="small">Warnings outline: {(['info', 'caution', 'problem'] as const).map((s) => `${SEVERITY[s].symbol} ${SEVERITY[s].label}`).join(' · ')}</p>
    </details>
  );
}
