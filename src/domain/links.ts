import type { LatLng } from './types';

const fmt = (n: number) => n.toFixed(6);

/** All links are plain public URLs — no API key, no embedding. */
export function googleMapsUrl([lat, lng]: LatLng): string {
  return `https://www.google.com/maps/search/?api=1&query=${fmt(lat)},${fmt(lng)}`;
}

/** Opens Street View if coverage exists; Google falls back to the map otherwise. */
export function streetViewUrl([lat, lng]: LatLng): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${fmt(lat)},${fmt(lng)}`;
}

export function googleEarthUrl([lat, lng]: LatLng): string {
  return `https://earth.google.com/web/@${fmt(lat)},${fmt(lng)},0a,3000d,35y,0h,0t,0r`;
}

export function satelliteUrl([lat, lng]: LatLng): string {
  return `https://www.google.com/maps/@?api=1&map_action=map&center=${fmt(lat)},${fmt(lng)}&zoom=17&basemap=satellite`;
}
