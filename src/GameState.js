/**
 * GameState — alert-level state machine.
 *
 * Handles only the stealth side: CLEAR → SUSPICIOUS → ALERTED → CAUGHT.
 * Mission completion is handled by the sell-panel flow in main.js.
 */

export const AlertLevel = Object.freeze({
  CLEAR:      0,
  SUSPICIOUS: 1,
  ALERTED:    2,
  CAUGHT:     3,
});

export class GameState {
  constructor() {
    this.alertLevel = AlertLevel.CLEAR;
    this._caught    = false;
    this._caughtTimer = 0;
  }

  /**
   * @param {number} dt
   * @param {number} maxSuspicion  0–1, max across all guards this frame
   */
  update(dt, maxSuspicion) {
    if (this._caught) return;

    if (maxSuspicion >= 1.0) {
      this.alertLevel = AlertLevel.CAUGHT;
      this._caughtTimer += dt;
      if (this._caughtTimer >= 0.4) this._caught = true;
    } else if (maxSuspicion >= 0.55) {
      this.alertLevel   = AlertLevel.ALERTED;
      this._caughtTimer = 0;
    } else if (maxSuspicion >= 0.12) {
      this.alertLevel   = AlertLevel.SUSPICIOUS;
      this._caughtTimer = 0;
    } else {
      this.alertLevel   = AlertLevel.CLEAR;
      this._caughtTimer = 0;
    }
  }

  reset() {
    this.alertLevel   = AlertLevel.CLEAR;
    this._caught      = false;
    this._caughtTimer = 0;
  }

  get isPlaying() { return !this._caught; }
  get isCaught()  { return this._caught;  }
}
