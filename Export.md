# EXPORT.md — Gameplay Design Compendium: "The Engineer" (working title)

> **Purpose.** This document is the complete, technology-agnostic record of every
> gameplay design decision validated during the browser prototype of this game.
> It is written to be handed to a development agent — together with
> **`tech-tree.md`** (the full armour tech tree spec) — with the instruction:
> *"Review the docs in Export.md and tech-tree.md, then build a plan to implement
> this game in Unreal Engine 5.8."*
>
> Everything below was **playtested in a working prototype** unless explicitly
> marked otherwise. Prototype implementation details (engine, rendering, file
> formats) are deliberately excluded; where a prototype lesson constrains the
> design, it is stated as a requirement or a warning.
>
> Companion document: `tech-tree.md` — the authoritative spec for all armour
> branches, tiers, effects, and level mechanics per technology. This file
> covers everything *around* it.

---

## 1. High concept & player fantasy

A character has invented powered armour (Iron-Man inspired) and uses it to fight
criminal forces across their city.

**The fantasy curve:** start as a capable armoured person; within roughly
45 minutes of play become an airborne, lightning-throwing engine of destruction
that crosses arenas in seconds. Growth must change **movement, reach, spectacle
and tactical options** — never just damage numbers.

**The loop:** equip and customise armour in the Foundry → deploy into a city
district → explore, fight, complete objectives, collect resources → return to
the Foundry → spend resources on tech-tree upgrades and visual customisation →
redeploy stronger. Runs in the full game may last 1–2 hours; the prototype
validated a compressed 15–30 minute loop.

**Rogue-lite-lite contract (validated):** death costs nothing but run progress.
Upgrades and resources are always retained. Players should *want* to redeploy
after dying, not fear it.

---

## 2. Design pillars & validated success criteria

The prototype existed to answer three questions. All three were answered "yes,
with caveats" — the caveats are the UE production work.

1. **Is the loop fun?** Deploy → explore/fight → collect → return → upgrade →
   redeploy. Validated. The upgrade purchase → immediate power change →
   redeploy cycle is the heart of the game.
2. **Does 2.5D read well?** A fixed high-angle camera over a multi-storey city
   (streets, sewers, building interiors, rooftops) works — *with* the interior
   cutaway and readability rules in §3.
3. **Are tech upgrades fun?** Upgrades must unlock new interactions (flight,
   dash, hacking, chain lightning), not stat increments. See `tech-tree.md`
   §10 for the silhouette/unfold rules.

Non-goals for the vertical slice: 1–2 hour runs, randomised city generation,
permanent economy balancing, narrative, multiplayer.

---

## 3. Camera, perspective & world readability

### Camera

- **2.5D fixed-pitch follow camera**, looking down at **57°** from the horizon.
- **Default orbit yaw 45°** — square buildings must always read at an angle,
  never face-on ("more triangles").
- Free 360° orbit on demand, plus a **settings toggle for 4-way snapped orbit**
  (eases to the nearest 45° + k·90° diagonal) so both feels are testable.
- Zoom range roughly 8–45 m (prototype tuning); flight adds a slight zoom-out.
- Aiming while grounded uses a cursor/stick ray onto a plane at chest height;
  **while airborne the aim plane drops to ground level** — the player aims at
  where the cursor points *on the ground*, not at a plane that parallaxes away
  with altitude. This was a validated fix; do not regress it.

### Cutaway rendering (critical feature)

When the player is inside a building, the exterior walls **at and above the
player's storey** fade to near-invisible (~7–10% opacity, short ~150 ms tween)
so the camera can always see the character. When the player is **underground**
(sewer), everything above — street slab, ceilings, shaft chutes — ghosts the
same way. The player's own floor stays solid underfoot. Upper floors
re-solidify as the player descends.

### World readability rules (binding, from tech-tree.md §10)

- **Walkable surfaces are warm, bright, and edge-rimmed** (pale continuous
  landing rims + outlined ends). **Background architecture is cool, darker,
  subdued**, with non-glowing vertical windows.
- **Weapon/FX colours signal function, never player paint:** gold = ballistic,
  orange = missiles, cyan/magenta = laser, blue/violet = lightning, lime =
  blades. Player-chosen armour colours are preserved on solid armour plates.
- Hazards need unique shapes/movement + warnings, not colour alone.
- Background parallax stays slow and low-contrast; nothing bright competes
  with the walkable rim.
- Keep player/target silhouettes visible: bright FX cores, short-lived
  transparent trails, capped concurrent debris. Budget simultaneous emitters.

---

## 4. The core loop & scene flow

Two hubs/modes:

1. **Foundry (hub)**: a small authored interior with three stations.
   - **Engineering** — the tech-tree purchase screen (see §8, §11).
   - **Assembly** — armour visual customisation (see §12).
   - **Launch pad** — walk onto it to deploy to the mission.
2. **Mission (the city district)** — the playable level (see §5, §10).

**Transitions:**
- Deploy = fresh mission state (enemies reset, objectives reset); build,
  credits and cosmetics persist.
- Extract = stand at the **deployment tram** (the same spot you arrived) and
  hold interact ~1 s — **only armed after objectives are complete**. The tram
  must be **highly visible**: a lit landing pad plus a tall light beacon
  visible across the map. (Playtest lesson: an unmarked extract point is
  indistinguishable from anywhere else — mark it in world space, not just UI.)
- Trigger zones that fire on entry (launch pad) must be **armed**: they cannot
  re-fire until the player has left the zone. (Playtest lesson: without this,
  returning from a mission instantly re-deploys you — it reads as "the level
  reset".)
- After returning, the player **re-materialises at the Foundry's deploy spot**.

---

## 5. World & level design (the test city as vertical-slice spec)

One authored district (~192 m × 192 m footprint, ~58 m vertical), fixed for
the slice (randomisation is future work). It exercises **four vertical layers**:

| Layer | Elevation | Content | Gates |
|---|---|---|---|
| **Sewer** | ~14 m below street | Continuous safe recovery floor, corridors with shafts rising to street | Always open — a recovery island |
| **Street** | y = 14 m | Open roads, culs-de-sac, plazas, two parks with tree clusters, building entrances | Tree clumps soft-block movement (fly over with enough tech) |
| **Interiors** | up to 5 storeys (5 m each) | Two enterable buildings: a 4-storey "Exchange Works" (4× requirements of space, south entrance) and 5-storey "Crown Halls" (west entrance), connected interiors, stair ramps | One entrance sealed by a **hackable force field** (Hacking gate) |
| **Rooftops** | above tops | Walkable caps with landing rims, adjacent-roof crossings, roof props (HVAC, antennas) | **Flight gate** — the rooftop shortcut chain needs Aerial tech |

**Level design rules (from tech-tree.md §8, binding):**
- Distinguish **hard ability gates** (labelled, require a specific technology —
  e.g. the hack terminal, a flight-only rooftop chain) from **soft challenges**
  (multiple routes). Campaign routes normally have ≥ 2 solutions.
- Every advertised gate must be solvable with its minimum advertised tier alone.
- Optional high-tier shortcuts (fly high, break in through a window) should make
  revisiting early areas feel outrageously powerful.
- Preserve safe recovery spaces; respawn points must never sit on destructible
  or moving geometry.
- Enemies are scattered densely across open areas (validated: "lots of enemies
  spread around").

**Data-driven layout:** the whole district (footprints, storeys, entrances,
sewer corridors, shafts, parks, trees, deploy/extract points, relays, gates)
was authored as data, and **collision, rendering and gameplay all derive from
that one source**. Keep this property in UE — no hand-placed divergence between
what blocks movement and what renders.

---

## 6. Player movement & traversal

Prototype-validated feel targets (treat as tuning starting points):

| Parameter | Value | Notes |
|---|---|---|
| Run speed | 8 m/s | Diagonal input normalized |
| Gravity | −28 m/s² | Snappy fall |
| Jump velocity | 11 m/s | ≈ 2.1 m apex |
| Double jump | **Universal** — every build has it | A branch may explicitly remove it (none does yet) |
| Step-up | 0.7 m | Auto-step small ledges/stairs; ramps walkable without jumping |
| Player capsule | r 0.45 m, h 1.9 m | Axis-separated movement: sliding along walls must feel clean |

- **Movement is kinetic and precise** — never physics-tumbly. Flight, dash and
  hover are movement *states*, not rigid-body forces.
- **Hover flight (Aerial tech):** hold jump while airborne to hover; holding
  continues a slow ascent; releasing holds altitude; drains energy per second
  (24/30/38/48 by Aerial tier). **Empty-tank lockout:** when energy hits zero,
  hover disables until the player lands (hysteresis — prevents passive-regen
  "flapping" exploits mid-air). Validated requirement.
- **Vector dash:** burst at 26 m/s for ~0.18 s in the input direction; costs
  energy (12/16 by tier); charges (1/2 by tier) with a 2.5 s recharge each.
- **Never sink while hovering** — hover is gravity-free; do not blend gravity
  in. (Playtest fix.)
- Debug/free-fly is a development tool only — never shipped.

---

## 7. The reactor (energy) model — binding design

One shared energy meter powers everything. This is the game's resource spine.

- **Maximum usable energy = 100 baseline + Capacity bonus − Σ passive
  reservations** of every installed module. Reservations apply **in all modes,
  including inactive equipment**. (This is what makes builds a trade-off.)
- Hard floor: the maximum never drops below ~20 regardless of load.
- Passive regen: 10/s grounded, 4/s airborne (faster grounded recovery is
  itself a purchasable bonus, Recovery branch).
- **Depletion never hard-locks the player:** baseline weapons remain usable at
  zero energy in a weakened "low power" mode (see §9). No action silently
  fails because the meter is empty — it degrades.
- Traversal abilities (flight/dash/hack) *do* stop at zero — but hover uses
  the lockout rule in §6 so it fails cleanly once, not in flaps.
- Kill refunds and landing reserves return small amounts of energy
  (Recovery branch), capped so refunds never exceed costs indefinitely.

---

## 8. Tech tree & progression

**The authoritative content spec is `tech-tree.md`** — 13 branches × 4 tiers
with effects, energy demands, silhouette changes and per-branch level
mechanics. The prototype validated the following **binding system decisions**;
the UE plan should implement the *system* and port content progressively.

### Validated in the prototype (6 branches, full T1–T4)

| Branch | Category | T1–T4 summary (full tables in tech-tree.md) |
|---|---|---|
| **Aerial Systems** | Movement | Hover flight (hold jump), rising ascent + move-speed multiplier per tier |
| **Chain Lightning** | Weapon | Instant chain bolt: 14/16/18/20 dmg, chains 2/4/6/10 targets with per-hop LOS, cost 8/16/26/42 E, range 18–30 m |
| **Recovery** | Passive | Regen bonus 3/6/9/12, kill refund 0/3/4/5, landing reserve 0/4/4/6 |
| **Reactor Capacity** | Passive | +25/60/120/220 max energy, reservation 1/2/4/6 |
| **Vector Drive** | Movement | Dash: 1→2 charges, 12/16 E |
| **Hacking** | Utility | Channel on terminals to open force-field gates: 1.5 s/6 E → 0.75 s/12 E, range 3.5→5 m |

Remaining branches (Ballistics, Missiles, Laser, Melee set, Defence set,
Overdrive, Scanner, Drones, Grapple T3+) are fully specified in
`tech-tree.md` and were **not yet prototyped** — same system, later content.

### Binding progression rules

- **Four tiers per branch** (Spark / Surge / Storm / Apex). Tier N requires
  tier N−1 in the same branch. No exclusive class choices during testing.
- **Test prices: 1 / 2 / 3 / 4 credits** per tier; components cost 0 while
  testing. The full game replaces this with a real economy — keep prices
  data-driven.
- **Named hardpoints & sockets:** every module mounts on named armour sockets
  (e.g. `back-centre`, `shoulder-left`, `calf-right`…). Sockets are
  **single-occupancy**; modules list acceptable sockets with alternatives;
  some modules occupy 2 sockets. Purchasing requires free sockets; the player
  can **relocate** modules between valid free sockets and **recycle** (full
  refund during testing). Socket occupancy is enforced **even when lab
  free-purchases are enabled**.
- **Attack modes:** the player cycles between modes (`R`/`F` or
  `RB`/`LB`); each mode pairs a weapon with a special movement. Owned modes
  only: STANDARD always (blaster + punch), THUNDER (lightning + flight),
  VECTOR (dash, disables flight). Passives (armour, capacity, recovery,
  hacking) are active in every mode. Switching cancels charges, tethers and
  pulses; launched projectiles finish.
- **Conflicting controls** (two ranged weapons etc.) are resolved by the mode
  system — the player manages "attack modes" rather than rebinding.
- **Presets:** named builds (e.g. Thunder Angel T1–T4 = Aerial+Lightning+
  Recovery+Capacity at tier N) that *replace* the whole build and grant test
  credits. A testing tool, not progression.
- **Lab toggles** (explicit opt-in): free purchases (sockets still enforced),
  infinite energy.

---

## 9. Combat

### Player baseline (always available, zero cost to own)

- **Blaster:** 12 dmg projectile, 0.28 s cycle, 2 E/shot, 40 m/s, ~60 m range.
- **Punch:** 20 dmg melee arc (75° frontal cone, 2.3 m + target radius),
  knockback 9.
- **Low-power rule:** at zero energy the blaster still fires at 5 dmg.
  **No baseline action hard-fails on an empty meter.**

### Aim model (validated, subtle — implement exactly)

- **Pitch-only soft aim-assist.** The player owns horizontal aim 1:1 (mouse
  cursor projected to the ground plane, or twin-stick). When the nearest
  enemy sits within a **15° cone** of the fire direction **with clear line of
  sight**, the shot's **vertical velocity is corrected** so it arrives at the
  target's chest height. Horizontal direction is *never* altered — full-snap
  aiming was tested and rejected (players lost fine targeting).
- **Feedback signals:** gold ring under the locked target = "next shot will
  pitch onto this enemy"; dim red ring = "target in cone but no line of fire —
  the shot would be blocked". No ring = level flight.
- Line-of-sight checks sample the shot line against level geometry.
- Point-blank shots must still register (check overlap at spawn, don't rely
  on travel).

### Enemy roster (validated stats/behaviours — data-driven)

| Type | HP | Speed | Behaviour | Notes |
|---|---|---|---|---|
| **Skitter** | 30 | 6.5 | Melee chaff; swarms, contact 8 dmg | Distinguish by size/shape/silhouette |
| **Hopper** | 24 | 4 (+16 lunge) | Bounding approach; periodic lunge bursts (0.35 s) along a locked direction | Lunge telegraphs by wind-up |
| **Spitter** | 45 | 3.2 | Ranged; holds a 12–20 m standoff band; fires 10 dmg projectiles (14 m/s) at the player's chest | Can hit airborne targets |
| **Bulwark** | 120 | 1.8 | Slow tank; **50% damage resistance from its frontal arc** — must be flanked | Backs exposed |
| **Conductor** | 36 | 5 | Melee; **extends lightning chains: +1 hop per conductor in the chain** | Makes chain weapons area-clear |

- Contact damage applies on touch with per-enemy cooldowns (0.8–1.2 s).
- Enemies aggro on proximity (ranges 20–30 m) and stay aggro.
- Enemies never spawn inside solid geometry — **validate spawn points against
  building footprints at data-authoring time** (playtest lesson: a spawn inside
  a block made the enemy unkillable and broke aim-assist "mysteriously").
- Enemies must not stand exactly overlapping the player to deal damage —
  contact fires even at zero distance (validated fix).
- Knockback on hit (projectiles small, punch heavy).
- Deaths drop **credits** (tech currency) and **scrap** (future component
  currency); pickup radius ~1.3 m.
- Rendering note: enemies were procedural primitives distinguished by size,
  shape, colour and a squash-stretch/hop deform — no rigs needed at this fidelity.

---

## 10. Objectives & mission structure

Validated objective shape: **"3 relays in any order + clear 10 hostiles, then
extract."**

- **Relays:** 3 placed objectives (street, sewer, building interior — the last
  gated behind tech). Channel by holding interact nearby (~2.5 s); progress
  decays if you leave. Activated relays glow (visual state change).
- **Hostiles:** kill counter against the requirement.
- **Extraction:** at the deployment tram, hold interact 1 s — armed only when
  objectives complete. Beacon + lit pad mark it in world space.
- **Mission timer** displayed on the HUD.
- **Abandon:** pause menu offers "Return to Foundry" (banks credits, no other
  penalty) at any time.

---

## 11. Foundry: Engineering (economy & testing rules)

- Purchases cost credits; full instant refunds on recycle while testing.
- The Engineering screen shows, per branch: tier list with cost/owned state,
  energy reservation, socket mount; plus build summary (max energy,
  reservations, owned modes), relocate/recycle controls, presets, lab toggles.
- Purchases **immediately** update: max energy, owned modes, and the armour's
  visual attachments (§12).
- **Persistence rule:** the build, credits, scrap and cosmetics survive
  sessions; enemies and objectives reset per deployment.

---

## 12. Foundry: Assembly (armour identity)

Validated scope — 4 armour parts (head, chest, arms, legs), each with:

- **Two visual variants**, e.g. head Visor/Crest, chest Core/Plate, arms
  Blaster/Blade, legs Thruster/Wheeled.
- **Per-part main + accent colour pickers** (free colour choice) with a
  **live rotating mannequin preview**; changes apply instantly and persist.
- **Tier silhouette attachments** derived automatically from the installed
  build (tech-tree §10): Aerial T1 backpack jets → T2+ wings (grow per tier) →
  T4 wingtip caps; Lightning shoulder coils (grow); Capacity chest cell
  (grows); Recovery intake vents; Vector ankle thruster rings; Hacking wrist
  antenna. Tiers *unfold and add components* rather than recolour.
- Paint rule: **user paint stays on solid armour; FX colour signals function**
  (§3).

---

## 13. HUD & UI spec

- **Left cluster:** hull bar, reactor energy bar (shows the dynamic max), mode
  chip, floor/layer chip (STREET / SEWER / `<BUILDING> · F2` / ROOF), loot
  counters (credits · scrap · deaths).
- **Right cluster:** camera mode chip, build/version stamp.
- **Objectives tracker** (mission only): relays n/3, hostiles n/10, mission
  timer, "★ EXTRACT" state.
- **Channel bar:** centred progress bar reused by hacking, relay capture and
  extraction.
- **Death flash:** red vignette on death.
- **Target rings in world space** (see §9).
- **Pause menu (Esc):** Resume / Return to Foundry + **a complete controls
  reference grid** (validated expectation: every binding documented in-menu).
- UI is DOM/UMG-equivalent overlay, not in-world — cheap to iterate,
  accessible, supports colour-picker widgets natively.

---

## 14. Input & controls (KBM + Xbox controller, parity required)

| Action | KBM | Controller |
|---|---|---|
| Move | WASD | Left stick |
| Aim | Mouse cursor (ground-projected) | Right stick (twin-stick, soft-assist) |
| Fire mode weapon | LMB | RT |
| Baseline blaster | MMB or 1 | LT |
| Punch | V | D-pad down |
| Jump ×2 / hover-hold | Space | A |
| Vector dash | Shift | B |
| Interact / hack / relays / extract | E | X |
| Next / previous attack mode | R / F | RB / LB |
| Orbit camera | RMB-drag | Right-stick click + stick |
| Zoom | Wheel | Right stick (vertical) |
| Camera snap toggle | T | Y |
| Pause | Esc | Start |

Every binding must appear in the in-game pause menu reference.

---

## 15. Persistence requirements

Persist across sessions: credits, scrap, lifetime deaths, **the full build**
(owned branches/tiers + socket assignments), attack mode, lab toggles, and
**armour cosmetics** (variant + colours per part). Versioned save format with
a migration path; tolerate corrupted saves by starting fresh rather than
crashing. Enemies/objectives reset per deployment.

---

## 16. Validated tuning-value appendix

Starting-point numbers that *felt right* in playtesting (UE: data-drive all of
these):

| Value | Number |
|---|---|
| Player run speed | 8 m/s |
| Gravity / jump velocity | −28 m/s² / 11 m/s |
| Step-up height | 0.7 m |
| Baseline blaster | 12 dmg, 0.28 s cycle, 2 E, 40 m/s projectile, 60 m range |
| Low-power blaster | 5 dmg (fires at 0 E) |
| Punch | 20 dmg, 75° arc, 2.3 m, knockback 9, 0.5 s cd |
| Reactor base | 100; regen 10 grounded / 4 air |
| Lightning T1–T4 | 14/16/18/20 dmg · 2/4/6/10 chains · 8/16/26/42 E · 18–30 m · 0.5 s cycle |
| Aerial hover drain | 24/30/38/48 E/s; ascent 7→13 m/s; move ×1.0–1.5 |
| Reservations | Aerial 8/12/16/20 · Lightning 3/5/7/11 · Recovery 1/3/5/8 · Capacity 1/2/4/6 · Vector 2/3 · Hacking 2/4 |
| Capacity bonus | +25/60/120/220 |
| Dash | 26 m/s × 0.18 s; 12/16 E; 1/2 charges; 2.5 s recharge |
| Hack | 1.5 s / 6 E → 0.75 s / 12 E; range 3.5 → 5 m |
| Assist cone | 15°; min target distance 1.5 m |
| Prices | 1/2/3/4 credits per tier |

---

## 17. Playtest lessons (requirements carried from the prototype)

1. **Aim plane parallax:** while airborne, project aim onto the *ground*
   plane, not a plane at player height — otherwise aim collapses to "fire
   forward" at altitude.
2. **Hover hysteresis:** empty reactor must disable hover *until landing* —
   otherwise passive regen creates flap-hover exploits.
3. **Trigger-zone arming:** enter-trigger volumes (launch pad) must disarm
   until exited, or returning to the hub instantly re-fires them.
4. **Validate spawn data:** enemies spawning inside solid geometry are
   unkillable and silently break aim-assist. Validate spawn tables against
   footprints at load.
5. **Mark extraction in world space** (beacon + pad), not just in UI.
6. **Full-snap aim assist feels bad** — assist pitch only; horizontal aim is
   sacred.
7. **UI panels must explicitly re-enable pointer input** when overlaid on a
   HUD layer that disables it.
8. **Contact damage at zero distance** — melee enemies overlapping the player
   must still damage (guard the degenerate case).
9. **Camera yaw default 45°** — axis-aligned cameras make square architecture
   read flat.

---

## 18. Deferred & future work (post-vertical-slice)

- Remaining tech branches (see tech-tree.md): Ballistics, Missiles, Laser,
  Melee set (Fists/Blades/Seismic), Defence set (Plating/Shield/Reactive),
  Overdrive, Scanner, Drones, Grapple T3–T4, Vector T3–T4.
- Randomised city generation (the authored district is the template/spec).
- Permanent economy: component costs (titanium/optics/cores tags already
  reserved), real prices, unlock cadence.
- Tech-specific authored levels per branch; the 45–60 minute power curve
  (tech-tree §9); apex spectacle encounters.
- Audio; accessibility (reduced-flash mode, FX sliders); localisation.
- Bosses, cities beyond the first, story layer.

---

## 19. Open design questions (unanswered by the prototype)

Carried from tech-tree.md §12 — the UE plan should not silently decide these:

- Separate stamina meter vs pure energy (currently merged by decision).
- Whether T4s should be sustained, cooldown-based, or overdrive windows
  (currently mixed per ability).
- How many active abilities a controller loadout should expose at once.
- Destructibility that persists across return visits.
- Difficulty/enemy-scaling model as mobility grows.

---

## 20. Directive for the UE 5.8 plan

Given this document and `tech-tree.md`, produce a plan that:

1. Maps each system above to UE 5.8 idioms (Enhanced Input for §14, the
   Gameplay Ability System or equivalent for tech-tree abilities/modes,
   SaveGame objects for §15, UMG for §13, data tables/primary assets for the
   tech tree, enemy AI via BTs/State Trees with the behaviour set in §9).
2. Reproduces the **validated feel numbers** in §16 as data, not constants.
3. Preserves the **binding decisions** (§3, §7, §8) and the **playtest
   lessons** (§17) as acceptance criteria.
4. Sequences work so the **core loop (§4) is playable first**, tech content
   ports branch-by-branch after, matching the prototype's validated order:
   Aerial + Lightning + Recovery + Capacity first ("Thunder Angel"), then
   Vector + Hacking, then the remaining branches from tech-tree.md.
5. Surfaces the open questions (§19) as explicit decisions for the designer
   rather than silent implementation choices.
