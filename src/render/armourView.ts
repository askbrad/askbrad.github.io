/**
 * Parametric armour rig (M6): the player's visual body, built from primitive
 * assemblies on four part roots (head / chest / arms / legs) with two visual
 * variants per part, per-part main+accent paint, and tier-driven silhouette
 * attachments (tech-tree §10: tiers unfold/add components, they don't just
 * recolour). Used both for the in-mission player and the Foundry mannequin.
 */

import { Color3, Mesh, MeshBuilder, StandardMaterial, TransformNode } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import { tierOf, type Loadout } from '../sim/build';
import { COSMETIC_PARTS, type Cosmetics, type PartId } from '../sim/cosmetics';

interface PartMats {
  main: StandardMaterial;
  accent: StandardMaterial;
}

/** Paint helper: convert #rrggbb to Color3. */
function color(hex: string): Color3 {
  return Color3.FromHexString(hex);
}

export class ArmourRig {
  readonly root: TransformNode;
  private readonly parts = new Map<PartId, TransformNode>();
  private readonly mats = new Map<PartId, PartMats>();
  private readonly variantNodes = new Map<PartId, TransformNode[]>();
  private readonly attachments: TransformNode[] = [];
  private readonly scene: Scene;
  private legSwing = 0;

  constructor(scene: Scene, name = 'armour') {
    this.scene = scene;
    this.root = new TransformNode(name, scene);

    for (const part of ['head', 'chest', 'arms', 'legs'] as PartId[]) {
      const main = new StandardMaterial(`${name}_${part}_main`, scene);
      const accent = new StandardMaterial(`${name}_${part}_accent`, scene);
      main.specularColor = new Color3(0.08, 0.08, 0.08);
      accent.specularColor = new Color3(0, 0, 0);
      this.mats.set(part, { main, accent });
      this.parts.set(part, new TransformNode(`${name}_${part}`, scene));
      this.parts.get(part)!.parent = this.root;
    }

    this.buildBaseMeshes();
  }

  private m(part: PartId, which: 'main' | 'accent'): StandardMaterial {
    return this.mats.get(part)![which];
  }

  private box(parent: TransformNode, name: string, w: number, h: number, d: number, x: number, y: number, z: number, m: StandardMaterial): Mesh {
    const b = MeshBuilder.CreateBox(`${this.root.name}_${name}`, { width: w, height: h, depth: d }, this.scene);
    b.position.set(x, y, z);
    b.parent = parent;
    b.material = m;
    b.isPickable = false;
    return b;
  }

  private cyl(parent: TransformNode, name: string, diameter: number, height: number, x: number, y: number, z: number, m: StandardMaterial): Mesh {
    const c = MeshBuilder.CreateCylinder(`${this.root.name}_${name}`, { diameter, height, tessellation: 12 }, this.scene);
    c.position.set(x, y, z);
    c.parent = parent;
    c.material = m;
    c.isPickable = false;
    return c;
  }

  /** Static part geometry per variant. Variant meshes toggle visibility. */
  private buildBaseMeshes(): void {
    const legs = this.parts.get('legs')!;
    const chest = this.parts.get('chest')!;
    const arms = this.parts.get('arms')!;
    const head = this.parts.get('head')!;

    // ── LEGS (variant 0 thruster / 1 wheeled) ───────────────────────────
    const legL = new TransformNode(`${this.root.name}_legL`, this.scene);
    const legR = new TransformNode(`${this.root.name}_legR`, this.scene);
    legL.parent = legs;
    legR.parent = legs;
    legL.position.set(-0.22, 0.9, 0);
    legR.position.set(0.22, 0.9, 0);
    this.variantNodes.set('legs', [legL, legR]); // swing targets

    for (const [tag, leg] of [['l', legL] as const, ['r', legR] as const]) {
      // Shared thigh.
      this.box(leg, `thigh${tag}`, 0.28, 0.5, 0.32, 0, -0.25, 0, this.m('legs', 'main'));
      // V0: cylinder calves + accent nozzle cones.
      const calfT = this.cyl(leg, `calfT${tag}`, 0.24, 0.5, 0, -0.75, 0, this.m('legs', 'main'));
      const nozzle = this.cyl(leg, `nozzle${tag}`, 0.26, 0.16, 0, -1.02, 0, this.m('legs', 'accent'));
      nozzle.rotation.x = Math.PI;
      const wheel = MeshBuilder.CreateTorus(`${this.root.name}_wheel${tag}`, { diameter: 0.5, thickness: 0.16, tessellation: 16 }, this.scene);
      wheel.position.set(0, -0.78, 0.12);
      wheel.parent = leg;
      wheel.material = this.m('legs', 'accent');
      wheel.isPickable = false;
      calfT.name = calfT.name; // keep
      // Variant visibility: tag nodes.
      calfT.name = `${this.root.name}_legs_v0_calf${tag}`;
      nozzle.name = `${this.root.name}_legs_v0_nozzle${tag}`;
      wheel.name = `${this.root.name}_legs_v1_wheel${tag}`;
    }

    // ── CHEST (v0 core / v1 plate) ──────────────────────────────────────
    this.box(chest, 'torso', 0.72, 0.62, 0.44, 0, 1.21, 0, this.m('chest', 'main'));
    const core = MeshBuilder.CreateCylinder(`${this.root.name}_chest_v0_core`, { diameter: 0.3, height: 0.1, tessellation: 16 }, this.scene);
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 1.22, 0.24);
    core.parent = chest;
    core.material = this.m('chest', 'accent');
    core.isPickable = false;
    const plateTop = this.box(chest, 'chest_v1_plateTop', 0.82, 0.26, 0.5, 0, 1.38, 0, this.m('chest', 'accent'));
    const plateBot = this.box(chest, 'chest_v1_plateBot', 0.76, 0.24, 0.46, 0, 1.08, 0.02, this.m('chest', 'accent'));
    void plateTop;
    void plateBot;

    // ── ARMS (v0 blaster / v1 blade) ────────────────────────────────────
    for (const sign of [-1, 1]) {
      const tag = sign < 0 ? 'l' : 'r';
      this.box(arms, `shoulder${tag}`, 0.28, 0.24, 0.34, sign * 0.48, 1.44, 0, this.m('arms', 'main'));
      this.box(arms, `uarm${tag}`, 0.2, 0.42, 0.24, sign * 0.48, 1.18, 0, this.m('arms', 'main'));
      this.box(arms, `farm${tag}`, 0.18, 0.4, 0.22, sign * 0.48, 0.82, 0.06, this.m('arms', 'main'));
      // V0: forward barrel (accent tip).
      const barrel = this.cyl(arms, `arms_v0_barrel${tag}`, 0.1, 0.5, sign * 0.48, 0.8, 0.3, this.m('arms', 'accent'));
      barrel.rotation.x = Math.PI / 2;
      // V1: blade fin.
      const fin = this.box(arms, `arms_v1_fin${tag}`, 0.05, 0.16, 0.55, sign * 0.48, 0.82, 0.32, this.m('arms', 'accent'));
      void fin;
    }

    // ── HEAD (v0 visor / v1 crest) ──────────────────────────────────────
    this.box(head, 'helmet', 0.42, 0.36, 0.42, 0, 1.7, 0, this.m('head', 'main'));
    const visor = this.box(head, 'head_v0_visor', 0.3, 0.1, 0.06, 0, 1.72, 0.21, this.m('head', 'accent'));
    void visor;
    const crest = this.box(head, 'head_v1_crest', 0.06, 0.16, 0.4, 0, 1.93, 0, this.m('head', 'accent'));
    void crest;
  }

  /** Show only the selected variant's meshes per part; paint materials. */
  applyCosmetics(cos: Cosmetics): void {
    for (const part of ['head', 'chest', 'arms', 'legs'] as PartId[]) {
      const c = cos[part]!;
      this.m(part, 'main').diffuseColor = color(c.main);
      this.m(part, 'main').emissiveColor = color(c.main).scale(0.12);
      this.m(part, 'accent').diffuseColor = color(c.accent);
      this.m(part, 'accent').emissiveColor = color(c.accent).scale(0.45);

      const variantName = COSMETIC_PARTS[part]!.variants[c.variant]!.toLowerCase();
      for (const m of this.scene.meshes) {
        if (!m.name.startsWith(`${this.root.name}_${part}_v`)) continue;
        const meshVariant = m.name.split('_v')[1]!.split('_')[0]!;
        m.setEnabled(meshVariant === variantName);
      }
    }
  }

  /** Rebuild tier-driven silhouette attachments from the installed build. */
  applyBuild(loadout: Loadout): void {
    for (const n of this.attachments) n.dispose();
    this.attachments.length = 0;

    const att = (name: string): TransformNode => {
      const t = new TransformNode(`${this.root.name}_att_${name}`, this.scene);
      t.parent = this.root;
      this.attachments.push(t);
      return t;
    };

    // ── Aerial: T1 backpack jets → T2+ wings (grow) → T4 prismatic tips ──
    const aerial = tierOf(loadout, 'aerial');
    if (aerial >= 1) {
      const jets = att('aerialJets');
      for (const sign of [-1, 1]) {
        this.cyl(jets, `jet${sign < 0 ? 'l' : 'r'}`, 0.14, 0.5, sign * 0.2, 1.32, -0.32, this.m('chest', 'accent')).rotation.x = 0.25;
      }
    }
    if (aerial >= 2) {
      const wings = att('aerialWings');
      const span = 0.9 + aerial * 0.25;
      for (const sign of [-1, 1]) {
        const wing = this.box(wings, `wing${sign < 0 ? 'l' : 'r'}`, span, 0.06, 0.55, sign * (0.4 + span / 2), 1.42, -0.3, this.m('chest', 'accent'));
        wing.rotation.z = sign * -0.18;
      }
    }
    if (aerial >= 4) {
      const tips = att('aerialTips');
      for (const sign of [-1, 1]) {
        this.box(tips, `tip${sign < 0 ? 'l' : 'r'}`, 0.3, 0.12, 0.12, sign * 1.85, 1.62, -0.42, this.m('chest', 'main'));
      }
    }

    // ── Lightning: shoulder Tesla coils (grow with tier) ─────────────────
    const lt = tierOf(loadout, 'lightning');
    if (lt >= 1) {
      const coils = att('lightningCoils');
      const h = 0.16 + lt * 0.07;
      for (const sign of [-1, 1]) {
        this.cyl(coils, `coil${sign < 0 ? 'l' : 'r'}`, 0.12, h, sign * 0.48, 1.62 + h / 2, -0.05, this.m('arms', 'accent'));
      }
    }

    // ── Capacity: chest cell, grows with tier ────────────────────────────
    const cap = tierOf(loadout, 'capacity');
    if (cap >= 1) {
      const s = 0.16 + cap * 0.05;
      const cell = att('capacityCell');
      this.box(cell, 'cell', s, s, 0.14, 0, 1.24, -0.28, this.m('chest', 'accent'));
    }

    // ── Recovery: intake vents on the lower chest ─────────────────────────
    const rec = tierOf(loadout, 'recovery');
    if (rec >= 1) {
      const vents = att('recoveryVents');
      for (let i = 0; i < 3; i++) {
        this.box(vents, `vent${i}`, 0.1, 0.06, 0.06, -0.16 + i * 0.16, 1.02, 0.24, this.m('chest', 'accent'));
      }
    }

    // ── Vector: ankle thruster rings (T2 adds a second pair) ─────────────
    const vec = tierOf(loadout, 'vector');
    if (vec >= 1) {
      const rings = att('vectorRings');
      for (const sign of [-1, 1]) {
        const ring = MeshBuilder.CreateTorus(`${this.root.name}_att_vring${sign < 0 ? 'l' : 'r'}`, { diameter: 0.34, thickness: 0.07, tessellation: 16 }, this.scene);
        ring.position.set(sign * 0.22, 0.45, 0);
        ring.parent = rings;
        ring.material = this.m('legs', 'accent');
        ring.isPickable = false;
      }
    }

    // ── Hacking: wrist interface antenna ──────────────────────────────────
    const hack = tierOf(loadout, 'hacking');
    if (hack >= 1) {
      const ant = att('hackingAntenna');
      const a = this.cyl(ant, 'ant', 0.04, 0.34 + hack * 0.08, -0.48, 1.06, 0.14, this.m('arms', 'accent'));
      a.rotation.x = -0.4;
    }
  }

  /** Walk-cycle sway while moving; called every rendered frame. */
  update(dt: number, moving: number): void {
    this.legSwing += dt * (moving > 0.1 ? 10 : 0);
    const swing = Math.sin(this.legSwing) * 0.3 * moving;
    const legs = this.variantNodes.get('legs')!;
    const [l, r] = [legs[0]!, legs[1]!];
    l.rotation.x = swing;
    r.rotation.x = -swing;
    const arms = this.parts.get('arms')!;
    arms.rotation.x = -swing * 0.6;
  }
}
