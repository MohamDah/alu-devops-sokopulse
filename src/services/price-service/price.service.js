function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

const round1 = (n) => Math.round(n * 10) / 10;
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

function createPriceService(seed) {
  const prices = seed.map((p) => ({ ...p }));

  function withTrend(p) {
    const trendPercent = round1(((p.wholesalePrice - p.previousWholesalePrice) / p.previousWholesalePrice) * 100);
    return { ...p, trendPercent };
  }

  function listPrices({ commodity, market } = {}) {
    return prices
      .filter((p) => (!commodity || same(p.commodity, commodity)) && (!market || same(p.market, market)))
      .map(withTrend);
  }

  // Compares a commodity across markets: where to sell (highest) vs the cheapest market.
  function getArbitrage(commodity) {
    if (!commodity) throw httpError(400, 'commodity query parameter is required');
    const quotes = listPrices({ commodity }).sort((a, b) => b.wholesalePrice - a.wholesalePrice);
    if (quotes.length === 0) throw httpError(404, `No prices found for commodity "${commodity}"`);

    const best = quotes[0];
    const lowest = quotes[quotes.length - 1];
    const spread = best.wholesalePrice - lowest.wholesalePrice;
    return {
      commodity: best.commodity,
      currency: best.currency,
      bestMarketToSell: { market: best.market, wholesalePrice: best.wholesalePrice, trendPercent: best.trendPercent },
      lowestMarket: { market: lowest.market, wholesalePrice: lowest.wholesalePrice, trendPercent: lowest.trendPercent },
      spread,
      spreadPercent: round1((spread / lowest.wholesalePrice) * 100),
    };
  }

  return { listPrices, getArbitrage };
}

module.exports = { createPriceService };
