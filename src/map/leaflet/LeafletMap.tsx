import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../../domain/types';
import type { MapViewProps } from '../types';
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from './tiles';

const ll = (p: LatLng): L.LatLngTuple => [p[0], p[1]];

/** Below this zoom, chips collapse to their short form to avoid overlapping labels. */
const LOW_ZOOM = 11;

/** Leaflet implementation of the provider-neutral map contract. */
export function LeafletMap(props: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const shapeLayer = useRef<L.LayerGroup | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const overlayLayer = useRef<L.LayerGroup | null>(null);
  const labels = useRef<Array<{ marker: L.Marker; minZoom: number }>>([]);
  const handlers = useRef(props);
  handlers.current = props;

  const applyLabelZoom = () => {
    const map = mapRef.current;
    if (!map) return;
    const z = map.getZoom();
    for (const { marker, minZoom } of labels.current) {
      const el = marker.getElement();
      if (el) el.style.display = z >= minZoom ? '' : 'none';
    }
  };

  // Create the map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const [s, w, n, e] = handlers.current.bounds;
    const map = L.map(el, { zoomControl: false, minZoom: 5, zoomSnap: 0.5 });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: TILE_MAX_ZOOM }).addTo(map);
    map.fitBounds([[s, w], [n, e]]);
    shapeLayer.current = L.layerGroup().addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    overlayLayer.current = L.layerGroup().addTo(map);
    map.on('click', (ev: L.LeafletMouseEvent) => handlers.current.onPickPoint([ev.latlng.lat, ev.latlng.lng]));
    mapRef.current = map;
    const onZoom = () => {
      el.classList.toggle('zr-low', map.getZoom() < LOW_ZOOM);
      applyLabelZoom();
    };
    map.on('zoomend', onZoom);
    onZoom();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Feature geometry + label chips. Data is small, so redraw wholesale.
  useEffect(() => {
    const layer = shapeLayer.current;
    if (!layer) return;
    layer.clearLayers();
    labels.current = [];
    for (const s of props.shapes) {
      const select = () => handlers.current.onSelectShape(s.kind, s.id);
      const common = {
        color: s.outline,
        weight: s.outlineWeight,
        dashArray: s.dashed ? '6 5' : undefined,
        bubblingMouseEvents: false,
      };
      for (const rings of s.polygons) {
        L.polygon(rings.map((r) => r.map(ll)), {
          ...common,
          fillColor: s.fill ?? '#ffffff',
          fillOpacity: s.fill ? (s.selected ? 0.62 : 0.45) : 0.04,
        })
          .on('click', select)
          .addTo(layer);
      }
      for (const line of s.lines) {
        L.polyline(line.map(ll), common).on('click', select).addTo(layer);
      }
      if (!s.labelAt) continue;
      const wrap = document.createElement('div');
      wrap.className = `zr-label${s.selected ? ' is-selected' : ''}`;
      const name = document.createElement('span');
      name.className = 'zr-label-name';
      name.textContent = s.name;
      wrap.appendChild(name);
      for (const b of s.badges) {
        const chip = document.createElement('span');
        chip.className = 'zr-chip';
        chip.style.background = b.color;
        const long = document.createElement('span');
        long.className = 'zr-chip-long';
        long.textContent = b.text;
        const short = document.createElement('span');
        short.className = 'zr-chip-short';
        short.textContent = b.short;
        chip.append(long, short);
        chip.title = b.title;
        chip.setAttribute('aria-label', b.title);
        wrap.appendChild(chip);
      }
      const marker = L.marker(ll(s.labelAt), {
        icon: L.divIcon({ html: wrap, className: 'zr-label-icon', iconSize: [0, 0] }),
        keyboard: true,
        zIndexOffset: 1000,
        title: `${s.name} — open details`,
        bubblingMouseEvents: false,
      });
      marker.on('click', select).addTo(layer);
      labels.current.push({ marker, minZoom: s.labelMinZoom });
    }
    applyLabelZoom();
  }, [props.shapes]);

  useEffect(() => {
    const layer = markerLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const m of props.markers) {
      const el = document.createElement('div');
      el.className = `zr-attraction zr-${m.kind}${m.verified ? '' : ' is-unverified'}${m.selected ? ' is-selected' : ''}`;
      el.textContent = m.glyph;
      L.marker(ll(m.position), {
        icon: L.divIcon({ html: el, className: 'zr-attraction-icon', iconSize: [30, 30], iconAnchor: [15, 15] }),
        title: `${m.name}${m.verified ? '' : ' (unverified)'}`,
        bubblingMouseEvents: false,
      })
        .on('click', () => handlers.current.onSelectMarker(m.kind, m.id))
        .addTo(layer);
    }
  }, [props.markers]);

  // Dropped pin + analysis circle.
  useEffect(() => {
    const layer = overlayLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (props.circle) {
      L.circle(ll(props.circle.center), {
        radius: props.circle.radiusM,
        color: '#0f3d4a',
        weight: 2,
        dashArray: '4 4',
        fillColor: '#0f3d4a',
        fillOpacity: 0.07,
        interactive: false,
      }).addTo(layer);
    }
    if (props.pin) {
      const el = document.createElement('div');
      el.className = 'zr-pin';
      el.textContent = '📍';
      L.marker(ll(props.pin.position), {
        icon: L.divIcon({ html: el, className: 'zr-pin-icon', iconSize: [30, 30], iconAnchor: [15, 28] }),
        title: props.pin.label,
        interactive: false,
      }).addTo(layer);
    }
  }, [props.pin, props.circle]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.focus) return;
    map.flyTo(ll(props.focus), Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [props.focus]);

  return <div ref={containerRef} className="zr-map" role="application" aria-label="Interactive map" />;
}
