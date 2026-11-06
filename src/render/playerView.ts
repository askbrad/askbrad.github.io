/**
 * Render-side projection of the sim player: the full armour rig (M6) plus a
 * blob shadow projected onto the highest collision surface below — height and
 * landing points read clearly during jumps (plan §10). The rig carries part
 * variants, paint and tier attachments; the sim stays blind to all of it.
 */

import { Mesh, MeshBuilder, Scene, StandardMaterial, Color3, Vector3, TransformNode } from '@babylonjs/core';
import type { PlayerState } from '../sim/types';
import type { Loadout } from '../sim/build';
import type { Cosmetics } from '../sim/cosmetics';
import { ArmourRig } from './armourView';

export class PlayerView {
  readonly root: TransformNode;
  readonly rig: ArmourRig;
  private readonly shadow: Mesh;
  private readonly shadowMat: StandardMaterial;

  constructor(scene: Scene) {
    this.root = new TransformNode('playerRoot', scene);
    this.rig = new ArmourRig(scene, 'player');
    this.rig.root.parent = this.root;

    // Blob shadow.
    this.shadow = MeshBuilder.CreateDisc('playerShadow', { radius: 0.55, tessellation: 24 }, scene);
    this.shadow.rotation.x = Math.PI / 2;
    this.shadowMat = new StandardMaterial('playerShadowMat', scene);
    this.shadowMat.diffuseColor = Color3.Black();
    this.shadowMat.emissiveColor = Color3.Black();
    this.shadowMat.specularColor = Color3.Black();
    this.shadowMat.alpha = 0.35;
    this.shadow.material = this.shadowMat;
    this.shadow.isPickable = false;
  }

  /** Copy sim transform into the render rig. */
  sync(player: PlayerState): void {
    this.root.position.set(player.x, player.y, player.z);
    this.root.rotation.y = player.yaw;
  }

  /** Walk-cycle animation (call every rendered frame). */
  animate(dt: number, moving: number): void {
    this.rig.update(dt, moving);
  }

  /** Rebuild tier attachments after a build change. */
  applyBuild(loadout: Loadout): void {
    this.rig.applyBuild(loadout);
  }

  /** Apply part variants + paint. */
  applyCosmetics(cos: Cosmetics): void {
    this.rig.applyCosmetics(cos);
  }

  /**
   * Project the blob shadow onto the surface top `topY` below the player.
   * Fades and widens with height; hidden when nothing is below (null).
   */
  updateShadow(x: number, y: number, z: number, topY: number | null): void {
    if (topY === null) {
      this.shadow.setEnabled(false);
      return;
    }
    const h = Math.max(0, y - topY);
    this.shadow.setEnabled(true);
    this.shadow.position.set(x, topY + 0.04, z);
    const grow = 1 + Math.min(1.2, h * 0.04);
    this.shadow.scaling.set(grow, grow, grow);
    this.shadowMat.alpha = Math.max(0.12, 0.38 - h * 0.018);
  }
}

/** Convenience for main.ts — keeps Vector3 usage contained to render code. */
export function playerTarget(player: PlayerState, out: Vector3): Vector3 {
  return out.set(player.x, player.y + 1, player.z);
}
