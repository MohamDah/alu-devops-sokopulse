const SERVICE_CODE = '*182#';
const MAIN_MENU = `CON SokoPulse ${SERVICE_CODE}\n1. Market prices\n2. Best market to sell\n0. Exit`;
const GOODBYE = 'END Thank you for using SokoPulse.';
const INVALID = `END Invalid choice. Dial ${SERVICE_CODE} to start again.`;

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

const menu = (title, items) => `CON ${title}\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}\n0. Exit`;
const pick = (list, choice) => list[Number(choice) - 1];

// The USSD gateway sends the whole path so far in `text` (e.g. "1*2*3"), so no server session is kept.
// Price data comes in through `priceProvider`, which keeps this service independent of price-service.
function createUssdService({ priceProvider }) {
  function respond(text = '') {
    if (typeof text !== 'string' || !/^(\d+(\*\d+)*)?$/.test(text) || text.length > 50) {
      throw httpError(400, 'text must be menu choices joined by "*", e.g. "1*2*3"');
    }
    if (text === '') return MAIN_MENU;

    const steps = text.split('*');
    if (steps.includes('0')) return GOODBYE;

    const [option, cropChoice, marketChoice] = steps;
    if ((option !== '1' && option !== '2') || steps.length > (option === '1' ? 3 : 2)) return INVALID;

    const quotes = priceProvider.listPrices();
    const crops = [...new Set(quotes.map((q) => q.commodity))];
    if (cropChoice === undefined) return menu('Select crop', crops);

    const crop = pick(crops, cropChoice);
    if (!crop) return INVALID;

    if (option === '2') {
      const a = priceProvider.getArbitrage(crop);
      return `END Best market for ${crop}: ${a.bestMarketToSell.market} at ${a.bestMarketToSell.wholesalePrice} RWF/kg.\n`
        + `Lowest: ${a.lowestMarket.market} ${a.lowestMarket.wholesalePrice}. Spread: ${a.spread} RWF (${a.spreadPercent}%).`;
    }

    const cropQuotes = quotes.filter((q) => q.commodity === crop);
    if (marketChoice === undefined) return menu(`${crop}: select market`, cropQuotes.map((q) => q.market));

    const quote = pick(cropQuotes, marketChoice);
    if (!quote) return INVALID;
    const sign = quote.trendPercent > 0 ? '+' : '';
    return `END ${crop} at ${quote.market}\nWholesale: ${quote.wholesalePrice} RWF/kg\n`
      + `Retail: ${quote.retailPrice} RWF/kg\nTrend: ${sign}${quote.trendPercent}%`;
  }

  return { respond };
}

module.exports = { createUssdService };
