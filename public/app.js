const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('en-US');

async function api(url, options) {
  const res = await fetch(url, options);
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json() : await res.text();
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

function cell(row, text) {
  const td = document.createElement('td');
  td.textContent = text;
  row.append(td);
}

// ---- Market prices ----
async function loadPrices() {
  const params = new URLSearchParams();
  if ($('commodity').value) params.set('commodity', $('commodity').value);
  if ($('market').value) params.set('market', $('market').value);
  const prices = await api(`/api/prices?${params}`);

  $('price-rows').replaceChildren(...prices.map((p) => {
    const row = document.createElement('tr');
    [p.commodity, p.market, fmt(p.wholesalePrice), fmt(p.retailPrice), `${p.trendPercent > 0 ? '+' : ''}${p.trendPercent}%`]
      .forEach((text) => cell(row, text));
    return row;
  }));

  if ($('commodity').value) {
    const a = await api(`/api/prices/arbitrage?commodity=${encodeURIComponent($('commodity').value)}`);
    $('arbitrage').textContent = `Best market to sell ${a.commodity}: ${a.bestMarketToSell.market} (${fmt(a.bestMarketToSell.wholesalePrice)} RWF/kg). `
      + `Lowest: ${a.lowestMarket.market}. Spread: ${fmt(a.spread)} RWF (${a.spreadPercent}%).`;
  } else {
    $('arbitrage').textContent = 'Select a commodity to see the best market to sell.';
  }
}

async function initFilters() {
  const prices = await api('/api/prices');
  for (const [id, key] of [['commodity', 'commodity'], ['market', 'market']]) {
    for (const value of new Set(prices.map((p) => p[key]))) $(id).add(new Option(value, value));
    $(id).addEventListener('change', () => loadPrices().catch(showPriceError));
  }
}

function showPriceError(err) {
  $('arbitrage').textContent = `Could not load prices: ${err.message}`;
}

// ---- USSD dialer ----
let ussdText = '';

function setUssdActive(active) {
  $('ussd-choice').disabled = !active;
  $('ussd-send').disabled = !active;
}

async function ussdRequest(text) {
  const screen = await api('/api/ussd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  ussdText = text;
  $('ussd-screen').textContent = screen;
  setUssdActive(screen.startsWith('CON'));
  $('ussd-choice').value = '';
  if (screen.startsWith('CON')) $('ussd-choice').focus();
}

$('ussd-dial').addEventListener('click', () => {
  ussdRequest('').catch((err) => { $('ussd-screen').textContent = err.message; });
});

$('ussd-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = [ussdText, $('ussd-choice').value.trim()].filter(Boolean).join('*');
  ussdRequest(text).catch((err) => { $('ussd-screen').textContent = err.message; });
});

// ---- MoMo payments ----
async function loadTransactions() {
  const transactions = await api('/api/momo/transactions');
  $('tx-rows').replaceChildren(...transactions.map((t) => {
    const row = document.createElement('tr');
    [t.reference, t.commodity, fmt(t.subtotal), fmt(t.transactionFee), fmt(t.netFarmerPayout), t.status]
      .forEach((text) => cell(row, text));
    return row;
  }));
}

$('pay-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.target);
  const payload = Object.fromEntries(form);
  payload.quantityKg = Number(payload.quantityKg);
  payload.pricePerKg = Number(payload.pricePerKg);

  $('pay-result').classList.remove('error');
  try {
    const tx = await api('/api/momo/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    $('pay-result').textContent = tx.status === 'SUCCESSFUL'
      ? `${tx.reference}: farmer receives ${fmt(tx.netFarmerPayout)} RWF (subtotal ${fmt(tx.subtotal)}, fee ${fmt(tx.transactionFee)}).`
      : `${tx.reference}: payment failed. ${tx.failureReason}`;
    await loadTransactions();
  } catch (err) {
    $('pay-result').classList.add('error');
    $('pay-result').textContent = err.message;
  }
});

initFilters().then(loadPrices).catch(showPriceError);
loadTransactions().catch(() => {});
