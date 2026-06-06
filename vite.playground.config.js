import { defineConfig } from 'vite';

// Builds the show-off page (index.html + playground) as a normal static site,
// separate from the library build in vite.config.js. Output: site-dist/.
export default defineConfig({
  base: './',
  build: {
    outDir: 'site-dist',
    emptyOutDir: true,
  },
});
