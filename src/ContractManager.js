/**
 * ContractManager — tracks run number and guard difficulty tier.
 *
 * Each completed sell run advances the contract tier: guards move
 * faster and suspicion accumulates more quickly. Market scandal-fatigue
 * accumulates separately in Market.js.
 *
 * Tier is capped at SENIOR — the game stays hard but not unreasonable.
 */

const STORAGE_KEY = 'integrity-contract-v1';

const TIERS = [
  { rank: 'PROBATIONARY', guardSpeed: 1.00, suspicionRate: 1.00 },
  { rank: 'ASSOCIATE',    guardSpeed: 1.15, suspicionRate: 1.25 },
  { rank: 'CONTRACTOR',   guardSpeed: 1.32, suspicionRate: 1.55 },
  { rank: 'SENIOR',       guardSpeed: 1.52, suspicionRate: 1.90 },
];

export class ContractManager {
  constructor() {
    this._load();
  }

  get run()         { return this._run; }
  get currentTier() { return TIERS[Math.min(this._run, TIERS.length - 1)]; }
  get nextTier()    { return TIERS[Math.min(this._run + 1, TIERS.length - 1)]; }
  get atMaxTier()   { return this._run >= TIERS.length - 1; }

  advance() {
    if (!this.atMaxTier) this._run++;
    this._save();
  }

  _load() {
    try {
      const d = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
      this._run = typeof d.run === 'number' ? d.run : 0;
    } catch {
      this._run = 0;
    }
  }

  _save() {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ run: this._run })); }
    catch { /* sessionStorage unavailable */ }
  }
}
