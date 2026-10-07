// Generates SCHEMATIC zone polygons (rounded rectangles oriented along the coast).
// They are NOT official boundaries. Run: node tools/generate-zones.mjs
import { writeFileSync } from 'node:fs';

// id, centre [lat,lng], length km (along coast), width km (across), coast bearing degrees (0 = north)
const zones = [
  ['nungwi', [-5.7240, 39.2955], 3.0, 5.0, 0],
  ['kendwa', [-5.7545, 39.2915], 2.8, 4.4, 0],
  ['matemwe', [-5.8690, 39.3860], 5.0, 4.6, 20],
  ['kiwengwa', [-6.0200, 39.3880], 6.0, 4.8, 10],
  ['michamvi', [-6.1450, 39.5480], 6.0, 4.6, 40],
  ['bwejuu', [-6.2400, 39.5330], 3.2, 4.4, 5],
  ['paje', [-6.2720, 39.5340], 3.2, 4.4, 5],
  ['jambiani', [-6.3120, 39.5440], 4.6, 4.4, 10],
  ['kizimkazi', [-6.4400, 39.4720], 5.0, 4.8, 60],
  ['stone-town', [-6.1630, 39.1920], 3.6, 3.6, 20],
];

const KM_PER_DEG_LAT = 110.574;
function ring([lat, lng], lengthKm, widthKm, bearingDeg) {
  const kmPerDegLng = 111.32 * Math.cos((lat * Math.PI) / 180);
  const a = (bearingDeg * Math.PI) / 180;
  const half = [lengthKm / 2, widthKm / 2];
  const r = Math.min(half[0], half[1]) * 0.45; // corner rounding
  const pts = [];
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]]; // (along, across)
  const startAngles = [0, 90, 180, 270];
  corners.forEach(([sa, sc], i) => {
    const cx = sa * (half[0] - r);
    const cy = sc * (half[1] - r);
    for (let s = 0; s <= 4; s++) {
      const t = ((startAngles[i] + (s * 90) / 4) * Math.PI) / 180;
      const along = cx + r * Math.cos(t);
      const across = cy + r * Math.sin(t);
      // rotate: along axis points at `bearing` (from north), across axis 90° clockwise
      const north = along * Math.cos(a) - across * Math.sin(a);
      const east = along * Math.sin(a) + across * Math.cos(a);
      pts.push([+(lng + east / kmPerDegLng).toFixed(5), +(lat + north / KM_PER_DEG_LAT).toFixed(5)]);
    }
  });
  pts.push(pts[0]);
  return pts;
}

const fc = {
  type: 'FeatureCollection',
  features: zones.map(([areaId, center, l, w, b]) => ({
    type: 'Feature',
    properties: { areaId },
    geometry: { type: 'Polygon', coordinates: [ring(center, l, w, b)] },
  })),
};
writeFileSync(new URL('../src/data/zones.geojson.json', import.meta.url), JSON.stringify(fc));
console.log(`wrote ${fc.features.length} zones`);
