/**
 * SellPanel — the Integrity Market transaction summary.
 *
 * Shown when the player reaches the exit with dossiers.
 * Displays an itemised sell breakdown including any fatigue-reduced prices,
 * so the player can see the scandal-fatigue mechanic in action.
 */
export class SellPanel {
  constructor() {
    this._el          = document.getElementById('sell-panel');
    this._elItems     = document.getElementById('sell-items');
    this._elRunTotal  = document.getElementById('sell-run-total');
    this._elBalance   = document.getElementById('sell-session-balance');
    this._btnContinue = document.getElementById('sell-continue');

    this._resolve = null;
    this._open    = false;

    this._btnContinue?.addEventListener('click', () => this._close());
  }

  /**
   * @param {ReturnType<import('./Market.js').Market['sellAll']>} breakdown
   * @param {number} sessionBalance  total balance after this sale
   * @returns {Promise<void>}
   */
  show(breakdown, sessionBalance) {
    return new Promise(resolve => {
      const runTotal = breakdown.reduce((s, r) => s + r.amount, 0);

      if (this._elItems) {
        this._elItems.innerHTML = breakdown.map(row => {
          const hex     = `#${row.color.toString(16).padStart(6, '0')}`;
          const tag     = row.fatiguedDown
            ? '<span class="fatigue-tag">↓ MARKET SATURATED</span>'
            : '';
          return `
            <div class="sell-row">
              <span class="sell-dot" style="background:${hex}"></span>
              <span class="sell-label">${row.label}</span>
              <span class="sell-amount ${row.fatiguedDown ? 'fatigued' : ''}">
                $${row.amount.toLocaleString()}${tag}
              </span>
            </div>`;
        }).join('');
      }

      if (this._elRunTotal) this._elRunTotal.textContent = `$${runTotal.toLocaleString()}`;
      if (this._elBalance)  this._elBalance.textContent  = `$${sessionBalance.toLocaleString()}`;

      this._el?.classList.remove('hidden');
      this._open    = true;
      this._resolve = resolve;
    });
  }

  _close() {
    this._el?.classList.add('hidden');
    this._open = false;
    this._resolve?.();
    this._resolve = null;
  }

  get isOpen() { return this._open; }
}
