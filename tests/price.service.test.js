const seed = require('../src/data/seedMarkets');
const { createPriceService } = require('../src/services/price-service/price.service');

const service = createPriceService(seed);

describe('price service', () => {
  test('seed has 5 commodities across 4 markets in RWF', () => {
    const prices = service.listPrices();
    expect(prices).toHaveLength(20);
    expect(new Set(prices.map((p) => p.commodity)).size).toBe(5);
    expect(new Set(prices.map((p) => p.market)).size).toBe(4);
    expect(prices.every((p) => p.currency === 'RWF' && p.retailPrice >= p.wholesalePrice)).toBe(true);
  });

  test('filters by commodity and market, case-insensitively', () => {
    expect(service.listPrices({ commodity: 'maize' })).toHaveLength(4);
    expect(service.listPrices({ market: 'MUSANZE' })).toHaveLength(5);
    expect(service.listPrices({ commodity: 'Rice', market: 'Huye' })).toHaveLength(1);
    expect(service.listPrices({ commodity: 'Unknown' })).toEqual([]);
  });

  test('calculates trend percent against the previous price', () => {
    const custom = createPriceService([
      { commodity: 'A', market: 'X', wholesalePrice: 110, retailPrice: 120, previousWholesalePrice: 100 },
      { commodity: 'B', market: 'X', wholesalePrice: 90, retailPrice: 95, previousWholesalePrice: 100 },
    ]);
    expect(custom.listPrices({ commodity: 'A' })[0].trendPercent).toBe(10);
    expect(custom.listPrices({ commodity: 'B' })[0].trendPercent).toBe(-10);
  });

  test('arbitrage finds the best market, lowest market and spread', () => {
    const result = service.getArbitrage('Maize');
    expect(result.bestMarketToSell).toEqual(expect.objectContaining({ market: 'Kimironko-Kigali', wholesalePrice: 450 }));
    expect(result.lowestMarket).toEqual(expect.objectContaining({ market: 'Rubavu', wholesalePrice: 395 }));
    expect(result.spread).toBe(55);
    expect(result.spreadPercent).toBe(13.9);
  });

  test('arbitrage rejects missing and unknown commodities', () => {
    expect(() => service.getArbitrage()).toThrow('required');
    expect(() => service.getArbitrage('Gold')).toThrow('No prices found');
  });

  test('does not expose or mutate its internal store', () => {
    service.listPrices()[0].wholesalePrice = 1;
    expect(service.listPrices()[0].wholesalePrice).toBe(450);
  });
});
