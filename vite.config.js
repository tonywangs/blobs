import { defineConfig } from 'vite';

// Library build: one self-contained, minified IIFE that registers the
// <metaball-bg> custom element on load. Three.js is bundled in so it can
// never clash with whatever the host site is already running.
export default defineConfig({
  build: {
    lib: {
      entry: 'src/blobs.js',
      formats: ['iife'],
      name: 'Blobs',
      fileName: () => 'blobs.min.js',
    },
    minify: 'esbuild',
    target: 'es2019',
    emptyOutDir: true,
  },
});
