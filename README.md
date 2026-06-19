# Integrity Market

A browser-based isometric satirical stealth game. Built with Three.js + Vite,
designed for iPad Safari, deployable to GitHub Pages.

## Development

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173
```

## GitHub Pages deployment

### One-time repo setup

1. Go to **Settings → Pages** in your GitHub repo.
2. Under **Source**, choose **Deploy from a branch**.
3. Set branch to **`gh-pages`**, folder `/` (root).
4. Save.

That's it. The workflow (`.github/workflows/deploy.yml`) runs automatically on
every push to `main` or any `claude/*` branch. It builds the project and
pushes the output to the `gh-pages` branch, which Pages then serves.

**Live URL:** `https://calculoss.github.io/cruelty_party/`

### Manual deploy

```bash
npm run build      # outputs to dist/
# Then push dist/ to gh-pages however you prefer, or trigger workflow_dispatch.
```

## Phase roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Foundation — isometric scene, player movement, touch joystick |
| 2 | — | Stealth core — guards, vision cones, alert state, dossier |
| 3 | — | Economy — Integrity Market panel, price dynamics |
| 4 | — | Restructure loop — failure / progression system |
| 5 | — | Art & juice — lighting, post-FX, target roster, flavour text |

## Controls

| Input | Action |
|-------|--------|
| Left joystick (touch) | Move |
| W / A / S / D | Move |
| Arrow keys | Move |
