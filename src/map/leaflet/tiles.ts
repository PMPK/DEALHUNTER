/**
 * Free OpenStreetMap raster tiles — fine for an MVP / low traffic.
 * The OSM tile usage policy forbids heavy use: before real traffic, switch to a
 * hosted provider (or self-hosted tiles) by editing only this file.
 */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';
export const TILE_MAX_ZOOM = 19;
