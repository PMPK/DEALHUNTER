import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLng } from '../../domain/types';
import type { MapViewProps } from '../types';
import { MAX_BOUNDS, TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, ZANZIBAR_BOUNDS } from './tiles';

/** Below this zoom, chips collapse to their short form to avoid overlapping labels. */
const LOW_ZOOM = 11;

const ll = (p: LatLng): L.LatLngTuple => [p[0], p[1]];

/** Leaflet implementation of the provider-neutral map contract. */
export function LeafletMap(props: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const zoneLayer = useRef<L.LayerGroup | null>(null);
  const attractionLayer = useRef<L.LayerGroup | null>(null);
  const pinLayer = useRef<L.LayerGroup | null>(null);
  const handlers = useRef(props);
  handlers.current = props;

  // Create the map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const map = L.map(el, { zoomControl: false, maxBounds: MAX_BOUNDS, minZoom: 8, zoomSnap: 0.5 });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: TILE_MAX_ZOOM }).addTo(map);
    map.fitBounds(ZANZIBAR_BOUNDS);
    zoneLayer.current = L.layerGroup().addTo(map);
    attractionLayer.current = L.layerGroup().addTo(map);
    pinLayer.current = L.layerGroup().addTo(map);
    map.on('click', (e: L.LeafletMouseEvent) => handlers.current.onPickPoint([e.latlng.lat, e.latlng.lng]));
    mapRef.current = map;
    const syncZoomClass = () => el.classList.toggle('zr-low', map.getZoom() < LOW_ZOOM);
    map.on('zoomend', syncZoomClass);
    syncZoomClass();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Zones + their label chips. Data is tiny, so redraw wholesale.
  useEffect(() => {
    const layer = zoneLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const z of props.zones) {
      const poly = L.polygon(z.ring.map(ll), {
        color: z.outline,
        weight: z.outlineWeight,
        dashArray: z.dashed ? '6 5' : undefined,
        fillColor: z.fill ?? '#ffffff',
        fillOpacity: z.fill ? (z.selected ? 0.62 : 0.45) : 0.04,
        bubblingMouseEvents: false,
      });
      poly.on('click', () => handlers.current.onSelectZone(z.id));
      poly.addTo(layer);

      const wrap = document.createElement('div');
      wrap.className = `zr-label${z.selected ? ' is-selected' : ''}`;
      const name = document.createElement('span');
      name.className = 'zr-label-name';
      name.textContent = z.name;
      wrap.appendChild(name);
      for (const b of z.badges) {
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
      const marker = L.marker(ll(z.labelAt), {
        icon: L.divIcon({ html: wrap, className: 'zr-label-icon', iconSize: [0, 0] }),
        keyboard: true,
        zIndexOffset: 1000,
        title: `${z.name} — open details`,
        bubblingMouseEvents: false,
      });
      marker.on('click', () => handlers.current.onSelectZone(z.id));
      marker.addTo(layer);
    }
  }, [props.zones]);

  useEffect(() => {
    const layer = attractionLayer.current;
    if (!layer) return;
    layer.clearLayers();
    for (const a of props.attractions) {
      const el = document.createElement('div');
      el.className = `zr-attraction${a.verified ? '' : ' is-unverified'}${a.selected ? ' is-selected' : ''}`;
      el.textContent = a.glyph;
      const m = L.marker(ll(a.position), {
        icon: L.divIcon({ html: el, className: 'zr-attraction-icon', iconSize: [30, 30], iconAnchor: [15, 15] }),
        title: `${a.name}${a.verified ? '' : ' (unverified)'}`,
        bubblingMouseEvents: false,
      });
      m.on('click', () => handlers.current.onSelectAttraction(a.id));
      m.addTo(layer);
    }
  }, [props.attractions]);

  useEffect(() => {
    const layer = pinLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (!props.pin) return;
    const el = document.createElement('div');
    el.className = 'zr-pin';
    el.textContent = '📍';
    L.marker(ll(props.pin.position), {
      icon: L.divIcon({ html: el, className: 'zr-pin-icon', iconSize: [30, 30], iconAnchor: [15, 28] }),
      title: props.pin.label,
      interactive: false,
    }).addTo(layer);
  }, [props.pin]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.focus) return;
    map.flyTo(ll(props.focus), Math.max(map.getZoom(), 12), { duration: 0.6 });
  }, [props.focus]);

  return <div ref={containerRef} className="zr-map" role="application" aria-label="Interactive map of Zanzibar" />;
}
