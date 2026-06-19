/**
 * GameState — alert-level state machine and mission outcome tracker.
 *
 * Alert levels (driven by guard suspicion 0–1):
 *   CLEAR      suspicion < 0.12  — guards unaware
 *   SUSPICIOUS suspicion < 0.55  — guards have noticed something
 *   ALERTED    suspicion < 1.00  — guards actively searching
 *   CAUGHT     suspicion >= 1.0  — game over
 *
 * Mission outcomes:
 *   PLAYING → CAUGHT     if any guard reaches max suspicion
 *   PLAYING → COMPLETE   if player carries dossier to exit while ≤ SUSPICIOUS
 */

export const AlertLevel = Object.freeze({
  CLEAR:      0,
  SUSPICIOUS: 1,
  ALERTED:    2,
  CAUGHT:     3,
});

export const MissionState = Object.freeze({
  PLAYING:  'playing',
  CAUGHT:   'caught',
  COMPLETE: 'complete',
});

export class GameState {
  constructor() {
    this.alertLevel   = AlertLevel.CLEAR;
    this.missionState = MissionState.PLAYING;
    this.hasDossier   = false;

    // How long the player has been at max suspicion before CAUGHT is called
    this._caughtTimer = 0;
  }

  /**
   * Call once per frame.
   *
   * @param {number}  dt
   * @param {number}  maxSuspicion    0–1, max across all guards
   * @param {boolean} playerAtExit
   * @param {boolean} playerHasDossier
   */
  update(dt, maxSuspicion, playerAtExit, playerHasDossier) {
    if (this.missionState !== MissionState.PLAYING) return;

    this.hasDossier = playerHasDossier;

    // ── Alert level ──
    if (maxSuspicion >= 1.0) {
      this.alertLevel = AlertLevel.CAUGHT;
      this._caughtTimer += dt;
      // Brief hold before state transitions so the player sees the red cone
      if (this._caughtTimer >= 0.4) {
        this.missionState = MissionState.CAUGHT;
      }
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

    // ── Win condition: exit with dossier while not fully alerted ──
    if (playerAtExit && playerHasDossier && this.alertLevel <= AlertLevel.SUSPICIOUS) {
      this.missionState = MissionState.COMPLETE;
    }
  }

  get isPlaying()  { return this.missionState === MissionState.PLAYING;  }
  get isCaught()   { return this.missionState === MissionState.CAUGHT;   }
  get isComplete() { return this.missionState === MissionState.COMPLETE; }
}
