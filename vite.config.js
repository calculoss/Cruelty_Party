import { defineConfig } from 'vite'

export default defineConfig({
  // Must match the GitHub repo name for Pages to serve assets correctly.
  // URL: https://calculoss.github.io/cruelty_party/
  base: '/Cruelty_Party/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    target: ['es2020', 'safari15'],
    // Three.js is ~500KB minified; this is expected and not a problem for our use case
    chunkSizeWarningLimit: 600,
  },
})
