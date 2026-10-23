const { createMomoService } = require('../src/services/momo-service/momo.service');

const trade = {
  buyerPhone: '0781234567',
  farmerPhone: '0791234567',
  commodity: 'Red Beans',
  quantityKg: 25,
  pricePerKg: 1200,
};

describe('MoMo service', () => {
  test('calculates subtotal, fee and net farmer payout in RWF', () => {
    const tx = createMomoService().pay(trade);
    expect(tx).toEqual(expect.objectContaining({
      status: 'SUCCESSFUL',
      currency: 'RWF',
      subtotal: 30000,
      transactionFee: 300,
      netFarmerPayout: 29700,
      failureReason: null,
    }));
  });

  test.each([
    [1, 5000, 50, 4950],
    [1, 5001, 300, 4701],
    [1, 50000, 300, 49700],
    [1, 50001, 1500, 48501],
    [1, 500000, 1500, 498500],
    [1, 500001, 5000, 495001],
  ])('fee tier boundaries: %i kg x %i RWF -> fee %i', (quantityKg, pricePerKg, fee, net) => {
    const tx = createMomoService().pay({ ...trade, quantityKg, pricePerKg });
    expect(tx.transactionFee).toBe(fee);
    expect(tx.netFarmerPayout).toBe(net);
  });

  test('returns a simulated reference ID and masks phone numbers', () => {
    const tx = createMomoService().pay(trade);
    expect(tx.reference).toMatch(/^SOKO-[0-9A-F]{8}$/);
    expect(tx.buyerPhone).toBe('078****567');
    expect(tx.farmerPhone).toBe('079****567');
    expect(JSON.stringify(tx)).not.toContain('1234567');
  });

  test.each([
    ['insufficient_funds', 'insufficient funds'],
    ['pin_timeout', 'PIN prompt'],
  ])('scenario %s fails deterministically', (scenario, reason) => {
    const tx = createMomoService().pay({ ...trade, scenario });
    expect(tx.status).toBe('FAILED');
    expect(tx.failureReason).toContain(reason);
  });

  test.each(['0781234567', '0791234567', '0721234567', '0731234567', '+250781234567', '250781234567'])(
    'accepts Rwandan number %s', (buyerPhone) => {
      expect(createMomoService().pay({ ...trade, buyerPhone, farmerPhone: '0791111111' }).status).toBe('SUCCESSFUL');
    },
  );

  test.each([undefined, '0711234567', '078123456', '07812345678', '+254712345678', 'abc', 781234567])(
    'rejects invalid phone %p', (buyerPhone) => {
      expect(() => createMomoService().pay({ ...trade, buyerPhone })).toThrow('buyerPhone');
    },
  );

  test('rejects the same buyer and farmer', () => {
    expect(() => createMomoService().pay({ ...trade, farmerPhone: '+250781234567' })).toThrow('different');
  });

  test.each([
    [{ commodity: '' }],
    [{ commodity: 5 }],
    [{ quantityKg: 0 }],
    [{ quantityKg: 1.5 }],
    [{ pricePerKg: -1 }],
    [{ pricePerKg: '1200' }],
    [{ quantityKg: 1e10, pricePerKg: 1e10 }],
    [{ scenario: 'chaos' }],
  ])('rejects invalid trade %j', (override) => {
    expect(() => createMomoService().pay({ ...trade, ...override })).toThrow();
  });

  test('rejects a missing body', () => {
    expect(() => createMomoService().pay()).toThrow('buyerPhone');
  });

  test('lists transactions newest first without exposing the internal store', () => {
    const service = createMomoService();
    const first = service.pay(trade);
    const second = service.pay({ ...trade, quantityKg: 1 });
    const list = service.listTransactions();
    expect(list.map((t) => t.reference)).toEqual([second.reference, first.reference]);
    list[0].status = 'TAMPERED';
    expect(service.listTransactions()[0].status).toBe('SUCCESSFUL');
  });
});
