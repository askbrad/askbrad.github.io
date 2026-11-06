/**
 * HTML/CSS HUD overlay (plan §2: no @babylonjs/gui — native DOM is cheaper to
 * iterate and gives us real form controls for the foundry colour pickers).
 * M0 shell: energy bar placeholder, mode chip, camera chip, build stamp, hints.
 */

import type { CameraRig } from './cameraRig';

export class Hud {
  private readonly energyFill: HTMLElement;
  private readonly modeChip: HTMLElement;
  private readonly camChip: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <div class="hud-corner hud-tl">
        <div class="hud-label">REACTOR</div>
        <div class="energy-bar"><div class="energy-fill"></div></div>
        <div class="hud-chip" id="hud-mode">MODE · STANDARD</div>
      </div>
      <div class="hud-corner hud-tr">
        <div class="hud-chip" id="hud-cam">CAM · FREE</div>
        <div class="hud-stamp">THE ENGINEER — M0</div>
      </div>
      <div class="hud-corner hud-bl">
        <div class="hud-hint">WASD / Left stick — move &nbsp;·&nbsp; RMB-drag / Right stick — orbit &nbsp;·&nbsp; Wheel — zoom &nbsp;·&nbsp; T / Y — snap toggle</div>
      </div>
    `;
    this.energyFill = this.must('.energy-fill');
    this.modeChip = this.must('#hud-mode');
    this.camChip = this.must('#hud-cam');
  }

  private must(selector: string): HTMLElement {
    const el = this.root.querySelector<HTMLElement>(selector);
    if (!el) throw new Error(`HUD element missing: ${selector}`);
    return el;
  }

  /** M0: energy bar is a static placeholder until the reactor lands in M3. */
  setEnergy(fraction: number): void {
    this.energyFill.style.width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
  }

  setCameraMode(rig: CameraRig): void {
    this.camChip.textContent = rig.snap ? 'CAM · SNAP 90°' : 'CAM · FREE';
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setMode(mode: string): void {
    // Attack modes arrive in M4; chip text is static until then.
    void this.modeChip;
  }
}
