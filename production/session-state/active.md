# Active Session State — Rogue-Lite "Iron-Man" Prototype

Updated: 2026-11-06 (M5 complete)

## Current position

**M6 (armour identity) complete. Next: M7 (playtest build/polish) — pending GO + M5/M6 playtest feedback.**

Deployed at: https://askbrad.github.io/. Tests: 108 passing. Save: localStorage `engineer-save-v1` (includes cosmetics).

## Milestones done (see git log for details)

- **M0–M4**: scaffold/sim split; city + cutaway; kinematic controller; combat core; tech tree/build system/foundry/reservations/modes.
- **M5** The loop:
  - Mission objectives: 3 relays (E-channel 2.5 s, decays if you leave) + 10 hostiles → extraction arms at the tram (hold E). `src/sim/mission.ts`.
  - All 5 enemy types live: Skitter, **Hopper** (lunge bursts), Spitter, **Bulwark** (50% frontal resist — flank it), **Conductor** (lightning chains gain +1 hop per conductor). 21 hostiles; stats in `data/enemies.json`.
  - Pause menu (Esc): Resume / **Return to Foundry** + full controls reference grid. Sim freezes while paused or in a panel.
  - Persistence: versioned localStorage via DI storage (`src/save/persistence.ts`); saves credits/scrap/deaths/build/toggles/cosmetics.
- **M6** Armour identity:
  - Parametric rig (`render/armourView.ts`): 4 part roots, 2 variants per part (head Visor/Crest, chest Core/Plate, arms Blaster/Blade, legs Thruster/Wheeled), per-part main+accent paint (8 materials), walk-cycle leg/arm sway.
  - Tier silhouette attachments rebuilt from build: Aerial jets→wings→tips, Lightning coils, Capacity chest cell, Recovery vents, Vector ankle rings, Hacking antenna.
  - Assembly UI + rotating mannequin in Foundry; capsule player visual replaced by the rig; cosmetics in save (validated, garbage-tolerant).
  - `src/sim/cosmetics.ts` pure state; UI at `render/ui/assembly.ts`; persistence covered by tests.

## Verified in browser

Deploy → 21 enemies/3 relays; kill counting; save round-trip incl. cosmetics (legs variant + head accent persisted); Assembly panel opens/closes, buttons hit-testable.

## Conventions

- Sim purity: `src/sim/` Babylon-free; data-driven tuning; push to `main` = deploy.
- QA: `?tp=`, `&god`; `window.__world` (active world), `__lastIntent`, `__scene`, `__save`.
