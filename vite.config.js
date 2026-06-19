import { defineConfig } from 'vite'

export default defineConfig({
  // Must match the GitHub repo name for Pages to serve assets correctly.
  // URL: https://calculoss.github.io/cruelty_party/
  base: '/cruelty_party/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Reasonable target for iPad Safari (iOS 15+)
    target: ['es2020', 'safari15'],
  },
})
