/**
 * Engineering UI (M4): the tech-tree screen at the Foundry console.
 * DOM overlay — branches × tiers with buy/recycle/relocate, hardpoint socket
 * display, presets, lab toggles, and the deploy button. Re-renders on change.
 */

import {
  ALL_SOCKETS,
  applyPreset,
  buy,
  cycleMode,
  maxEnergy,
  modesOwned,
  recycle,
  relocate,
  reservationTotal,
  tierOf,
  TREE,
  type BranchId,
  type Loadout,
} from '../../sim/build';

export interface EngineeringHooks {
  onChanged: () => void;
  onDeploy: () => void;
  onRefill: () => void;
}

export class EngineeringUI {
  private readonly panel: HTMLElement;
  private open = false;

  constructor(
    root: HTMLElement,
    private getLoadout: () => Loadout,
    private hooks: EngineeringHooks,
  ) {
    this.panel = document.createElement('div');
    this.panel.id = 'engineering';
    this.panel.style.cssText = `
      position: fixed; inset: 4vh 4vw; background: rgba(8, 12, 18, 0.94);
      border: 1px solid rgba(120, 190, 230, 0.4); border-radius: 8px;
      color: #cfe6f5; font-family: 'Segoe UI', system-ui, sans-serif;
      padding: 18px 22px; overflow-y: auto; display: none; z-index: 20;
      pointer-events: auto;`;
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

  private row(html: string): string {
    return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);">${html}</div>`;
  }

  private btn(label: string, action: string, extra = ''): string {
    return `<button data-action="${action}" ${extra} style="background:#132030;border:1px solid #3a5a74;color:#cfe6f5;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;">${label}</button>`;
  }

  render(): void {
    if (!this.open) return;
    const lo = this.getLoadout();
    const parts: string[] = [];

    parts.push(`<div style="display:flex;justify-content:space-between;align-items:baseline;">
      <h2 style="margin:0;font-size:20px;letter-spacing:0.1em;">ENGINEERING</h2>
      <div style="font-size:13px;">CREDITS <b style="color:#ffc63a;">${lo.credits}</b>
       · MAX ENERGY <b style="color:#7fd8f5;">${maxEnergy(lo)}</b>
       · RESERVATION <b>${reservationTotal(lo)}</b>
       · MODE <b>${lo.mode}</b></div></div>`);

    for (const bid of Object.keys(TREE) as BranchId[]) {
      const def = TREE[bid];
      const owned = tierOf(lo, bid);
      const mod = lo.modules.find((m) => m.branch === bid);
      parts.push(`<div style="margin-top:14px;">
        <div style="font-size:15px;color:#ffc63a;">${def.name}
          <span style="opacity:0.6;font-size:12px;">— ${def.mode}${mod ? ` · mounted: ${mod.sockets.join(', ')}` : ' · not installed'}</span></div>`);
      for (const td of def.tiers) {
        const state = td.tier <= owned ? 'OWNED' : td.tier === owned + 1 ? `${td.cost} cr` : 'locked';
        const actionable = td.tier === owned + 1;
        parts.push(this.row(
          `<b style="width:36px;">T${td.tier}</b>
           <span style="flex:1;">${td.name} <span style="opacity:0.55;font-size:11px;">(${describeEffects(def.mode, td)})</span></span>
           <span style="opacity:0.6;font-size:11px;">load ${td.reservation}</span>
           <span style="width:70px;text-align:right;color:${state === 'OWNED' ? '#7fd8f5' : '#ffc63a'};">${state}</span>
           ${actionable ? this.btn('BUY', `buy:${bid}`) : ''}`,
        ));
      }
      if (owned > 0) {
        parts.push(this.row(
          `<span style="flex:1;"></span>
           ${this.btn('RELOCATE', `relocate:${bid}`)}
           ${this.btn('RECYCLE', `recycle:${bid}`)}`,
        ));
      }
      parts.push('</div>');
    }

    parts.push(`<div style="margin-top:16px;">
      <div style="font-size:13px;opacity:0.7;">TEST LAB</div>
      <div style="display:flex;gap:14px;margin-top:6px;flex-wrap:wrap;align-items:center;">
        ${this.btn('PRESET T1', 'preset:THUNDER_ANGEL_1')}
        ${this.btn('PRESET T2', 'preset:THUNDER_ANGEL_2')}
        ${this.btn('PRESET T3', 'preset:THUNDER_ANGEL_3')}
        ${this.btn('PRESET T4', 'preset:THUNDER_ANGEL_4')}
        ${this.btn('+50 CR', 'credits')}
        <label style="font-size:12px;"><input type="checkbox" data-action="toggle:free" ${lo.toggles.freePurchases ? 'checked' : ''}/> free purchases</label>
        <label style="font-size:12px;"><input type="checkbox" data-action="toggle:energy" ${lo.toggles.infiniteEnergy ? 'checked' : ''}/> infinite energy</label>
        ${this.btn('CYCLE MODE', 'mode')}
        ${this.btn('DEPLOY ▶', 'deploy', 'style="background:#1c3a28;border-color:#4a9a5f;color:#c9f5d5;padding:6px 18px;"')}
        ${this.btn('CLOSE', 'close')}
      </div>
      <div style="font-size:11px;opacity:0.5;margin-top:8px;">Sockets: ${ALL_SOCKETS.length} total · owned modes: ${modesOwned(lo).join(' / ')}</div>
    </div>`);

    this.panel.innerHTML = parts.join('');

    for (const el of this.panel.querySelectorAll<HTMLElement>('[data-action]')) {
      el.addEventListener('click', () => this.handle(el.dataset['action']!));
      el.addEventListener('change', () => this.handle(el.dataset['action']!));
    }
  }

  private handle(action: string): void {
    const lo = this.getLoadout();
    const [cmd, arg] = action.split(':');
    switch (cmd) {
      case 'buy':
        buy(lo, arg as BranchId);
        break;
      case 'recycle':
        recycle(lo, arg as BranchId);
        break;
      case 'relocate':
        relocate(lo, arg as BranchId);
        break;
      case 'preset':
        if (arg) applyPreset(lo, arg);
        break;
      case 'credits':
        lo.credits += 50;
        break;
      case 'toggle':
        if (arg === 'free') lo.toggles.freePurchases = !lo.toggles.freePurchases;
        if (arg === 'energy') lo.toggles.infiniteEnergy = !lo.toggles.infiniteEnergy;
        break;
      case 'mode':
        cycleMode(lo, 1);
        break;
      case 'deploy':
        this.close();
        this.hooks.onDeploy();
        return;
      case 'close':
        this.close();
        return;
    }
    this.hooks.onChanged();
    this.render();
  }
}

function describeEffects(mode: string, td: { effects: Record<string, number> }): string {
  const e = td.effects;
  switch (mode) {
    case 'flight':
      return `hover ${e['hoverDrain']} E/s, rise ${e['hoverAscent']} m/s, move ×${e['moveMult']}`;
    case 'weapon':
      return `${e['damage']} dmg · chains ${e['chains']} · ${e['cost']} E · range ${e['range']} m`;
    case 'passive':
      return e['bonus'] !== undefined
        ? `+${e['bonus']} max energy`
        : `regen +${e['regenBonus']}, kill +${e['killRefund']}, landing +${e['landingReserve']}`;
    case 'movement':
      return `dash ${e['charges']}× · ${e['cost']} E`;
    default:
      return `hack ${e['hackTime']} s · ${e['hackCost']} E · range ${e['range']} m`;
  }
}
