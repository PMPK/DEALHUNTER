/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// `base: './'` keeps the build deployable from any static sub-path (GitHub Pages, S3, ...).
export default defineConfig({
  base: './',
  plugins: [react()],
  // Point ZR_DATASET_DIR at a directory with meta.json, areas.geojson, beaches.geojson, attractions.json,
  // hotels.json and reality-evidence.json to run the app against an external dataset.
  resolve: { alias: { '@dataset': resolve(process.env.ZR_DATASET_DIR ?? 'src/data') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    restoreMocks: true,
  },
});
