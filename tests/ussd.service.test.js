const { createUssdService } = require('../src/services/ussd-service/ussd.service');

// A stub price provider keeps this test independent of price-service.
const quotes = [
  { commodity: 'Maize', market: 'Kimironko-Kigali', wholesalePrice: 450, retailPrice: 560, trendPercent: 2.3 },
  { commodity: 'Maize', market: 'Musanze', wholesalePrice: 410, retailPrice: 520, trendPercent: -2.4 },
  { commodity: 'Rice', market: 'Huye', wholesalePrice: 1200, retailPrice: 1450, trendPercent: 0 },
];
const priceProvider = {
  listPrices: () => quotes,
  getArbitrage: (commodity) => ({
    commodity,
    bestMarketToSell: { market: 'Kimironko-Kigali', wholesalePrice: 450 },
    lowestMarket: { market: 'Musanze', wholesalePrice: 410 },
    spread: 40,
    spreadPercent: 9.8,
  }),
};
const ussd = createUssdService({ priceProvider });

describe('USSD menu', () => {
  test('empty text shows the main menu', () => {
    expect(ussd.respond('')).toMatch(/^CON SokoPulse \*182#\n1\. Market prices\n2\. Best market to sell/);
    expect(ussd.respond()).toMatch(/^CON/);
  });

  test('prices flow has 3 levels: menu -> crop -> market -> price', () => {
    expect(ussd.respond('1')).toBe('CON Select crop\n1. Maize\n2. Rice\n0. Exit');
    expect(ussd.respond('1*1')).toBe('CON Maize: select market\n1. Kimironko-Kigali\n2. Musanze\n0. Exit');
    const end = ussd.respond('1*1*2');
    expect(end).toMatch(/^END Maize at Musanze/);
    expect(end).toContain('Wholesale: 410 RWF/kg');
    expect(end).toContain('Retail: 520 RWF/kg');
    expect(end).toContain('Trend: -2.4%');
  });

  test('shows a plus sign for positive trends', () => {
    expect(ussd.respond('1*1*1')).toContain('Trend: +2.3%');
  });

  test('best market flow shows the arbitrage result', () => {
    const end = ussd.respond('2*1');
    expect(end).toMatch(/^END Best market for Maize: Kimironko-Kigali at 450 RWF\/kg/);
    expect(end).toContain('Spread: 40 RWF (9.8%)');
  });

  test('0 exits from any level', () => {
    expect(ussd.respond('0')).toMatch(/^END/);
    expect(ussd.respond('1*0')).toMatch(/^END/);
    expect(ussd.respond('1*1*0')).toMatch(/^END/);
  });

  test.each(['5', '1*9', '1*1*9', '1*1*1*1', '2*1*1'])('invalid choice %s ends the session', (text) => {
    expect(ussd.respond(text)).toMatch(/^END Invalid choice/);
  });

  test.each(['abc', '1**2', '*1', 5, '1'.repeat(51)])('rejects malformed text %p', (text) => {
    expect(() => ussd.respond(text)).toThrow('text must be');
  });

  test('every screen fits the 182 character USSD limit', () => {
    for (const text of ['', '1', '1*1', '1*1*1', '2*1', '5']) {
      expect(ussd.respond(text).length).toBeLessThanOrEqual(182);
    }
  });
});
