# Active Session State — Rogue-Lite "Iron-Man" Prototype

Updated: 2026-11-05 (end of M3 QA pass)

## Current position

**M3 (combat core) complete + playtest feedback fixes applied. Awaiting GO for M4 (Foundry & tech core).**

Deployed at: https://askbrad.github.io/ (GitHub Actions Pages, pushes to `main` auto-deploy)
Dev: `npm run dev` (Vite, localhost:5173). Tests: `npm test` (Vitest, 75 passing).

## Milestones done

- **M0** Scaffold: Vite + TS strict + Babylon.js 9.x; sim/render split (sim has zero Babylon imports); fixed 60 Hz timestep; KBM + Xbox pad unified input; HTML HUD.
- **M1** City block: fixed test level from `src/data/city-test.json` (192 m, 4 layers: sewer/street/interiors/rooftops); cutaway rendering (Diablo rule: ghost structure at/above player's storey; full x-ray underground); readability palette (warm walkables + pale rims, cool background); instanced trees.
- **M2** Kinematic controller: gravity, universal double-jump, step-up (0.7 m), wall/door/tree colliders generated from city data, sewer shaft fall-through, camera 45° default yaw + 45°-base snap toggle (T / pad Y).
- **M3** Combat: reactor 100 E (regen 10 grounded / 4 air); baseline blaster (2 E, 12 dmg, low-power 5 dmg at empty); punch (free, 75° arc, knockback); 2 enemy types (Skitter melee ×8, Spitter ranged ×4) — stats + spawns in `src/data/enemies.json`; drops (credits/scrap) + pickup; death → respawn at tram, no penalty; soft aim-assist **pitch-only** (15° cone + LOS; horizontal aim never altered — regression-locked); 3D pitched projectiles both directions; translucent gold target ring (`combat.assistEnemyId`, updated every sim step); blob player shadow on highest surface.

## QA infrastructure

- Debug spawns: `?tp=sewer|roof|f2`, `&god` (frozen hull)
- Browser readbacks: `window.__world`, `window.__lastIntent`, `window.__scene`
- Verified visually in-browser (screenshots): sewer x-ray, hover stability, target ring

## Next: M4 (Foundry & tech core) — per design/prototype-plan.md

- `techtree.json`: 6 branches (Aerial, Lightning, Recovery, Capacity, Vector T1–T2, Hacking T1–T2) — port prices (1/2/3/4 cr), reservations, hardpoints from `imports/tech-tree.md` "Additions and adjustments"
- Foundry hub scene: Engineering (tree + hardpoint editor), Assembly (cosmetics), Launch (map)
- Attack modes (R/RB cycle), Thunder Angel presets, test-lab toggles (free buy, refill)
- Energy model: max = 100 + capacity − passive load (reservations in all modes)

## Open items / known debts

- Sewer interiors are very dark — brighten + lamp glows in M7 polish
- LOS-blocked assist from rooftops feels like a whiff (geometrically correct) — consider arcing shots or "no LOS" indicator in M4 (real flight lands there)
- Blaster range = 60 m (speed 40 × ttl 1.5 s) — revisit when enemies gain range
- Bundle ~6.3 MB from root `@babylonjs/core` import — switch to per-module imports in M1 perf pass (still pending)
- Debug-fly (G) is noclip QA tooling — remove before M7 playtest build
- Optional future dials: lateral aim magnetism at close range; assist cone width (15°)

## Conventions

- Sim purity rule: `src/sim/` has no Babylon imports; tests in `tests/{sim,render}` run headless
- All combat/level tuning is data-driven (`src/data/*.json`)
- Commits reference `design/prototype-plan.md`; push to `main` = deploy
