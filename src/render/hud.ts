/**
 * HTML/CSS HUD overlay (plan §2: no @babylonjs/gui — native DOM is cheaper to
 * iterate and gives us real form controls for the foundry colour pickers).
 * M0 shell: energy bar placeholder, mode chip, camera chip, build stamp, hints.
 */

import type { CameraRig } from './cameraRig';

export class Hud {
  private readonly energyFill: HTMLElement;
  private readonly hullFill: HTMLElement;
  private readonly modeChip: HTMLElement;
  private readonly camChip: HTMLElement;
  private readonly hudStamp: HTMLElement;
  private readonly floorChip: HTMLElement;
  private readonly lootChip: HTMLElement;
  private readonly deathFlash: HTMLElement;
  private hackBar: HTMLElement | null = null;
  private hackFill: HTMLElement | null = null;
  private objPanel: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <div class="hud-corner hud-tl">
        <div class="hud-label">HULL</div>
        <div class="energy-bar hull-bar"><div class="energy-fill" id="hud-hull"></div></div>
        <div class="hud-label">REACTOR</div>
        <div class="energy-bar"><div class="energy-fill" id="hud-energy"></div></div>
        <div class="hud-chip" id="hud-mode">MODE · STANDARD</div>
        <div class="hud-chip" id="hud-floor">STREET</div>
        <div class="hud-chip" id="hud-loot">CR 0 · SCRAP 0 · ☠ 0</div>
      </div>
      <div class="hud-corner hud-tr">
        <div class="hud-chip" id="hud-cam">CAM · FREE</div>
        <div class="hud-stamp" id="hud-stamp">THE ENGINEER</div>
      </div>
      <div class="hud-corner hud-bl">
        <div class="hud-hint">WASD/L-stick move · Mouse/R-stick aim · LMB/RT fire · V/X punch · Space/A jump ×2 · T/Y snap · G debug fly</div>
      </div>
      <div id="hud-death"></div>
    `;
    this.energyFill = this.must('#hud-energy');
    this.hullFill = this.must('#hud-hull');
    this.modeChip = this.must('#hud-mode');
    this.camChip = this.must('#hud-cam');
    this.hudStamp = this.must('#hud-stamp');
    this.hudStamp.textContent = `THE ENGINEER · PLAYTEST v${__VERSION__}`;
    this.floorChip = this.must('#hud-floor');
    this.lootChip = this.must('#hud-loot');
    this.deathFlash = this.must('#hud-death');
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

  setFloor(label: string): void {
    if (this.floorChip.textContent !== label) this.floorChip.textContent = label;
  }

  setMode(label: string): void {
    this.modeChip.textContent = `MODE · ${label}`;
  }

  /** Hack/extract channel bar; null hides it. */
  setHackProgress(frac: number | null): void {
    if (frac === null) {
      if (this.hackBar) this.hackBar.style.display = 'none';
      return;
    }
    if (!this.hackBar) {
      this.hackBar = document.createElement('div');
      this.hackBar.style.cssText = `
        position: absolute; left: 50%; bottom: 90px; transform: translateX(-50%);
        width: 240px; height: 8px; background: rgba(8,12,18,0.72);
        border: 1px solid rgba(120,190,230,0.4); border-radius: 3px; overflow: hidden;`;
      const fill = document.createElement('div');
      fill.style.cssText = 'height:100%;width:0%;background:linear-gradient(90deg,#35d07f,#a0f5c5);';
      this.hackBar.appendChild(fill);
      this.hackFill = fill;
      this.root.appendChild(this.hackBar);
    }
    this.hackBar.style.display = 'block';
    this.hackFill!.style.width = `${Math.round(Math.max(0, Math.min(1, frac)) * 100)}%`;
  }

  /** Vital bars (fractions 0..1) + loot counters. */
  setVitals(hullFrac: number, energyFrac: number, credits: number, scrap: number, deaths: number): void {
    this.hullFill.style.width = `${Math.round(Math.max(0, Math.min(1, hullFrac)) * 100)}%`;
    this.energyFill.style.width = `${Math.round(Math.max(0, Math.min(1, energyFrac)) * 100)}%`;
    this.lootChip.textContent = `CR ${credits} · SCRAP ${scrap} · ☠ ${deaths}`;
  }

  /** Brief red flash overlay on death (CSS transition handles the fade). */
  flashDeath(): void {
    this.deathFlash.classList.add('active');
    window.setTimeout(() => this.deathFlash.classList.remove('active'), 350);
  }

  /** Mission objectives tracker (M5): lines + mission clock. */
  setObjectives(lines: string[], timerSec: number, visible: boolean): void {
    if (!this.objPanel) {
      this.objPanel = document.createElement('div');
      this.objPanel.style.cssText = `
        position: absolute; top: 110px; right: 16px; text-align: right;
        display: flex; flex-direction: column; gap: 4px;`;
      this.root.appendChild(this.objPanel);
    }
    this.objPanel.style.display = visible ? 'flex' : 'none';
    if (!visible) return;
    const mm = Math.floor(timerSec / 60);
    const ss = Math.floor(timerSec % 60).toString().padStart(2, '0');
    let html = `<div class="hud-chip" style="color:#ffc63a;">T+${mm}:${ss}</div>`;
    for (const l of lines) {
      const done = l.startsWith('★') || !/[0-9]\/[0-9]/.test(l) || /\/\d+\)/.test(l);
      html += `<div class="hud-chip" style="${done ? 'color:#a0f5c5;' : ''}">${l}</div>`;
    }
    this.objPanel.innerHTML = html;
  }
}
