const { Pool } = require('pg');

function createInMemoryTransactionStore() {
  const transactions = [];

  return {
    async initialize() {},
    async add(transaction) {
      transactions.push(transaction);
    },
    async list() {
      return transactions
        .map((transaction, index) => ({ transaction, index }))
        .sort((a, b) => (
          new Date(b.transaction.createdAt) - new Date(a.transaction.createdAt)
          || b.index - a.index
        ))
        .map(({ transaction }) => transaction);
    },
    async check() {
      return { status: 'ok', database: 'memory' };
    },
    async close() {},
  };
}

function createPostgresTransactionStore(databaseUrl) {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: true },
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL connection error:', err.message);
  });

  return {
    async initialize() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS momo_transactions (
          reference TEXT PRIMARY KEY,
          status TEXT NOT NULL,
          commodity TEXT NOT NULL,
          quantity_kg INTEGER NOT NULL,
          price_per_kg INTEGER NOT NULL,
          currency TEXT NOT NULL,
          subtotal INTEGER NOT NULL,
          transaction_fee INTEGER NOT NULL,
          net_farmer_payout INTEGER NOT NULL,
          buyer_phone TEXT NOT NULL,
          farmer_phone TEXT NOT NULL,
          failure_reason TEXT,
          created_at TIMESTAMPTZ NOT NULL
        )
      `);
    },
    async add(transaction) {
      await pool.query(
        `INSERT INTO momo_transactions (
          reference, status, commodity, quantity_kg, price_per_kg, currency,
          subtotal, transaction_fee, net_farmer_payout, buyer_phone,
          farmer_phone, failure_reason, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (reference) DO NOTHING`,
        [
          transaction.reference,
          transaction.status,
          transaction.commodity,
          transaction.quantityKg,
          transaction.pricePerKg,
          transaction.currency,
          transaction.subtotal,
          transaction.transactionFee,
          transaction.netFarmerPayout,
          transaction.buyerPhone,
          transaction.farmerPhone,
          transaction.failureReason,
          transaction.createdAt,
        ],
      );
    },
    async list() {
      const result = await pool.query(
        `SELECT reference, status, commodity, quantity_kg AS "quantityKg",
          price_per_kg AS "pricePerKg", currency, subtotal,
          transaction_fee AS "transactionFee",
          net_farmer_payout AS "netFarmerPayout",
          buyer_phone AS "buyerPhone", farmer_phone AS "farmerPhone",
          failure_reason AS "failureReason", created_at AS "createdAt"
         FROM momo_transactions
         ORDER BY created_at DESC`,
      );
      return result.rows;
    },
    async check() {
      await pool.query('SELECT 1');
      return { status: 'ok', database: 'postgres' };
    },
    async close() {
      await pool.end();
    },
  };
}

module.exports = {
  createInMemoryTransactionStore,
  createPostgresTransactionStore,
};
