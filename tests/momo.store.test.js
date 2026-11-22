const {
  createInMemoryTransactionStore,
  createPostgresTransactionStore,
} = require('../src/services/momo-service/momo.store');

const transaction = {
  reference: 'SOKO-12345678',
  status: 'SUCCESSFUL',
  commodity: 'Red Beans',
  quantityKg: 25,
  pricePerKg: 1200,
  currency: 'RWF',
  subtotal: 30000,
  transactionFee: 300,
  netFarmerPayout: 29700,
  buyerPhone: '078****567',
  farmerPhone: '079****567',
  failureReason: null,
  createdAt: '2026-11-21T12:00:00.000Z',
};

describe('MoMo transaction stores', () => {
  test('memory store records and lists transactions newest first', async () => {
    const store = createInMemoryTransactionStore();
    await store.initialize();
    await store.add(transaction);
    await store.add({
      ...transaction,
      reference: 'SOKO-87654321',
      createdAt: '2026-11-21T13:00:00.000Z',
    });

    await expect(store.check()).resolves.toEqual({ status: 'ok', database: 'memory' });
    await expect(store.list()).resolves.toEqual([
      expect.objectContaining({ reference: 'SOKO-87654321' }),
      expect.objectContaining({ reference: 'SOKO-12345678' }),
    ]);
  });

  test('memory store lists later inserts first when timestamps are equal', async () => {
    const store = createInMemoryTransactionStore();
    await store.add(transaction);
    await store.add({ ...transaction, reference: 'SOKO-87654321' });

    await expect(store.list()).resolves.toEqual([
      expect.objectContaining({ reference: 'SOKO-87654321' }),
      expect.objectContaining({ reference: 'SOKO-12345678' }),
    ]);
  });

  test('PostgreSQL store requires a connection URL', () => {
    expect(() => createPostgresTransactionStore('postgres://example.invalid/sokopulse'))
      .not.toThrow();
  });
});
