# Armour tech tree & level mechanics — brainstorming draft

Status: **all planned branches have playable prototype tiers; integration validation in progress**. The decisions
under “Additions and adjustments” take precedence over the original proposals.
The checkpoints at the end distinguish implemented prototype behavior from encounter ideas and playtest work still pending.

## 1. Goals and high-level categories

The fantasy: start as a capable armoured person; by roughly **45 minutes**, become
an airborne, lightning-throwing engine of destruction that can cross arenas in
seconds. Growth must change movement, reach, spectacle and tactical options,
not just damage numbers. Keep enemies and landing surfaces readable throughout.

| Category | Branches | Primary fantasy |
| --- | --- | --- |
| Mobility | Vector drive, Aerial systems, grapple/magnetism | Own every route through the arena |
| Ranged weapons | Ballistics, missiles, lasers, chain lightning | Fill the screen with distinct, controllable attacks |
| Melee & impact | Servo fists, energy blades, seismic strikes | Break formations and the environment |
| Defence | Plating, directional shields, reactive fields | Survive and turn pressure into power |
| Reactor & recovery | Capacity, recovery, overdrive | Sustain increasingly extravagant combinations |
| Utility & companions | Scanners, hacking, drones | Reveal, manipulate and command the battlefield |

Branches within a category can coexist. Cross-category hybrids are encouraged.
Higher tiers require the preceding tier in that branch, but no exclusive class
choice during testing. Current Vector/Aerial/Siege become starting points for
Vector/Aerial/laser branches; existing core upgrades feed their relevant category.

### Shared tier vocabulary and nominal test economy

- **T1 / Spark:** one clear new interaction; modest visual footprint.
- **T2 / Surge:** more reach, targets, charges or sustained use.
- **T3 / Storm:** substantial area influence and a visible silhouette change.
- **T4 / Apex:** a spectacular capstone that changes how an arena is played.
- Test purchase prices for EVERY branch: **1 / 2 / 3 / 4 credits**, respectively.
  Components cost **0** while testing; retain optional component tags for later.
- Suggested future component tags: titanium = mechanical/defence, optics = weapons/
  targeting, cores = energy/flight. Do not balance their real prices yet.
- Add a future test-lab toggle: unlock all tiers, refill resources, instant respec,
  remove capacity limit, choose starting tier, and save/load named builds.
  Keep normal energy/stamina consumption enabled by default to test interactions.
- Numbers below are starting hypotheses against a **100-energy** baseline.
  `E/s` = continuous energy drain; `E/use` = per activation. `S/use` = proposed
  exertion/stamina cost (separate meter is undecided). Passive `load` reserves
  reactor output, not energy per second. Higher tiers cost more gross power;
  reactor growth makes them sustainable. Avoid charging all three meters for one action.
- If a separate stamina system is rejected, convert S costs to energy/cooldown.
  The current prototype uses energy only; these tables do not change it yet.

## 2. Mobility

| Branch / tier | Upgrade and effect | Suggested demand | Armour silhouette | In-game FX |
| --- | --- | --- | --- | --- |
| Vector T1 | Burst Drive: short directional dash | 12 E/use | Calf thrusters | Short amber streak, dust kick |
| Vector T2 | Overdrive: two charges; dash impacts stagger | 16 E/use | Hip stabilisers | Twin trails, impact fan |
| Vector T3 | Phase Lance: steer dash in eight directions; cross phase barriers | 22 E/use | Spine vector vanes | Violet afterimages, outlined exit point |
| Vector T4 | Comet Engine: chained dashes with partial kill refunds; launch nearby enemies | 30 E/use | Radiating turbine fins | Comet ribbons and expanding impact rings |
| Aerial T1 | Lift Pack: double-jump; hold second press to hover; neutral holds altitude | 24 E/s | Compact backpack jets | Tight blue jets, air distortion |
| Aerial T2 | Wing Array: faster ascent, braking and precision steering | 30 E/s | Folding wings | Paired cyan ribbons, braking sparks |
| Aerial T3 | Storm Wings: aerial boost and hover strafing with heavier weapons | 38 E/s + 12 E/boost | Articulated wing engines | Swept trails, small contrails |
| Aerial T4 | Ascendant Frame: rapid omnidirectional flight and dive-bomb impacts | 48 E/s + 25 E/dive | Floating wing segments, bright spine | Prismatic wake, ground shockwave on dive |
| Grapple T1 | Cable Hand: pull to marked anchors | 8 S/use | Wrist spool | Visible cable and anchor flash |
| Grapple T2 | Magnetic Boots: wall cling and anchor-to-anchor launch | 12 S/use | Magnetic soles and palms | Pulsing contact rings |
| Grapple T3 | Tractor Line: pull movable cargo or light enemies | 18 S/use | Forearm induction rings | Braided magnetic tether |
| Grapple T4 | Gravity Sling: fling large cargo and slingshot around anchors | 28 S/use | Rotating shoulder rings | Curved gravity trails, debris orbit |

**Level additions:** dash corridors with recharge decks; vertical shafts with safe
terraces; swinging cargo; overhead grapple anchors; magnetic walls; rotating
laser sweeps; alternating wind columns; timed shutters; diagonal boost routes.
T1 routes teach one action at a time. T3/T4 routes combine momentum, combat and
changing elevation. Provide wide recovery spaces and visible destinations.

## 3. Ranged weapons

| Branch / tier | Upgrade and effect | Suggested demand | Armour silhouette | In-game FX |
| --- | --- | --- | --- | --- |
| Ballistic T1 | Pulse Carbine: accurate single projectile | 2 E/shot | Wrist barrel | Gold tracer, tiny muzzle flash |
| Ballistic T2 | Twin Repeater: short automatic bursts | 6 E/burst | Twin forearm barrels | Alternating flashes and impact sparks |
| Ballistic T3 | Rail Driver: charged, piercing line shot | 18 E/shot | Long braced arm rail | White-gold lance, lingering thin trail |
| Ballistic T4 | Meteor Battery: selectable sweeping barrage or concentrated volley | 34 E/volley | Shoulder rotary array | Dense gold tracer fans, restrained screen shake |
| Missile T1 | Micro Rocket: slow explosive projectile | 10 E/use | Single shoulder tube | Orange exhaust, compact blast |
| Missile T2 | Seeker Rack: three tracking missiles | 18 E/volley | Folding missile pod | Curved smoke ribbons, target brackets |
| Missile T3 | Cluster Swarm: split payloads strike a marked area | 30 E/volley | Paired shoulder racks | Branching trails, staggered explosions |
| Missile T4 | Celestial Salvo: many guided rockets arc around the arena | 45 E/volley | Back-mounted launch petals | Firework-like arcs, successive coloured impacts |
| Laser T1 | Arc Cutter: sustained beam cuts marked bulkheads | 18 E/s | Forearm focusing lens | Thin cyan beam and cutting sparks |
| Laser T2 | Twin Emitter: wider beam, improved piercing | 26 E/s | Twin lenses | Parallel beams and bright intersection sparks |
| Laser T3 | Prism Lance: split at authored prisms, sweep through formations | 36 E/s | Shoulder prism assembly | Cyan/magenta branch rays |
| Laser T4 | Solar Array: aimable main beam with orbiting secondary rays | 50 E/s | Floating emitter halo | White core, multicoloured rays, controlled bloom |
| Lightning T1 | Arc Bolt: hit one target and jump to one nearby conductor | 8 E/use | Wrist coil | Sharp blue forks, brief contact flash |
| Lightning T2 | Chain Reactor: chain through four targets | 16 E/use | Shoulder Tesla coils | Blue-violet branching arcs |
| Lightning T3 | Storm Network: six targets; electrify connected floor nodes | 26 E/use | Spinal capacitors | Pulsing node web and ground tendrils |
| Lightning T4 | Thunder Crown: moving storm chains across a large visible area | 42 E/pulse | Hovering conductor crown | Broad branching lightning; targets outlined before pulse |

**Level additions by branch:**

- Ballistics: aligned weak points, armoured enemies with exposed backs, distant
  shootable switches, piercing galleries. Avoid mandatory pixel-perfect aim.
- Missiles: cracked walls, destructible cover, overhead launch windows and blast
  pockets. Clearly separate destructible material from permanent structural terrain.
- Lasers: beam-cut doors, rotating mirrors, prisms, heat sinks and shutters that
  periodically expose a core. Limit reflection bounces to keep puzzles legible.
- Lightning: conductive chains, water channels, insulated gaps, relay pylons and
  mobile conductor enemies. Preview reachable chain targets; distinguish powered
  surfaces from safe dry platforms using shape and animation as well as colour.

## 4. Melee & impact

| Branch / tier | Upgrade and effect | Suggested demand | Armour silhouette | In-game FX |
| --- | --- | --- | --- | --- |
| Fists T1 | Servo Assist: stronger punch; break fragile panels | 5 S/use | Enlarged knuckles | Short impact burst |
| Fists T2 | Ram Gauntlet: charged punch launches enemies | 10 S/use | Forearm piston | Compression ring and launch trail |
| Fists T3 | Titan Grip: grab and throw enemies/cargo | 18 S/use | Gripping fingers and heavy braces | Throw arc, debris spray |
| Fists T4 | Colossus Blow: wide punch launches a whole formation | 30 S/use | Deploying power fist | Large directional shock cone |
| Blade T1 | Energy Edge: quick short slash | 6 E/use | Wrist emitter | Lime crescent |
| Blade T2 | Twin Edges: crossing slashes and projectile parry | 12 E/combo | Paired emitters | Intersecting crescents, parry flash |
| Blade T3 | Crescent Wave: slashes project through nearby enemies | 22 E/use | Extended forearm fins | Travelling turquoise arcs |
| Blade T4 | Orbit Blades: temporary orbiting cutters plus aimed slash | 36 E/use | Rotating arm rings | Circular blade trails and directed crescents |
| Seismic T1 | Ground Stamp: short radial stagger | 10 S/use | Heel actuator | Dust circle |
| Seismic T2 | Hammer Drop: downward slam breaks cracked floors | 16 S/use | Heavy knee/boot plates | Vertical trail, fractured impact decal |
| Seismic T3 | Fault Line: travelling ground wave | 24 S/use | Leg stabilising struts | Sequential amber fissures |
| Seismic T4 | Worldbreaker: huge slam triggers cascading shockwaves | 40 S/use | Deployable back/leg braces | Expanding rings and bounded debris columns |

**Level additions:** breakable floors with visible lower landing areas, pushable
cargo puzzles, parry-powered switches, shielded chokepoints, counterweight doors,
shockwave-transmitting rails. Preserve a return route after destruction. Slams must
not destroy the only safe landing surface or trap the player below extraction.

## 5. Defence

| Branch / tier | Upgrade and effect | Suggested demand | Armour silhouette | In-game FX |
| --- | --- | --- | --- | --- |
| Plating T1 | Composite Shell: moderate hull increase | 2 passive load | Thin chest panels | Small hit sparks |
| Plating T2 | Reactive Plates: soften large single hits | 4 load | Layered shoulder plates | Local plate flash |
| Plating T3 | Siege Shell: resist knockback and environmental damage | 7 load | Braced torso and broad boots | Heavy impact ripples |
| Plating T4 | Living Fortress: brief damage-to-armour conversion after a heavy hit | 11 load | Floating defensive plates | Plates orbit then lock into a luminous shell |
| Shield T1 | Buckler: aim a small frontal shield | 8 E/s | Forearm shield projector | Blue hexagonal panel |
| Shield T2 | Mirror Guard: timed blocks reflect shots | 14 E/s | Split shield lens | White parry edge and returning tracers |
| Shield T3 | Aegis Dome: protect a small area and nearby allies | 24 E/s | Chest dome emitter | Transparent segmented bubble |
| Shield T4 | Sovereign Field: advance behind a broad shield; release stored impact | 38 E/s | Shoulder/chest projector array | Expanding dome and directional release wave |
| Reactive T1 | Spark Skin: brief contact retaliation | 6 E/trigger | Small surface coils | Local violet spark |
| Reactive T2 | Thermal Veil: heat resistance and close-range burn | 12 E/trigger | Venting pauldrons | Orange heat shimmer |
| Reactive T3 | Counterstorm: absorbed hits charge a retaliatory pulse | 22 E/pulse | Back capacitor bank | Visible charge bands, radial arcs |
| Reactive T4 | Event Horizon: brief projectile capture followed by outward release | 38 E/use | Orbiting field rings | Curving projectiles and luminous discharge |

**Level additions:** telegraphed bombardment lanes, shield-reflection puzzles,
thermal maintenance corridors with cool alcoves, escorting a fragile power cell,
projectile curtains with timed gaps. Offer skillful avoidance routes alongside
resistance routes; avoid gates that merely demand a larger health bar.

## 6. Reactor & recovery

| Branch / tier | Upgrade and effect | Suggested demand | Armour silhouette | In-game FX |
| --- | --- | --- | --- | --- |
| Capacity T1 | Cell Tuning: +25 maximum energy | 1 passive load | Larger chest cell | Soft reactor pulse |
| Capacity T2 | Dense Cells: +60 energy total | 2 load | Two back cells | Twin pulse lines |
| Capacity T3 | Fusion Bank: +120 energy total | 4 load | Spinal battery stack | Visible suit energy conduits |
| Capacity T4 | Star Core: +220 energy total; bigger simultaneous ability budget | 6 load | Suspended chest core | Contained star-like core glow |
| Recovery T1 | Recuperator: faster recovery when grounded | 1 load | Small intake vents | Faint inward particles |
| Recovery T2 | Salvage Dynamo: kills return a small amount of energy | 3 load | Arm collectors | Small energy motes return to suit |
| Recovery T3 | Motion Dynamo: skilled traversal charges a reserve | 5 load | Leg induction bands | Charge trails during chains |
| Recovery T4 | Perpetual Circuit: controlled partial refunds from diverse ability combos | 8 load | Linked back rings | Energy loops connecting active modules |
| Overdrive T1 | Vent Burst: brief output boost, then recovery window | 15 E/use | Chest vents | Short bright vent plume |
| Overdrive T2 | Redline: longer boost and higher heat ceiling | 25 E/use | Shoulder radiators | Pulsing heat bands |
| Overdrive T3 | Cascade: brief concurrent use of heavy systems | 40 E/use | Opening radiator wings | Alternating weapon-colour pulses |
| Overdrive T4 | Apotheosis: short near-unrestricted power window, followed by cooldown | 65 E/use | Fully deployed reactor halo | Distinct aura and trails; retain readable silhouette |

**Level additions:** optional charging docks, power-routing choices, sprint-through
recharge rings, short power-drain zones with visible boundaries, reactor bypass
switches. Every mandatory energy traversal must work at its advertised tier with
reserve margin; no demand to own a specific reactor build unless clearly labelled.
Refunds must never exceed gross cost indefinitely; cap loops and boss farming.

## 7. Utility & companions

| Branch / tier | Upgrade and effect | Suggested demand | Armour silhouette | In-game FX |
| --- | --- | --- | --- | --- |
| Scanner T1 | Survey Pulse: reveal nearby anchors and destructible panels | 4 E/use | Helmet antenna | Expanding thin scan ring |
| Scanner T2 | Threat Lens: mark weak points and hidden routes | 8 E/use | Split visor | Small outlines and directional ticks |
| Scanner T3 | Predictive Array: preview moving platforms and enemy telegraphs | 14 E/use | Crown sensor fins | Dashed motion ghosts |
| Scanner T4 | Omniscience: wide battlefield scan and shared target marks | 22 E/use | Floating sensor lenses | Brief constellation of labelled targets |
| Hacking T1 | Tap Link: operate nearby terminals | 6 E/use | Finger interface | Short green link |
| Hacking T2 | Override: disable turret or reverse conveyor | 12 E/use | Wrist relay | Digital ripple and allegiance change |
| Hacking T3 | Network Hijack: spread control through linked devices | 22 E/use | Shoulder relay mast | Green network paths |
| Hacking T4 | City Command: temporarily commandeer a whole encounter network | 36 E/use | Back antenna array | Synchronized node flashes and route changes |
| Drones T1 | Scout Drone: one light support drone | 3 E/s | Single back dock | Small teal engine glow |
| Drones T2 | Wingmates: two drones, selectable attack or repair mode | 7 E/s | Twin docks | Paired trails or thin repair tethers |
| Drones T3 | Swarm Bay: four specialised drones and remote switch access | 13 E/s | Opening back hangar | Distinct orbit patterns and tool beams |
| Drones T4 | Seraph Fleet: six drones coordinate salvos and protection | 21 E/s | Multi-port halo dock | Choreographed orbit and converging coloured salvos |

**Level additions:** remote drone ducts, visible terminal networks, hackable
conveyors, friendly/enemy turret allegiance, hidden optional caches, simultaneous
switches with solo timing alternatives. Drones should navigate predictably and
teleport back if stuck; avoid progression depending on fragile companion AI.

## 8. Level design rules and reusable encounter pieces

Levels will appear like large sections of a city. For example, they'll have open surface streets with obstaces, underground sections (sewers), interiors or buildings (ware houses, offices), and roof tops. The proportions will be exagerated, of course. The mixture of each element will also vary from level to level.

Distinguish **hard ability gates** (a labelled required interaction) from **soft
challenges** (multiple ways through). Campaign routes should normally have at
least two solutions. Dedicated technology test missions may intentionally require
one branch, advertise its minimum tier, and keep salvage available before the gate.

| Reusable piece | Teaching encounter | Advanced remix / alternative |
| --- | --- | --- |
| Broken freight lane | Jump-dash across one clear gap | Moving landing plus turret fire; grapple bypass |
| Tower stack | Double-jump/hover between recharge terraces | Wind, overhangs and aerial enemies; anchor route |
| Reinforced room | Cut one marked bulkhead | Beam mirrors, missile-cracked side entrance or hackable door |
| Conductive yard | Chain lightning across three relays | Moving conductor cargo; manual terminal fallback |
| Seismic chamber | Slam a cracked floor | Cascading counterweights; cargo-drop alternative |
| Defensive lane | Block one telegraphed volley | Reflect into switches; dodge through timed gaps |
| Drone maintenance duct | Send scout through visible narrow duct | Remote switches open platform routes; exterior combat path |
| Power junction | Recharge and choose a powered route | Split reactor supply between lift, lights and defences |
| Apex playground | Broad multi-height arena with many light enemies | Destructible cover, aerial rings and linked conductors |

Author optional high-tier shortcuts that make returning to early levels feel
outrageously powerful. Increase encounter width/height and enemy formations as
mobility grows, rather than merely increasing health. Preserve safe recovery
islands; telegraph hazards before committing players to a jump. Respawn on solid
stationary ground, never a vanished lift or destructible tile.

## 9. Forty-five-minute power curve (target, not a grind timer)

| Run time | Expected feel | Build / encounter sketch |
| --- | --- | --- |
| 0–5 min | Capable but grounded | Basic shot/punch; choose one T1; spacious teaching route |
| 5–15 min | A clear identity | Two T1 branches and one T2; first rewarding shortcuts |
| 15–30 min | Combos become the point | T2 mobility, T3 signature weapon, supporting reactor; mixed encounters |
| 30–45 min | Escalating spectacle | First T4, multiple T3 supports; rapid travel and screen-wide target reach |
| 45–60 min | Godlike mastery | T4 mobility + signature weapon, strong recovery; huge formations and spectacular bosses |

For testing, all tiers should be immediately accessible through nominal prices
and lab overrides. For eventual runs, use predictable milestone unlocks and
frequent rewards; do not make the 45-minute fantasy depend on rare random drops.
Apex attacks should devastate basic enemies. Challenge comes from simultaneous
objectives, positioning and priority targets, not making every enemy a damage sponge.

### Hybrid builds worth testing first

- **Thunder angel:** Aerial + Lightning + Recovery; hover above conductive arenas,
  zip between roofs, chain entire formations.
- **Meteor knight:** Vector + Seismic + Shield; dash through fire then slam a crowd.
- **Prism gunship:** Aerial + Laser + Capacity; sustained beams while changing altitude.
- **Rocket conductor:** Missiles + Hacking + Drones; commandeer turrets and coordinate salvos.
- **Rail acrobat:** Grapple + Ballistics + Scanner; swing into lined-up piercing shots.
- **Walking supernova:** Plating + Reactive + Overdrive; absorb pressure and release it.

All combinations need a useful baseline attack when energy is depleted. Reserve
refund rules and particle budgets for multi-branch builds, not just isolated tests.

## 10. Armour and screen readability

- Give each branch a recognisable silhouette at T1; tiers unfold or add components
  instead of only recolouring them. Keep helmet, torso, arms and legs discernible.
- Top-tier upgrades may change the silhouette substatially. e.g., top flight might add large wings; top mobility might replace the feet with a large wheel/tire (like Gizmo Duck)
- Use shared attachment sockets and compact variants for competing modules. Test
  all six-capstone combinations for clipping before increasing cosmetic complexity.
- Weapon colours: gold ballistic, orange missiles, cyan/magenta laser, blue/violet
  lightning, lime blades. Preserve user paint on solid armour; FX colours signal function.
- Keep walkable tops continuous, bright and warm; background architecture cool,
  darker and subdued. Use a broad landing cap, front rim and endpoint outline.
  Background windows should not resemble horizontal landing strips.
- Hazards need unique movement/patterns and warnings, not colour alone. Active vents
  may overlay landing colours but must leave the physical platform boundary visible.
- Background parallax stays slow and lower contrast. No bright background rail may
  compete with the playable rim. Moving platforms inherit the same landing language.
- Separate combat FX from navigation: bright cores with short-lived transparent
  trails; cap concurrent debris; dim older trails; keep player/target silhouettes visible.
- Add future FX intensity, bloom and screen-shake sliders. Provide a reduced-flash
  mode; repeated lightning pulses should not become full-screen white flashes.
- Budget simultaneous emitters, chain links, lights and particles; use pooled or
  instanced effects. Apex spectacle must stay responsive with several branches active.

**Readability change implemented with this draft:** warm platform bodies and caps,
pale continuous landing rims and outlined ends; cooler, darker background structures
with non-glowing vertical windows. Geometry, collision and parallax speeds stay as authored.

## 11. Implementation order

1. Apply the decisions below: shared energy, universal double-jump, four tiers,
   single-occupancy hardpoints, passive reservations and attack modes.
2. Define data-driven upgrades, prerequisite graph, attachment sockets and test-lab overrides.
3. Build one complete vertical slice: four tiers of mobility + one ranged branch,
   reactor support and a test level containing its required mechanics.
4. Add another weapon with a genuinely different interaction (lightning or missiles).
5. Add reusable gate/platform/hazard prefabs and minimum-tier solvability checks.
6. Add melee/defence/utility branches; test hybrid input bindings and socket overlap.
7. Tune a compressed 10-minute test run, then the intended 45–60-minute curve.
8. Only then tune permanent economy, capacity constraints and unlock cadence.

### Validation checklist for later implementation

- Each advertised gate is reachable and solvable with its minimum tier alone.
- Every tier changes an interaction, reach, utility or presentation noticeably.
- Basic attacks and a safe retreat remain available after resource exhaustion.
- Keyboard and controller support jump/double-jump/hold and aiming consistently.
- Every branch has a named visual attachment and distinguishable activation effect.
- Hybrid builds cannot create infinite refunds, permanent invulnerability or softlocks.
- A full Apex loadout remains readable and meets a measured frame-time budget.
- Testers can reach all combinations without farming materials.

## 12. Your edits / open decisions

- [ ] Which categories or branches should be removed, merged or added?
- [ ] Should double-jump remain part of Aerial, or become a universal movement tool?
- [ ] Separate stamina and energy, or one shared reactor reserve?
- [ ] Is passive reactor load useful, or should capacity alone limit builds?
- [ ] Four tiers per branch, or more tiers for signature branches?
- [ ] How many active abilities should a controller loadout expose at once?
- [ ] Which abilities share triggers, use modifiers, or become automatic/passive?
- [ ] Should T4 be sustained, cooldown-based, or short overdrive windows?
- [ ] Which hard gates are satisfying, and which should always have alternate routes?
- [ ] What level of destructibility should survive return visits?
- [ ] Which hybrid fantasy should be our first end-to-end implementation?
- [ ] What visual intensity is exciting without obscuring movement?

### Additions and adjustments

<!-- Add notes here or edit the tables directly. Nothing above requires keeping. -->

- Start with "Thunder Angel" build.
- I like a combination of "passive reactor load" and "single-use hard points".
- For 'hard points', each armour part would have multiple specific hardpoints (eg, "Leg" has 'ankle', 'shin', 'thigh-front', 'thig-back', 'hip'. Upgrades will require one or more hardpoints to attach; and, if something is already there, you have to remove/recycle it to add the new thing. Parts can probably have multiple acceptable hard points (eg, either hip or thigh front/back)
- 'Passive reactor load' should have a small-ish cost to attach, but then also reduces max stamina while in comback (eg, 120 total stamina - 20 passive stam to add wings == 100 stamina in-game for shooting and flying)
- It may be necessary to keep track of builds/abilities/branches that have "conflicting controls" (eg, more than one ranged attack, more than one melee or special movement). In those cases, the player will have to manage their "attack mode" and switch between then, which will activate some abilities and deactivate others (eg, they might have flight and dash, but can only use one per mode)
- Some things, though, will be 'passive' and available in all modes, such as armour or reactor upgrades.
- Double-jump should be universal, unless a branch specifically removes it
- For now, merge stamina and reactor energy
- 4 tiers per branch is enough for now
- Re: 'exposed active abilities', this should be covered by the first edits above about 'attack modes'
- The "is T4 sustained, cool-down, etc" should be a mix depending on ability, and we'll see as we go
- The remainder will be answered as we play-test and get a better sense of things

### Implementation checkpoint — 2026-11-03

The first playable slice now includes:

- Four tiers each of Aerial, Lightning, Recovery and reactor Capacity. Existing
  Vector, Siege and other core branches retain their two implemented prototype
  tiers until their own expansion slices. The purchase rank is the prerequisite
  graph: every tier requires all preceding tiers in the same branch.
- Nominal 1/2/3/4 credit prices with no component costs. The old six-rank cap is
  replaced by hardpoint occupancy and reserved output. Legacy saves migrate
  cosmetics/progress and receive the old purchase-price difference back once.
- Named hardpoints, alternative mounting locations, manual relocation and full
  module recycling. Servo strength demonstrates a module occupying two sockets.
  An occupied acceptable socket must be freed or the module moved elsewhere.
- A single shared energy meter: maximum usable energy = 100 baseline + Capacity
  bonus - passive load. Reservations apply in all modes, including inactive
  equipment. T1–T4 Aerial reserves 8/12/16/20, Lightning 3/5/7/11,
  Recovery 1/3/5/8 and Capacity 1/2/4/6. These are test values.
- Modes cycle with R / controller RB. Thunder uses lightning and flight; Standard
  uses blaster and flight; Siege permits beam plus flight; Vector enables dash
  and disables flight. Only installed attack modes appear. Passive modules remain
  available throughout. Switching cancels pending pulses and movement activations.
- Universal double-jump. Aerial T1 holds the second jump to hover; T2 improves
  ascent and steering; T3 adds aimed air boost (Shift / B); T4 adds fast flight and
  down + boost dive impacts. Gross flight drain is 24/30/38/48 energy per second.
- Lightning chains through 2/4/6/10 targets with per-hop line of sight and bounded
  reach. Relays also conduct arcs. T3 powers a relay network; T4 previews a broad
  pulse for 0.2 seconds before damage. Short blue/violet links are capped at 64.
- Recovery adds grounded recharge, 3 energy per kill, a 4-energy landing reserve
  from one air boost per flight, then alternating-power refunds capped at 15% of
  that activation and 3 energy, with a 0.6-second refund cooldown. No refund
  exceeds its cost. Free baseline blaster and punch remain available.
- Engineering offers T1–T4 Thunder Angel presets and instant refunds. Presets
  explicitly replace equipment and grant test credits; normal consumption stays
  enabled. Pause offers a test refill. Named builds and unrestricted lab toggles
  remain future work.
- Thunder Yard: a street route solvable with Lightning T1 alone, optional rooftop
  flight routes, conductor chains, recovery terraces and a once-per-deployment
  Storm network bonus. Existing districts remain available.

Validation: automated tests cover tier prices, reservations, socket conflicts,
save migration, mode isolation, universal jumping, chain occlusion/reach, pulse
cancellation, boosts/dives, bounded recovery and the test yard's ground gaps.
Visual polish, physical controller playtesting, simultaneous Apex module clipping,
and measured frame-time budgets remain playtest tasks. Other categories,
prerequisites across branches, permanent economy and the 45-minute curve remain
later implementation stages.












### Missile implementation checkpoint — 2026-11-03

- Four purchasable Missile tiers at 1/2/3/4 credits and zero component cost.
  Either shoulder socket is accepted; reservations are 3/5/8/12 energy.
- Missile mode uses LMB / RT, cycles with R / RB, permits flight, and falls
  back to the free blaster on exhaustion. In-flight rockets finish after a
  mode switch. Recovery refunds use the same bounded activation rules.
- Micro Rocket: one slow explosive projectile. Seeker Rack: three guided shots.
  Cluster Swarm: three guided carriers split after 0.45 seconds into nine
  bomblets (early collisions explode the unsplit carrier). Celestial Salvo:
  eight guided rockets fan outward and turn toward visible targets.
- Energy costs 10/18/30/45 per volley; cooldowns 0.9/1.2/1.6/2 seconds.
  Guidance acquires visible targets ahead within 24 units, limits turning,
  and stops steering through occluders. Swept collision prevents tunnelling.
  Blasts respect cover; a blast that opens a door cannot also damage through it.
- Shoulder tubes increase per tier, Apex tubes fan upward, rockets have orange
  exhaust and brief blast rings. Active rockets and transient rings are capped.
- Blastworks adds three visibly cracked missile seals and permanent safe floors,
  raised gantries, grouped enemies and extraction. T1 alone opens every seal.
  Engineering supplies Missile T1–T4 presets with Capacity and Recovery.
- Existing version-1 and pre-missile version-2 saves retain progress. Missile
  purchases, reservations, socket conflicts and refunds use the shared rules.

Validation covers missile costs, splitting, expiration, cover, mode fallback,
old-save migration, and a T1 traversal/extraction simulation with combat removed.
Visual/controller playtesting and full combat balancing remain outstanding.

Next expansion candidates: Vector T3–T4, Laser T3–T4 with prisms, Ballistics,
then melee/defence/utility. Grapple, overdrive, named builds and expanded lab
controls remain backlog; the complete expanded tree is not yet implemented.

### Full branch implementation checkpoint — 2026-11-03

The six-step expansion pass adds playable T1–T4 implementations for every named
branch in this draft. Locomotion and Weapon Calibration remain separate two-rank
prototype stat upgrades. This is a testable prototype interpretation of the tables,
not final combat balance or a completed 45–60-minute progression curve.

1. **Vector:** 12/16/22/30 energy per dash. T2 has two charges and stagger;
   T3 snaps aim to eight directions and can open labelled T3 phase seals;
   T4 has three charges, faster chained movement and launches. A dash can refund
   at most one charge and six energy from kills. Vector Causeway has an optional
   high-tier phase lane; original mandatory shutters still accept T1.
2. **Lasers (saved ID remains siege):** 18/26/36/50 energy per second. T2 widens
   the beam; T3 splits at authored prisms (one split, at most three child rays);
   T4 adds two sweeping secondary rays. Siege Crucible and the Apex range have
   prisms. Beam meshes are reused rather than allocated every simulation step.
3. **Melee and defence:**
   - Servo Fists: energy punch/panel break; hold/release charged launch; grab and
     throw light cargo/enemies; broad Colossus cone and heavy cargo handling.
   - Blades: slash; 0.2-second forward parry; travelling crescent; three seconds
     of orbiting cutters plus slash. Waves collide with structural cover.
   - Seismic: radial stagger; airborne slam; two ground-travelling waves;
     larger impact and slower follow-up waves. Cracked overlays are removable;
     permanent supporting floors are never destroyed.
   - Plating: +25 hull per tier; 30% reduction to hits of at least 15 damage;
     heat/knockback resistance; temporary armour buffer on heavy hits with an
     eight-second cooldown. It cannot become permanent invulnerability.
   - Shield: aimed block; first 0.25 seconds reflects; wider all-direction dome;
     stored impact release capped at 90 damage. Sustaining shield drains energy.
   - Reactive: contact retaliation; wider thermal retaliation/heat resistance;
     accumulated-damage counterpulse; 1.5-second capture field, at most 12 shots,
     with an eight-second activation cooldown.
4. **Other branches:**
   - Ballistics: carbine; three-shot timed burst; hold/release piercing rail;
     nine-shot fan or focused volley, toggled with Q/LT.
   - Grapple: visible aimed anchor tether; faster pull and magnetic-wall cling;
     tractor grab/throw of light cargo and enemies; longer reach, heavy cargo,
     and aimed slingshot on release. Tethers expire and respect line of sight.
   - Overdrive: 3/5/6/7-second output windows, 15/30/50/80% energy discounts
     and +20% damage. Cooldown lasts the window plus ten seconds. Discounts
     persist across modes but do not apply to the activation itself.
   - Scanner: reveal anchors/seals; hidden caches and +20% marked-target damage;
     platform-motion and enemy-windup previews; wide shared marks. Five-second
     scans cost 4/8/14/22 energy.
   - Hacking: nearby terminal; temporary turret allegiance; linked devices;
     wider encounter network. Turret capture expires after 8 seconds (T4: 16).
     Opened route seals stay open. Network links may pass through walls.
   - Drones: 1/2/4/6 support units, tethered to predictable suit-relative orbits;
     attack/repair toggle from T2, remote terminals from T3, shot interception
     at T4. Continuous energy consumption stops support when exhausted.
5. **Testing tools:** each branch has tier presets; Vanguard, Architect and
   Command hybrids join Thunder Angel and Missile presets. Save/load up to 12
   named builds including exact mounts. Free purchases, unlimited energy,
   ignored reservations and reduced effects are explicit opt-in switches.
   Socket occupancy is always enforced. Preset/build loading grants test credits
   when necessary; it is not a permanent progression unlock system.
6. **Integration:** R/RB selects next mode; F/LB selects previous mode. HUD shows
   the selected mode's controls, charge, drone mode and overdrive cooldown.
   Mode changes cancel charges, queued burst shots, shields, tethers and slams.
   Launched projectiles finish; timed overdrive, drone support, scanner marks and
   temporary orbit blades persist. Armour/energy reservations apply in all modes.

**New districts:** Impact Foundry, Crescent Gallery, Fault Chamber, Aegis Lane,
Grapple Gantries, Network Exchange and Apex Proving Ground (14 missions total).
The first six teach T1 interactions; Apex is an ungated mixed test arena. Aegis
Lane currently teaches a one-second sustained shield near a seal, not a bespoke
reflection puzzle. Network Exchange supports T3 remote-drone terminal access too.

**Validation:** 58 automated tests cover existing progression plus new tier gates,
prisms, burst/rail/fist behavior, parry/reflection, capture limits, grapple route,
slam/wave cover, hacking expiry, drone repair/exhaustion, mode cancellation,
all branch/hybrid presets, named-build validation and old-save migration.
TypeScript and production build pass. A 10-second, 28-hostile Command T4 stress
run measured approximately 0.09 ms p95 / 0.19 ms p99 per 120 Hz CPU simulation
step on this machine, without WebGL rendering. Transient shots, rockets, waves
and effects have explicit caps; removed meshes dispose child resources too.

**Still needs playtesting:** live visuals, simultaneous attachment clipping,
physical Xbox-controller ergonomics, GPU frame times and full combat route runs.
Computer Use could not determine the current browser URL confidently and stopped;
no live browser or physical-controller validation is claimed for this pass.
Broader authored puzzles (mirrors, conveyors, drone ducts, escort cells, cargo
counterweights), additional visual polish, difficulty balance, permanent economy
and the 45–60-minute curve remain future work. Core mechanics use safe bounded
prototype versions rather than full physics simulations of every table proposal.

## Stormwater Ward — city test checkpoint

A fifteenth district now prototypes the large connected-city rule in section 8.
**Stormwater Ward** is authored around the Thunder Angel T3 preset (the Storm
Angel build): Aerial + Lightning T3 minimum advertised, Capacity/Recovery
recommended. It spans 192m horizontally and 58m vertically, with street elevation
14m above a continuous sewer recovery floor, three open drain shafts, Exchange
and Crown Works interiors, alternating atriums, rooftop crossings and descents.

Three mandatory Storm Network relays open optional local shortcuts. All three
relays plus 19 hostiles must be cleared before returning west to the starting tram
for extraction. Objectives may be explored in any order; shortcut state persists
within a deployment. Full-map route/enemy/relay indicators support backtracking.
Cutaway architecture, pipework, recessed water, lamps, furnishings, roof plant and
transit shelter are procedural meshes; collision surfaces retain bright landing
rims. No new downloaded textures or external assets are required.

Two simulation tests cover linked relay progression and extraction/reset, plus
seven flight legs through shafts, atriums and roof crossings using the T3 preset,
normal energy drain and natural grounded recovery. Each tested leg retains more
than 20 energy. Browser verification covers mission selection, preset fitting,
deployment, rendering and HUD. Full combat balance and physical-controller runs
remain unverified. This brings the current automated suite to 63 tests.
