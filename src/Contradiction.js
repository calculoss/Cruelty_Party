/**
 * Contradiction — static data for all contradiction types.
 *
 * Each type represents a category of political hypocrisy.
 * The said/did text is deliberately fictional placeholder copy.
 * Real target roster and final flavour text is written in Phase 5.
 *
 * Colour palette references Australian party palettes (no real individuals).
 */

export const CType = Object.freeze({
  HOUSING:   'HOUSING',
  EXPENSES:  'EXPENSES',
  CLIMATE:   'CLIMATE',
  DONATIONS: 'DONATIONS',
});

/** @type {Record<string, { id, label, color, basePrice, said, did }>} */
export const CONTRADICTIONS = {

  [CType.HOUSING]: {
    id:        CType.HOUSING,
    label:     'Housing Affordability',
    color:     0xe84855,  // Labor-red
    basePrice: 1200,
    said: '"Making homes affordable for working Australians is this government\'s number one priority. Renters deserve security and dignity."',
    did:  'Purchased a seventh investment property while chairing the Housing Affordability Taskforce.',
  },

  [CType.EXPENSES]: {
    id:        CType.EXPENSES,
    label:     'Fiscal Responsibility',
    color:     0x3a7bd5,  // Liberal-blue
    basePrice: 850,
    said: '"The era of wasteful spending is over. Every taxpayer dollar will be rigorously justified."',
    did:  'Claimed $7,200 in travel expenses for a weekend function billed as a "regional infrastructure inspection."',
  },

  [CType.CLIMATE]: {
    id:        CType.CLIMATE,
    label:     'Climate Commitment',
    color:     0x00b4d8,  // Teal-independent
    basePrice: 1050,
    said: '"The science is unambiguous. Net-zero is not negotiable — we owe our children a liveable planet."',
    did:  'Holds approximately $280,000 in fossil fuel equities through a family discretionary trust.',
  },

  [CType.DONATIONS]: {
    id:        CType.DONATIONS,
    label:     'Donor Independence',
    color:     0x4caf50,  // Nationals-green
    basePrice: 1600,
    said: '"I have never, and will never, allow political donations to influence decisions I make in office."',
    did:  'Approved a coastal development rezoning seven weeks after accepting a $120,000 developer contribution.',
  },

};
