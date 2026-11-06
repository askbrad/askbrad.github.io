# Active Session State — Rogue-Lite "Iron-Man" Prototype

Updated: 2026-11-06 (M4 complete)

## Current position

**M4 (Foundry & tech core) complete. Next: M5 (the loop) — pending GO.**

Deployed at: https://askbrad.github.io/ (pushes to `main` auto-deploy). Tests: 91 passing.

## Milestones done

- **M0–M3**: scaffold/sim-split, city block + cutaway, kinematic controller, combat core (see git log for details).
- **M4** Foundry & tech core:
  - `src/data/techtree.json`: 6 branches (Aerial, Lightning, Recovery, Capacity, Vector T1–T2, Hacking T1–T2), tier costs 1/2/3/4 cr, reservations, hardpoint mounts, presets TA1–TA4.
  - `src/sim/build.ts`: purchases w/ prereq ladder, socket occupancy (always enforced, even lab free-buy), relocation, recycle (full refund), max energy = 100 + capacity − load, mode ownership + cycling, presets, lab toggles.
  - Abilities: Aerial hover (hold jump airborne, drains 24–48 E/s, **empty-tank lockout until landing** — no regen flapping), Vector dash (charges/recharge), THUNDER chain lightning (2/4/6/10 chains, LOS hops, 0.5 s cycle, free-blaster fallback at empty), Recovery (regen bonus, kill refund, landing reserve), Hacking (channel on gate terminals → removes the Exchange south-door force field).
  - Foundry hub scene: Engineering console (opens tech-tree UI), Assembly stub (M6), Launch pad (walk in to deploy). Extract tram: hold E 1 s to bank credits and return.
  - Engineering UI: buy/recycle/relocate per branch, socket display, presets, lab toggles, deploy.
  - Gate: Exchange south door sealed by hackable force field (alt route: Aerial over the roof).

## Verified end-to-end in browser

UI buy → max energy recompute (100→92 with Aerial T1), preset fit → deploy → THUNDER mode via R → assist lock ring → lightning strike damage. The M4 exit criteria are met.

## Bug-fix pattern worth remembering

A skitter spawn point sat inside solid block s4 — enemy interpenetrated the building and the aim-assist LOS *correctly* refused it. Data bug, not code. Added a validation test: no spawn inside a solid block. When something "looks broken", check spawn/collision data first.

## Next: M5 (the loop) — per design/prototype-plan.md

- Vector T2 + Hacking T2, gates wired to all layer transitions, all 5 enemy types, objectives (3 relays + clear N + extract), abandon-from-pause, persistence (localStorage), mission timer.
- Open polish debts: dark sewers, LOS-blocked assist feel (M4 flight note), blaster 60 m range, bundle size (root @babylonjs import), debug-fly removal before M7.

## Conventions

- Sim purity: `src/sim/` has no Babylon imports; tests in `tests/{sim,render}` headless.
- Tuning is data-driven (`src/data/*.json`). Push to `main` = deploy.
- QA: `?tp=sewer|roof|f2`, `&god`; `window.__world` tracks the ACTIVE world per-frame.
