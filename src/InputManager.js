/**
 * InputManager — unified keyboard + touch-joystick input.
 *
 * Exports a single { x, y } direction in screen space:
 *   +x = screen right   −x = screen left
 *   +y = screen up      −y = screen down
 *
 * The Player module maps this to world XZ movement.
 */
export class InputManager {
  constructor() {
    /** @type {Record<string, boolean>} */
    this._keys = {};

    /** Normalised joystick direction, updated by pointer events */
    this._joy = { x: 0, y: 0, active: false };

    this._bindKeyboard();
    this._bindJoystick();
  }

  // ── Keyboard ────────────────────────────────────────────────────

  _bindKeyboard() {
    window.addEventListener('keydown', e => {
      this._keys[e.code] = true;
      // Prevent arrow keys from scrolling the page
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this._keys[e.code] = false; });
  }

  // ── Touch joystick ──────────────────────────────────────────────

  _bindJoystick() {
    const zone   = document.getElementById('joystick-zone');
    const handle = document.getElementById('joystick-handle');
    if (!zone || !handle) return;

    const RADIUS = 48; // pixels; handle clamps to this distance from centre
    let activeId  = null;
    let originX   = 0;
    let originY   = 0;

    zone.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (activeId !== null) return; // ignore second finger on zone

      activeId = e.pointerId;
      zone.setPointerCapture(e.pointerId);

      const r = zone.getBoundingClientRect();
      originX = r.left + r.width  / 2;
      originY = r.top  + r.height / 2;

      this._moveHandle(e.clientX, e.clientY, originX, originY, RADIUS, handle);
    });

    zone.addEventListener('pointermove', e => {
      e.preventDefault();
      if (e.pointerId !== activeId) return;
      this._moveHandle(e.clientX, e.clientY, originX, originY, RADIUS, handle);
    });

    const onEnd = e => {
      if (e.pointerId !== activeId) return;
      activeId = null;
      this._joy = { x: 0, y: 0, active: false };
      // Reset handle to centre
      handle.style.transform = 'translate(-50%, -50%)';
    };
    zone.addEventListener('pointerup',     onEnd);
    zone.addEventListener('pointercancel', onEnd);
  }

  /**
   * Move the visible handle and update the normalised joy state.
   */
  _moveHandle(clientX, clientY, originX, originY, radius, handle) {
    let dx = clientX - originX;
    let dy = clientY - originY; // positive = down in screen pixels

    const dist    = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, radius);

    if (dist > 0) {
      dx = (dx / dist) * clamped;
      dy = (dy / dist) * clamped;
    }

    this._joy = {
      x:  dx / radius,        // screen right +
      y: -dy / radius,        // flip: screen up = +y
      active: true,
    };

    handle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  // ── Public API ──────────────────────────────────────────────────

  /**
   * Returns a normalised screen-space direction { x, y }.
   * Both components in [-1, 1]; length ≤ 1.
   */
  getDirection() {
    if (this._joy.active) {
      return { x: this._joy.x, y: this._joy.y };
    }

    let x = 0;
    let y = 0;

    if (this._keys['KeyD'] || this._keys['ArrowRight']) x += 1;
    if (this._keys['KeyA'] || this._keys['ArrowLeft'])  x -= 1;
    if (this._keys['KeyW'] || this._keys['ArrowUp'])    y += 1;
    if (this._keys['KeyS'] || this._keys['ArrowDown'])  y -= 1;

    // Normalise diagonal (keyboard gives √2 length on diagonals)
    const len = Math.sqrt(x * x + y * y);
    if (len > 1) { x /= len; y /= len; }

    return { x, y };
  }

  /** True if any input is active this frame. */
  isActive() {
    const { x, y } = this.getDirection();
    return Math.abs(x) > 0.01 || Math.abs(y) > 0.01;
  }
}
