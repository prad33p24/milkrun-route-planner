# GAMANA — notes for Claude

GAMANA is a suite of free, browser-only supply-chain tools, hosted on GitHub Pages at
https://prad33p24.github.io/milkrun-route-planner/ (repo `prad33p24/milkrun-route-planner`, **public**).
Owner: Pradeep (logistics background, not a developer) — explain in plain language, step by step.

## Rules

- Everything runs in the browser: plain HTML + JS, no backend, no build step (except Loading Simulation).
  Libraries only from CDNs (Leaflet for maps, SheetJS for Excel, etc.).
- **Public repo**: never commit company names, customer data, or real company files. Data the user
  uploads stays in their browser.
- **Push to `main` = live site** within ~1 min. Only push when Pradeep asks.
- Keep the shared look of the suite (hub cards in `index.html`, each tool has its own accent colour).
- Distances: haversine × 1.3 road factor (same as the Agentic Solution project).

## Tools

| File | Tool |
|---|---|
| `index.html` | Hub page linking all tools (one card per tool) |
| `milkrun-planner.html` | Milkrun Route Planner. **Min Pincodes per Cluster is a hard minimum** — clusters below it are excluded and produce no route output ("minimum means minimum, no compromise") |
| `kmeans.html`, `hybrid.html` | Route planner variants |
| `milkrun-calc.html` | Milkrun Calculation |
| `district-mapper.html` | Cluster Grid (fixed-grid pincode binning) |
| `centroid-mapper.html` | Centroid Mapper — **one input file, 4 columns** (origin & destination in the same file) |
| `distance-calculator.html` | Distance Calculator — origin & destination pincodes. Built on the laptop with a hub card in `index.html`, **not pushed yet** (Pradeep said "not yet") |
| `loading-simulation/` | Loading Simulation — **built output only** (React/Three.js). Source lives outside this repo |

## Loading Simulation (summary of agreed behaviour)

3D container loading (TypeScript port of py3dbp). Height always vertical; full-support stacking only;
highest-quantity cargo group loads first; per cargo type it simulates both floor orientations and keeps
the better one; colours by cargo name; container borders. PDF export: top / side / bottom / 3D views,
CFT, weight, box counts, and "cm used / cm left" ticks (not %). Vite `base` is
`/milkrun-route-planner/loading-simulation/`; deploy = `npm run build` then copy `dist/` into
`loading-simulation/`.

## Local-only files (not committed, laptop only)

`PINCODE_Master_V1_Jun26.xlsx`, `india_pincodes_master.csv`, `Milkrun Routing*.csv`, `milkrun_tool.html`,
`venv/` — working files; don't commit them.
