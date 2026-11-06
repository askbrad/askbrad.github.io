/**
 * Pause menu (M5): Esc toggles. Pauses the sim while open. Offers Resume and
 * (during a mission) Abandon — abandon banks credits and returns to the
 * Foundry, per the rogue-lite-lite death/exit rules (plan §11.5).
 */

export class PauseMenu {
  private readonly panel: HTMLElement;
  private open = false;

  constructor(
    root: HTMLElement,
    private hooks: { onResume: () => void; onAbandon: () => void; mission: () => boolean },
  ) {
    this.panel = document.createElement('div');
    this.panel.id = 'pause-menu';
    this.panel.style.cssText = `
      position: fixed; inset: 0; background: rgba(5, 8, 12, 0.8); z-index: 30;
      display: none; align-items: center; justify-content: center;
      font-family: 'Segoe UI', system-ui, sans-serif; color: #cfe6f5;`;
    root.appendChild(this.panel);
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.open = !this.open;
    this.render();
  }

  close(): void {
    this.open = false;
    this.panel.style.display = 'none';
  }

  private render(): void {
    if (!this.open) {
      this.panel.style.display = 'none';
      return;
    }
    this.panel.style.display = 'flex';
    const inMission = this.hooks.mission();
    this.panel.innerHTML = `
      <div style="background:rgba(8,12,18,0.95);border:1px solid rgba(120,190,230,0.4);
                  border-radius:8px;padding:28px 40px;text-align:center;pointer-events:auto;">
        <h2 style="margin:0 0 18px;font-size:22px;letter-spacing:0.12em;">PAUSED</h2>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button data-a="resume" style="background:#132030;border:1px solid #3a5a74;color:#cfe6f5;padding:10px 30px;border-radius:4px;cursor:pointer;">RESUME</button>
          ${inMission ? '<button data-a="abandon" style="background:#2a1520;border:1px solid #743a4a;color:#f5c9d5;padding:10px 30px;border-radius:4px;cursor:pointer;">ABANDON MISSION</button>' : ''}
        </div>
        <div style="margin-top:14px;font-size:11px;opacity:0.5;">abandon banks your credits and returns to the foundry</div>
      </div>`;
    for (const el of this.panel.querySelectorAll<HTMLElement>('[data-a]')) {
      el.addEventListener('click', () => {
        if (el.dataset['a'] === 'resume') {
          this.close();
        } else if (el.dataset['a'] === 'abandon') {
          this.close();
          this.hooks.onAbandon();
        }
      });
    }
  }
}
