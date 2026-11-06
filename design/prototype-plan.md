# Prototype Implementation Plan — Rogue-Lite "Iron-Man" (Babylon.js)

Status: **DRAFT — awaiting review**
Workflow: Hybrid (OCGS) — this document is the mini-spec for the discovery-phase prototype.
Reference spec: `imports/tech-tree.md` (previous-demo checkpoints are treated as a **spec**, not code to port — the previous demo's source is not available).

---

## 1. Goals & success criteria

This prototype exists to answer three questions:

1. **Is the loop fun?** deploy → explore/fight → collect → return to foundry → upgrade → redeploy.
2. **Does 2.5D read well?** fixed-angle camera over a multi-storey city (streets / sewers / interiors / rooftops) with interior cutaway rendering.
3. **Are the tech upgrades fun?** do tiers change how you play, not just damage numbers.

Success = a playtest build on a public URL that a player can complete a full loop on in 15–30 minutes with KBM or an Xbox controller, and that you *want* to replay after dying.

### Non-goals (explicitly out of scope)

- 1–2 hour run length; randomised city generation; permanent economy balance.
- The full 13-branch tech tree (see §9 scope — core-first, expand later).
- Production art assets, audio beyond minimal placeholder SFX, narrative.
- Server-side anything — the deploy target is a **static site**; all state is local.

---

## 2. Tech stack (decided)

| Concern | Choice | Notes |
|---|---|---|
| Engine | **Babylon.js 8.x** (`@babylonjs/core`, ES modules) | Tree-shakeable imports; no `@babylonjs/gui` — HUD is HTML/CSS overlay (cheaper to iterate, accessible, and lets us use native `<input type="color">` for the armour pickers) |
| Language | **TypeScript** (strict) | |
| Build/dev | **Vite** | `dev` / `build` / `preview` scripts; instant HMR for iteration |
| Physics | **None — custom kinematic controller** | Capsule-vs-AABB sweeps against a per-floor collider world. Flight/dash/grapple/cling are movement states, not rigid bodies. Deterministic and headless-testable (same approach the old demo validated) |
| Simulation | **Fixed 60 Hz timestep, strict sim/render split** | `src/sim/` has **zero Babylon imports**; rendering interpolates sim state. This is what makes the automated test suite possible |
| Unit tests | **Vitest** (headless sim tests) | Energy math, hardpoints, gates, chain LOS, save migration |
| Persistence | **localStorage**, versioned schema | Saves carry credits, resources, installed build, cosmetics, settings |
| Deploy | **Static build → GitHub Pages via GitHub Actions** | Every push to `main` publishes a tester URL. Swap target later if you prefer your own server |
| Assets | **100% procedural** (primitives + simple materials + gradient/channelised textures generated in code) | No downloads, tiny deploys, fast iteration; glTF swap-in point documented for production |

---

## 3. Architecture

```
src/
├── main.ts               # bootstrap, scene registry, game state machine
├── sim/                  # PURE TS — no Babylon. Fixed-step, deterministic, unit-tested
│   ├── loop.ts           #   fixed timestep accumulator, system scheduler
│   ├── world.ts          #   entity lists, spatial hash for queries
│   ├── player.ts         #   kinematic controller: move/jump/double-jump/flight/dash states
│   ├── combat.ts         #   damage, projectiles, beams, chains (LOS via collider raycasts)
│   ├── enemies.ts        #   spawn/aggro/attack/death, drops
│   ├── energy.ts         #   reactor: max = 100 + capacity − passive load (ported rules)
│   ├── build.ts          #   tech tree resolution, hardpoint occupancy, attack modes
│   ├── mission.ts        #   objectives, extraction, abandon, run state
│   └── gates.ts          #   upgrade-keyed level gates (flight / dash / hack / tier seals)
├── render/               # Babylon-side: consumes sim state, owns all meshes/FX
│   ├── scenes/           #   Foundry (hub), CityMap, Mission (city level)
│   ├── city/             #   procedural city builder, per-floor colliders, cutaway walls
│   ├── armour/           #   procedural armour rig + socket attachments + paint
│   ├── fx/               #   pooled particles, trails, beam meshes, impact rings
│   ├── hud/              #   HTML overlay: energy, modes, objectives, prompts
│   └── input/            #   KBM + gamepad → unified intent stream (feeds sim)
├── data/                 # JSON-driven content (typed via TS schemas)
│   ├── techtree.json     #   branches/tiers/costs/reservations/hardpoints (port of tech-tree.md)
│   ├── city-test.json    #   the fixed test level layout
│   ├── enemies.json      #   5 types: hp, speed, damage, attack, colour/shape params
│   └── cosmetics.json    #   armour part variants, default palettes
└── save/                 #   localStorage load/store, versioned migrations
```

**Key rule:** everything testable lives in `sim/` + `data/`. Rendering is a projection of sim state, so playtest feedback can be turned into headless regression tests the same way the old demo accumulated 63 of them.

---

## 4. The city level (single fixed test level)

One authored district (~192m × ~192m footprint, ~58m vertical) exercising **all vertical layers** from your brief:

| Layer | Content | Gates |
|---|---|---|
| **Sewer** (y=0) | Continuous safe recovery floor below street level, drain shafts up | — (always open; recovery island rule) |
| **Street** (y=14) | Open roads, culs-de-sac, two parks (tree clumps block movement), plazas, building entrances | Tree clumps: soft-blocked (fly over at T2+, or none) |
| **Interiors** (2 buildings) | Up to 4–5 storeys each, connected interiors, stairwells, one basement | **Hack gate** (Hacking T1 terminal) on one entrance; **tier seal** (Lightning T3 relay network) on one interior route |
| **Rooftops** | Walkable caps with rims, crossings between adjacent buildings, one high drop | **Flight gate** (Aerial T2+) for the rooftop shortcut chain |

- Layout lives in `data/city-test.json` as a **block grid + building definitions** (footprint, storey count, door positions, roof props) — authored by hand once, kept fixed per your brief. This same schema is what random generation will consume in production, so nothing is throwaway.
- Colliders are generated from the same data: per-floor AABB sets, so the sim only tests the player's current floor(s).
- **Objectives** (tuned for a 15–30 min loop): 3 relay/objective nodes in any order + clear N hostiles → extract at the deployment tram. Optional caches reward exploration. Abandon-anytime from pause menu per your brief.
- **Readability rules** from tech-tree.md §10 are binding: warm walkable caps/rims, cool background architecture, FX colours by branch (gold/cyan/blue…), reserved player paint.

### Interior/exterior cutaway (the main rendering risk)

- Buildings have two wall sets: **exterior shell** and **interior partitions**, each per storey.
- When the player is *outside*: shells opaque, interiors hidden.
- When the player is *inside floor k*: that building's shell walls **fade to ~10% opacity (no shadow casting)** for storeys ≥ k so the player always sees in; interiors of floor k render normally; floors below stay solid.
- Transition is a short (150 ms) opacity tween keyed off sim floor-occupancy events — no per-frame raycasting.
- Rooftop caps render whenever the camera looks down on an entered floor (classic Diablo/XCOM cutaway; the fixed 55–60° pitch makes this predictable).
- Camera can orbit the player 360°; buildings' far sides auto-fade only when they obstruct the player.

---

## 5. Player, armour & tech tree (core-first scope)

**Branches in first playable build** (your "Thunder Angel first" decision + gates the level needs):

| Branch | Tiers | Why now |
|---|---|---|
| Aerial | T1–T4 | Flight gates + fantasy; universal double-jump baseline |
| Lightning | T1–T4 | Signature weapon; relay gates; chain-LOS tech the other weapons reuse |
| Recovery | T1–T4 | Energy sustainability rules (bounded refunds) |
| Capacity | T1–T4 | Passive-load reservation model |
| Vector | T1–T2 | Dash corridor + a dash gate; T3/T4 in expansion pass |
| Hacking | T1–T2 | Hack gate + turret-free simple terminal interaction |

All remaining branches (Ballistics, Missiles, Laser, Grapple, Melee set, Defence set, Overdrive, Scanner, Drones) are **data-schema-ready but not implemented** — expansion passes after the loop is proven (§9).

**Ported rules from tech-tree.md (binding decisions section):**
- Shared energy meter: `max = 100 + Capacity − Σ passive load`; reservations apply in all modes.
- Prices 1/2/3/4 credits per tier; prerequisite = previous tier in branch.
- **Hardpoints**: named sockets per armour part, single-occupancy, alternative mount points, relocate/recycle in foundry UI.
- **Attack modes**: R/RB cycles; each mode = one ranged + one special movement; passives always active; switching cancels charges/tethers/pulses.
- Universal double-jump; Aerial T1 hold-to-hover; baseline free blaster + punch when drained.
- Test-lab toggles in pause: free purchases, energy refill, tier presets (Thunder Angel T1–T4).

**Controller/KBM mapping (draft — confirm in review):**

| Action | KBM | Xbox |
|---|---|---|
| Move | WASD | Left stick |
| Aim | Mouse cursor (world-projected) | Right stick |
| Jump / double-jump / hover | Space (hold) | A (hold) |
| Mode attack (mode weapon) | LMB | RT |
| Baseline blaster | MMB or `1` | LT |
| Next / prev mode | R / F | RB / LB |
| Interact / hack / extract | E | X |
| Orbit camera | Hold RMB + mouse | Right stick click + stick |
| Zoom | Wheel | D-pad up/down |
| Pause / abandon | Esc | Start |

---

## 6. Foundry (hub) & armour customisation

- **Scene**: small authored interior (procedural), player walks to stations or uses a menu wheel: **Engineering** (tech tree), **Assembly** (cosmetics), **Launch** (city map).
- **Engineering UI**: branch × tier tree, costs, energy reservation preview, hardpoint occupancy editor (pick alternative sockets, move/recycle), preset loadouts, live readout of resulting max energy & modes.
- **Assembly UI** (per your brief):
  - Armour parts: **head, chest, arms, legs** — each with **≥2 visual variants** (e.g., head: visor vs antenna-crest; legs: thruster-calf vs wheeled).
  - Per-part **main + accent colour** via HTML color pickers, applied to the 3D mannequin preview **live** (the actual in-mission rig, rotating).
  - Upgrade-tier attachments (wings, coils, calf thrusters, shoulder pods) auto-appear from the installed build — silhouette reflects the build per tech-tree.md §10.
- Armour rig: parametric primitive assemblies parented to 4 part roots + socket transforms; variants are alternate primitive sets; paint = two material instances (main/accent) tinted per part.

## 7. Enemies (5 types, per your brief)

Simple procedural bodies (spheres/lathe shapes) with size + shape + colour distinction and a **vertex-shader bounce/wobble deform** while moving. No rigs, no animations beyond deform + squash on hit/death.

| Type | Role | Behaviour |
|---|---|---|
| Skitter | melee chaff | swarms, contact damage |
| Hopper | mid threat | bounding approach, lunge |
| Spitter | ranged | keeps distance, slow projectiles |
| Bulwark | tank | slow, high HP, guard front (backs exposed — Ballistic-friendly later) |
| Conductor | lightning-synergy | takes chains, conducts to allies — makes Lightning T2+ shine |

All stats in `data/enemies.json`. Drops: credits (tech purchases) + scrap (tracked for future component costs, no sinks yet). Kills return small energy with Recovery T2+ (ported rule).

## 8. Testing & playtest deployment

- **Vitest headless sim tests** (target ~40–60 by end of prototype): energy/reservations, hardpoint conflicts, mode isolation & cancellation, gate solvability at minimum tier, chain LOS/bounds, extraction/reset, save migration stub.
- **Browser smoke checklist** per milestone (load → foundry → fit preset → deploy → loop → extract → persist).
- **Perf budget**: 60 fps on integrated GPU; < 300 draw calls via thin instances for repeated city props (lamps, trees, cars); pooled FX with global caps.
- **Deploy**: GitHub Actions → GitHub Pages on every `main` push; version stamp + changelog note in the pause menu so testers know what build they're on.

## 9. Milestones

| # | Milestone | Includes | Exit criteria |
|---|---|---|---|
| M0 | Scaffold | Vite+TS+Babylon, sim/render split, input intent stream, fixed camera rig, HTML HUD shell | `npm run dev` shows a test floor; KBM+pad both move a capsule |
| M1 | City block | City builder from JSON, colliders, per-floor world, cutaway walls, readability palette | Fly-through of all 4 layers; interiors readable inside/outside |
| M2 | Player feel | Kinematic controller: run/jump/double-jump, slopes/steps, camera orbit/zoom | Movement feels good on pad + KBM (your call) |
| M3 | Combat core | Energy reactor, baseline blaster/punch, damage/death, 2 enemy types, drops | Kill things, die, respawn at tram; energy drains/recovers |
| M4 | Foundry & tech core | techtree.json (6 branches), Engineering UI, hardpoints, presets, attack modes, lab toggles | Buy Aerial+Lightning+Recovery+Capacity T1–T4; modes cycle; reservations enforced |
| M5 | The loop | Vector+Hacking T1–T2, gates wired, all 5 enemies, objectives + extraction + abandon, persistence | Full loop playable end-to-end; save survives reload |
| M6 | Armour identity | Variants per part, colour pickers w/ live preview, tier silhouette attachments | Build visibly + uniquely reflects loadout and paint |
| M7 | Playtest build | FX readability pass, HUD polish, deploy pipeline, tester changelog | Public URL; you run a real playtest session |
| M8+ | Expansion passes | Remaining branches T1–T4 (weapons → melee/defence → utility), T3/T4 Vector, tech-specific route remixes | Driven by playtest findings |

## 10. Risks

| Risk | Mitigation |
|---|---|
| Cutaway rendering looks wrong at storey boundaries | M1 spike dedicated to this before any combat work; fallback: full-shell hiding per entered building (simpler, still readable) |
| Flight + fixed-angle camera disorienting | Camera keeps pitch fixed; flight adds slight zoom-out + shadow blob under player (height cue) |
| Sim/render split slows iteration early | Split is enforced but thin; rendering reads sim structs directly — no event bus ceremony |
| Scope creep via tech-tree.md's 63-test ambition | Core-first scope locked at M5; expansion only after you've playtested the loop |
| Aim scheme on controller (twin-stick vs auto-aim) | Prototype ships **right-stick aim + generous soft-lock**; revisit after playtest |

## 11. Open questions — DECIDED

1. **Aim model** — Mouse: cursor-in-world (Diablo-style). Controller: twin-stick with soft-lock. **Both approved.**
2. **Camera** — Full 360° orbit by default, with a settings toggle for 4-way snapped orbit (with slight smoothing) so both feel testable.
3. **Mission objective** — "3 relays in any order + clear N + extract" confirmed, **with lots of enemies spread around** the city.
4. **Hacking minigame** — Ship the simple version first (walk-up channel), pattern-match deferred. **⚠️ NOTED IDEA:** a small pattern-match minigame for hacking is a favourite — revisit for hacking *and* as an interaction pattern for other powers/tech upgrades (e.g., overdrive activation, turret commandeering, relay tuning). Capture in a future design pass.
5. **Death penalty** — None for this prototype: death costs run progress only; upgrades + resources retained.
6. **Audio** — Minimal procedural WebAudio SFX where cheap (shots, hits, UI blips, mode switch); not mandatory for everything.
7. **Player identity** — "The Engineer". No name/gender/VO.
8. **Deploy target** — GitHub Pages (dedicated repo created). Static build via GitHub Actions on push to `main`.

## 12. Backlog ideas (captured, not scheduled)

- **Pattern-match minigame** as a reusable interaction for hacking and other powers (see §11.4).