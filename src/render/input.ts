/**
 * Unified input: keyboard+mouse and Xbox gamepad produce the same per-frame
 * intents. Browser APIs live here (render side); the sim only ever sees the
 * normalized `Intent` / `CameraInput` structs this module produces.
 */

import type { Intent, MoveAxes } from '../sim/types';

/** Camera-relative controls sampled each frame (orbit, zoom, snap toggle). */
export interface CameraInput {
  /** Yaw delta for this frame, radians. */
  yawDelta: number;
  /** Wheel/stick zoom delta, positive = zoom in. */
  zoomDelta: number;
  /** True only on the frame the snap toggle is pressed. */
  snapToggled: boolean;
}

export const EMPTY_CAMERA_INPUT: CameraInput = { yawDelta: 0, zoomDelta: 0, snapToggled: false };

const KEY_MOVE: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

const LEFT_STICK_DEADZONE = 0.18;
const RIGHT_STICK_DEADZONE = 0.22;
const AIM_STICK_DEADZONE = 0.3;
/** Right-stick orbit speed, radians/sec at full deflection. */
const STICK_ORBIT_SPEED = 2.6;
/** Mouse orbit sensitivity, radians/pixel. */
const MOUSE_ORBIT_SENS = 0.005;
/** Gamepad buttons (Xbox layout). */
const PAD_SNAP_BUTTON = 3; // Y
const PAD_FIRE_BUTTON = 7; // RT
const PAD_PUNCH_BUTTON = 2; // X
const PAD_RS_CLICK = 10; // right stick click — hold to orbit with the stick

function applyDeadzone(v: number, dz: number): number {
  const mag = Math.abs(v);
  if (mag <= dz) return 0;
  return Math.sign(v) * ((mag - dz) / (1 - dz));
}

export class InputManager {
  private keys = new Set<string>();
  private rmbDown = false;
  private mouseDX = 0;
  private mouseDY = 0;
  private wheel = 0;
  private padSnapPrev = false;
  private jumpPrev = false;
  private punchPrev = false;
  private lmbDown = false;
  private pointerX = 0;
  private pointerY = 0;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      // Only prevent for keys we actually bind in-game; keep browser combos alive.
      if (KEY_MOVE[e.code] || e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 2) {
        this.rmbDown = true;
        canvas.setPointerCapture(e.pointerId);
      }
      if (e.button === 0) this.lmbDown = true;
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.button === 2) this.rmbDown = false;
      if (e.button === 0) this.lmbDown = false;
    });
    canvas.addEventListener('pointermove', (e) => {
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
      if (!this.rmbDown) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheel += e.deltaY;
      },
      { passive: false },
    );
  }

  /**
   * Sample all devices and produce a world-space move intent.
   * `forwardXZ`/`rightXZ` are the camera's projected basis vectors so "W"
   * always means away-from-camera regardless of orbit yaw. `aimDir` is the
   * mouse-cursor aim direction in world space (computed in main.ts); the
   * right stick overrides it when deflected (twin-stick).
   */
  getIntent(
    forwardXZ: { x: number; z: number },
    rightXZ: { x: number; z: number },
    aimDir: { x: number; z: number },
  ): Intent {
    let strafe = 0;
    let forward = 0;

    for (const [code, [sx, sz]] of Object.entries(KEY_MOVE)) {
      if (this.keys.has(code)) {
        strafe += sx;
        forward += sz;
      }
    }

    const pad = this.firstGamepad();
    let aimX = aimDir.x;
    let aimZ = aimDir.z;
    if (pad) {
      strafe += applyDeadzone(pad.axes[0] ?? 0, LEFT_STICK_DEADZONE);
      forward -= applyDeadzone(pad.axes[1] ?? 0, LEFT_STICK_DEADZONE); // stick up = forward

      // Twin-stick aim: right stick (when not held for orbiting).
      const orbiting = pad.buttons[PAD_RS_CLICK]?.pressed ?? false;
      if (!orbiting) {
        const rx = applyDeadzone(pad.axes[2] ?? 0, AIM_STICK_DEADZONE);
        const ry = applyDeadzone(pad.axes[3] ?? 0, AIM_STICK_DEADZONE);
        const alen = Math.hypot(rx, ry);
        if (alen > 0) {
          aimX = rightXZ.x * rx + forwardXZ.x * -ry;
          aimZ = rightXZ.z * rx + forwardXZ.z * -ry;
          const l = Math.hypot(aimX, aimZ) || 1;
          aimX /= l;
          aimZ /= l;
        }
      }
    }

    const axes: MoveAxes = { strafe, forward };

    // Rebase camera-relative axes into world space.
    const jumpHeld = this.keys.has('Space') || (pad?.buttons[0]?.pressed ?? false);
    const jumpPressed = jumpHeld && !this.jumpPrev;
    this.jumpPrev = jumpHeld;

    const fireHeld = this.lmbDown || (pad?.buttons[PAD_FIRE_BUTTON]?.pressed ?? false);
    const punchDown = this.keys.has('KeyV') || (pad?.buttons[PAD_PUNCH_BUTTON]?.pressed ?? false);
    const punchPressed = punchDown && !this.punchPrev;
    this.punchPrev = punchDown;

    return {
      moveX: rightXZ.x * axes.strafe + forwardXZ.x * axes.forward,
      moveZ: rightXZ.z * axes.strafe + forwardXZ.z * axes.forward,
      jumpHeld,
      jumpPressed,
      fireHeld,
      punchPressed,
      aimX,
      aimZ,
    };
  }

  /** Last pointer position in client coordinates (for cursor aiming). */
  getPointer(): { x: number; y: number } {
    return { x: this.pointerX, y: this.pointerY };
  }

  /**
   * Sample camera controls (RMB-drag, wheel, right stick, snap toggles).
   * `dt` is the clamped frame delta.
   */
  getCameraInput(dt: number): CameraInput {
    let snapToggled = this.keyEdge('KeyT');
    let yawDelta = this.mouseDX * MOUSE_ORBIT_SENS;
    let zoomDelta = -this.wheel * 0.0015;

    const pad = this.firstGamepad();
    if (pad) {
      const orbiting = pad.buttons[PAD_RS_CLICK]?.pressed ?? false;
      if (orbiting) {
        const rx = applyDeadzone(pad.axes[2] ?? 0, RIGHT_STICK_DEADZONE);
        const ry = applyDeadzone(pad.axes[3] ?? 0, RIGHT_STICK_DEADZONE);
        yawDelta += rx * STICK_ORBIT_SPEED * dt;
        zoomDelta += -ry * 2.2 * dt;
      }
      const y = pad.buttons[PAD_SNAP_BUTTON]?.pressed ?? false;
      if (y && !this.padSnapPrev) snapToggled = true;
      this.padSnapPrev = y;
    }

    // Consume accumulated mouse/wheel deltas. mouseDY is tracked for M2 but unused now.
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;

    return { yawDelta, zoomDelta, snapToggled };
  }

  private edgeKeys = new Set<string>();

  /** True only on the frame a key transitions to pressed. */
  keyEdge(code: string): boolean {
    const down = this.keys.has(code);
    const wasDown = this.edgeKeys.has(code);
    if (down) this.edgeKeys.add(code);
    else this.edgeKeys.delete(code);
    return down && !wasDown;
  }

  /** True while the key is held. */
  keyDown(code: string): boolean {
    return this.keys.has(code);
  }

  private firstGamepad(): Gamepad | null {
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }
}
