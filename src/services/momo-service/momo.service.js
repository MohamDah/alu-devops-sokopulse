const { randomUUID } = require('node:crypto');

// Simulated fee tiers in RWF (illustrative, not a real provider's tariff). The fee is deducted from the farmer's payout.
const FEE_TIERS = [
  { upTo: 5000, fee: 50 },
  { upTo: 50000, fee: 300 },
  { upTo: 500000, fee: 1500 },
  { upTo: Infinity, fee: 5000 },
];

// Deterministic outcomes: the caller chooses the scenario, so tests and demos are repeatable.
const SCENARIOS = {
  success: null,
  insufficient_funds: 'Buyer has insufficient funds (simulated).',
  pin_timeout: 'Buyer did not confirm the PIN prompt in time (simulated).',
};

// Rwandan numbers: 078x / 079x (MTN) and 072x / 073x (Airtel), also accepted as +250 or 250.
const MSISDN = /^(?:\+?250|0)(7[2389]\d{7})$/;

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function normalizePhone(value, label) {
  const match = typeof value === 'string' ? MSISDN.exec(value) : null;
  if (!match) throw httpError(400, `${label} must be a Rwandan number starting 078, 079, 072 or 073`);
  return `0${match[1]}`;
}

const mask = (phone) => `${phone.slice(0, 3)}****${phone.slice(-3)}`;
const isPositiveInt = (n) => Number.isSafeInteger(n) && n > 0;

function calculateFee(subtotal) {
  return FEE_TIERS.find((tier) => subtotal <= tier.upTo).fee;
}

function createMomoService() {
  const transactions = [];

  function pay({ buyerPhone, farmerPhone, commodity, quantityKg, pricePerKg, scenario = 'success' } = {}) {
    const buyer = normalizePhone(buyerPhone, 'buyerPhone');
    const farmer = normalizePhone(farmerPhone, 'farmerPhone');
    if (buyer === farmer) throw httpError(400, 'buyerPhone and farmerPhone must be different');
    if (typeof commodity !== 'string' || !commodity.trim() || commodity.length > 60) {
      throw httpError(400, 'commodity must be 1-60 characters');
    }
    if (!isPositiveInt(quantityKg) || !isPositiveInt(pricePerKg) || !Number.isSafeInteger(quantityKg * pricePerKg)) {
      throw httpError(400, 'quantityKg and pricePerKg must be positive whole numbers');
    }
    if (!Object.hasOwn(SCENARIOS, scenario)) {
      throw httpError(400, `scenario must be one of: ${Object.keys(SCENARIOS).join(', ')}`);
    }

    const subtotal = quantityKg * pricePerKg;
    const transactionFee = calculateFee(subtotal);
    const failureReason = SCENARIOS[scenario];
    const transaction = {
      reference: `SOKO-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: failureReason ? 'FAILED' : 'SUCCESSFUL',
      commodity: commodity.trim(),
      quantityKg,
      pricePerKg,
      currency: 'RWF',
      subtotal,
      transactionFee,
      netFarmerPayout: subtotal - transactionFee,
      buyerPhone: mask(buyer),
      farmerPhone: mask(farmer),
      failureReason,
      createdAt: new Date().toISOString(),
    };
    transactions.push(transaction);
    return { ...transaction };
  }

  function listTransactions() {
    return transactions.map((t) => ({ ...t })).reverse();
  }

  return { pay, listTransactions };
}

module.exports = { createMomoService, FEE_TIERS };
