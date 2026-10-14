# Loading Simulation Tool

Simulates how cargo loads into vehicles and international shipping containers:
pick a container/vehicle type, list your cargo (dimensions, weight, type, quantity),
and it computes how many containers you need, utilization %, and a 3D view of the
packed layout.

Fully client-side (React + TypeScript + Three.js, via Vite) — no backend. The
3D bin-packing engine (`src/engine/binPacker.ts`) is a TypeScript port of the
`py3dbp` algorithm; `src/engine/pack.ts` orchestrates it the same way the
original Python prototype's `packing.py` did. `src/presets.ts` holds standard
container/vehicle presets grouped by business type (Sea Freight, Road Freight,
Air Freight).

## Running it

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

## Deploying

This is published as part of the GAMANA tools suite at
https://prad33p24.github.io/milkrun-route-planner/loading-simulation/. From `frontend/`:

```bash
npm ci && npm run build
rm -rf ../../loading-simulation && cp -r dist ../../loading-simulation
```

Then commit `loading-simulation-src/` and `loading-simulation/` together and push to `main`.
`vite.config.ts`'s `base` must stay `/milkrun-route-planner/loading-simulation/`.

## Known limitations (MVP)

- Packing is a heuristic, not a guaranteed-optimal bin packing — it's a
  realistic simulation, not a proof of the minimum container count.
- `stackable` / `fragile` flags are captured per cargo row but not yet
  enforced by the packing engine (only max weight per container is enforced).
- No persistence yet: presets and cargo lists reset on page reload.
