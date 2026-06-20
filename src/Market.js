import { CONTRADICTIONS } from './Contradiction.js';

/**
 * Market — the Integrity Market price engine.
 *
 * The satire mechanic lives here: each time a contradiction type is sold
 * the price decays by FATIGUE_RATE. The public stops being surprised.
 *
 *   effectivePrice = basePrice × FATIGUE_RATE ^ sellCount
 *
 * Sell counts persist within the browser session (sessionStorage) so
 * scandal fatigue carries across mission restarts — just like the real thing.
 */

const FATIGUE_RATE = 0.65;
const STORAGE_KEY  = 'integrity-market-sells';

export class Market {
  constructor() {
    this._sells   = this._load();
    this._balance = 0;
  }

  // ── Price queries ────────────────────────────────────────────────────────

  /** Current effective price for a type, after accumulated fatigue. */
  currentPrice(typeId) {
    const { basePrice } = CONTRADICTIONS[typeId];
    const count         = this._sells[typeId] ?? 0;
    return Math.round(basePrice * Math.pow(FATIGUE_RATE, count));
  }

  /**
   * Data for every type in display order.
   * @returns {{ id, label, color, price, basePrice, sells }[]}
   */
  getAllPrices() {
    return Object.values(CONTRADICTIONS).map(c => ({
      id:        c.id,
      label:     c.label,
      color:     c.color,
      price:     this.currentPrice(c.id),
      basePrice: c.basePrice,
      sells:     this._sells[c.id] ?? 0,
    }));
  }

  // ── Selling ──────────────────────────────────────────────────────────────

  /**
   * Sell one dossier of the given type. Updates fatigue and balance.
   * @returns {number} amount received
   */
  sell(typeId) {
    const amount        = this.currentPrice(typeId);
    this._sells[typeId] = (this._sells[typeId] ?? 0) + 1;
    this._balance      += amount;
    this._save();
    return amount;
  }

  /**
   * Sell a batch of dossiers (in array order) and return an itemised breakdown.
   * Prices reflect fatigue from earlier items in the same batch.
   *
   * @param {string[]} typeIds
   * @returns {{ typeId, label, amount, fatiguedDown }[]}
   */
  sellAll(typeIds) {
    return typeIds.map(typeId => {
      const priorSells  = this._sells[typeId] ?? 0;
      const amount      = this.sell(typeId);
      return {
        typeId,
        label:       CONTRADICTIONS[typeId].label,
        color:       CONTRADICTIONS[typeId].color,
        amount,
        fatiguedDown: priorSells > 0,
      };
    });
  }

  get balance() { return this._balance; }

  // ── Persistence ───────────────────────────────────────────────────────────

  _load() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}'); }
    catch { return {}; }
  }

  _save() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this._sells)); }
    catch { /* sessionStorage unavailable — silent */ }
  }
}
