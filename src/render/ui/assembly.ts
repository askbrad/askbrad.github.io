/**
 * Assembly UI (M6): armour cosmetics at the Foundry Assembly console.
 * Per part (head/chest/arms/legs): two visual variants + main/accent colour
 * pickers with a live rotating mannequin preview. Changes persist via hooks.
 */

import { COSMETIC_PARTS, variantName, type Cosmetics, type PartId } from '../../sim/cosmetics';

export class AssemblyUI {
  private readonly panel: HTMLElement;
  private open = false;

  constructor(
    root: HTMLElement,
    private getCosmetics: () => Cosmetics,
    private hooks: { onChanged: (part: PartId) => void; onClose: () => void },
  ) {
    this.panel = document.createElement('div');
    this.panel.id = 'assembly';
    this.panel.style.cssText = `
      position: fixed; right: 4vw; top: 4vh; bottom: 4vh; width: 40vw; min-width: 420px;
      background: rgba(8, 12, 18, 0.94); border: 1px solid rgba(255, 198, 58, 0.4);
      border-radius: 8px; color: #cfe6f5; font-family: 'Segoe UI', system-ui, sans-serif;
      padding: 18px 22px; overflow-y: auto; display: none; z-index: 20; pointer-events: auto;`;
    root.appendChild(this.panel);
    this.render();
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    this.open = !this.open;
    this.panel.style.display = this.open ? 'block' : 'none';
    if (this.open) this.render();
  }

  close(): void {
    this.open = false;
    this.panel.style.display = 'none';
  }

  private render(): void {
    if (!this.open) return;
    const cos = this.getCosmetics();
    const parts: string[] = [];

    parts.push(`<div style="display:flex;justify-content:space-between;align-items:baseline;">
      <h2 style="margin:0;font-size:20px;letter-spacing:0.1em;">ASSEMBLY</h2>
      <button data-a="close" style="background:#132030;border:1px solid #3a5a74;color:#cfe6f5;padding:4px 14px;border-radius:4px;cursor:pointer;">CLOSE</button>
    </div>
    <div style="font-size:11px;opacity:0.5;margin:4px 0 10px;">the mannequin beside you previews your suit live — changes save automatically</div>`);

    for (const part of Object.keys(COSMETIC_PARTS) as PartId[]) {
      const def = COSMETIC_PARTS[part]!;
      const c = cos[part]!;
      parts.push(`<div style="margin-top:14px;">
        <div style="font-size:15px;color:#ffc63a;text-transform:uppercase;">${part}
          <span style="opacity:0.6;font-size:12px;">— ${variantName(part, c.variant)} class</span></div>
        <div style="display:flex;gap:8px;align-items:center;padding:8px 0;">
          ${def.variants.map((v, idx) =>
            `<button data-a="variant:${part}:${idx}" style="background:${c.variant === idx ? '#1c3a4a' : '#132030'};border:1px solid ${c.variant === idx ? '#37c4f0' : '#3a5a74'};color:#cfe6f5;padding:5px 16px;border-radius:4px;cursor:pointer;font-size:12px;">${v}</button>`).join('')}
          <span style="flex:1;"></span>
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;">main
            <input type="color" data-a="main:${part}" value="${c.main}" style="width:42px;height:28px;border:none;background:none;cursor:pointer;"/></label>
          <label style="font-size:12px;display:flex;align-items:center;gap:6px;">accent
            <input type="color" data-a="accent:${part}" value="${c.accent}" style="width:42px;height:28px;border:none;background:none;cursor:pointer;"/></label>
        </div>
      </div>`);
    }

    this.panel.innerHTML = parts.join('');

    for (const el of this.panel.querySelectorAll<HTMLElement>('[data-a]')) {
      const action = el.dataset['a']!;
      if (action.startsWith('variant:')) {
        el.addEventListener('click', () => {
          const [, part, idx] = action.split(':');
          const cos2 = this.getCosmetics();
          cos2[part as PartId]!.variant = Number(idx) as 0 | 1;
          this.hooks.onChanged(part as PartId);
          this.render();
        });
      } else {
        el.addEventListener('input', () => {
          const [kind, part] = action.split(':');
          const cos2 = this.getCosmetics();
          if (kind === 'main') cos2[part as PartId]!.main = (el as HTMLInputElement).value;
          else cos2[part as PartId]!.accent = (el as HTMLInputElement).value;
          this.hooks.onChanged(part as PartId);
        });
      }
    }
  }
}
