import { defineConfig } from 'vite';

// base: './' makes the built output portable — works on Vercel, GitHub Pages
// subpaths, or even opened straight from the filesystem.
export default defineConfig({
  base: './',
});
