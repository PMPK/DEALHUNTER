import { BANDS } from '../domain/scoring';
import type { Band } from '../domain/scoring';
import { LAYERS, type LayerId } from './layers';

export function LayerControls({ active, onToggle }: { active: ReadonlySet<LayerId>; onToggle: (id: LayerId) => void }) {
  return (
    <div className="overlay-controls" role="group" aria-label="Map layers">
      {LAYERS.map((l) => {
        const on = active.has(l.id);
        return (
          <button key={l.id} type="button" className={`chip-toggle${on ? ' on' : ''}`} aria-pressed={on} title={l.hint} onClick={() => onToggle(l.id)}>
            <span aria-hidden="true">{on ? '☑' : '☐'}</span> {l.label}
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
        <li><span className="swatch" style={{ background: BANDS.unknown.color }} /> No evidence / unknown (never shown as a number)</li>
      </ul>
      <p className="small">Dashed outline = unverified or unknown. “?” unverified, “!” disputed or marked wrong by you. Fill uses the first enabled score layer; chips show every enabled one.</p>
      <p className="small">Warnings layer: outline colour = worst recorded warning; “— 0” means none recorded, not none existing.</p>
    </details>
  );
}
