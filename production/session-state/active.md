# Active Session State — Rogue-Lite "Iron-Man" Prototype

Updated: 2026-11-06 (M5 complete)

## Current position

**M5 (the loop) complete. Next: M6 (armour identity/cosmetics) — pending GO.**

Deployed at: https://askbrad.github.io/. Tests: 102 passing. Save: localStorage `engineer-save-v1`.

## Milestones done (see git log for details)

- **M0–M4**: scaffold/sim split; city + cutaway; kinematic controller; combat core; tech tree/build system/foundry/reservations/modes.
- **M5** The loop:
  - Mission objectives: 3 relays (E-channel 2.5 s, decays if you leave) + 10 hostiles → extraction arms at the tram (hold E). `src/sim/mission.ts`.
  - All 5 enemy types live: Skitter, **Hopper** (lunge bursts), Spitter, **Bulwark** (50% frontal resist — flank it), **Conductor** (lightning chains gain +1 hop per conductor). 21 hostiles; stats in `data/enemies.json`.
  - Pause menu (Esc): Resume / Abandon Mission (banks credits → foundry). Sim freezes while paused or in Engineering.
  - Persistence: versioned localStorage via DI storage (`src/save/persistence.ts`); saves credits/scrap/deaths/build/toggles on purchases, deploy, return, abandon.

## Verified in browser

Deploy → 21 enemies/3 relays live; kill counting; save file written with full build. Objectives/extraction covered by headless tests (relay channel, decay, arming, HUD lines).

## Next: M6 (armour identity) — per plan

- ≥2 visual variants per armour part (head/chest/arms/legs), main+accent colour pickers w/ live rotating mannequin, tier silhouette attachments (wings, coils, thrusters) from installed build.
- Foundry Assembly station goes live (currently "M6" stub).
- Debts: dark sewers, LOS-blocked assist feel, blaster 60 m range, bundle size, debug-fly removal (M7).

## Conventions

- Sim purity: `src/sim/` Babylon-free; data-driven tuning; push to `main` = deploy.
- QA: `?tp=`, `&god`; `window.__world` (active world), `__lastIntent`, `__scene`, `__save`.
