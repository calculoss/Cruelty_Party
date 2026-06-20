import { CONTRADICTIONS } from './Contradiction.js';

/**
 * HarvestModal — the harvest moment.
 *
 * The centrepiece of the satire: shows the SAID quote against the DID
 * reality the player just extracted. Snapping two things together.
 *
 * Usage:
 *   const resolved = await harvestModal.show('HOUSING', market);
 *   // resolves once player clicks SECURE DOSSIER
 */
export class HarvestModal {
  constructor() {
    this._el         = document.getElementById('harvest-modal');
    this._card       = document.getElementById('harvest-card');
    this._elType     = document.getElementById('harvest-type');
    this._elSaid     = document.getElementById('harvest-said');
    this._elDid      = document.getElementById('harvest-did');
    this._elValue    = document.getElementById('harvest-value');
    this._btnSecure  = document.getElementById('harvest-secure');

    this._resolve = null;
    this._open    = false;

    this._btnSecure?.addEventListener('click', () => this._close());
    // Tapping the dark backdrop also closes (so accidental taps outside card don't trap the player)
    this._el?.addEventListener('click', e => {
      if (e.target === this._el) this._close();
    });
  }

  /**
   * Show the contradiction card for a given type.
   * @param {string} typeId  one of CType.*
   * @param {import('./Market.js').Market} market
   * @returns {Promise<void>} resolves when player clicks SECURE
   */
  show(typeId, market) {
    return new Promise(resolve => {
      const data  = CONTRADICTIONS[typeId];
      const price = market.currentPrice(typeId);

      if (this._elType)  this._elType.textContent  = data.label.toUpperCase();
      if (this._elSaid)  this._elSaid.textContent  = data.said;
      if (this._elDid)   this._elDid.textContent   = data.did;
      if (this._elValue) this._elValue.textContent = `$${price.toLocaleString()}`;

      // Colour the type label to match the contradiction's party palette
      if (this._elType) {
        this._elType.style.color = `#${data.color.toString(16).padStart(6, '0')}`;
      }

      this._el?.classList.remove('hidden');
      // Trigger enter animation on next paint
      requestAnimationFrame(() => this._card?.classList.add('visible'));

      this._resolve = resolve;
      this._open    = true;
    });
  }

  _close() {
    this._card?.classList.remove('visible');
    // Wait for CSS exit transition before hiding
    setTimeout(() => {
      this._el?.classList.add('hidden');
      this._open = false;
      this._resolve?.();
      this._resolve = null;
    }, 220);
  }

  get isOpen() { return this._open; }
}
