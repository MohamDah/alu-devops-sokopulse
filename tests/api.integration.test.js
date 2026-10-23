const request = require('supertest');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');

const app = createApp();

describe('app basics', () => {
  test('health check responds ok', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('unknown routes return 404 JSON', async () => {
    const res = await request(app).get('/api/nope').expect(404);
    expect(res.body.error).toBeDefined();
  });

  test('malformed JSON returns 400', async () => {
    await request(app).post('/api/anything').set('Content-Type', 'application/json').send('{oops').expect(400);
  });
});

describe('prices API', () => {
  test('GET /api/prices returns all quotes and supports filters', async () => {
    const all = await request(app).get('/api/prices').expect(200);
    expect(all.body).toHaveLength(20);
    const filtered = await request(app).get('/api/prices?commodity=Rice&market=Huye').expect(200);
    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0]).toEqual(expect.objectContaining({ commodity: 'Rice', market: 'Huye', currency: 'RWF' }));
  });

  test('GET /api/prices/arbitrage returns the best market and spread', async () => {
    const res = await request(app).get('/api/prices/arbitrage?commodity=Maize').expect(200);
    expect(res.body.bestMarketToSell.market).toBe('Kimironko-Kigali');
    expect(res.body.spread).toBe(55);
  });

  test('GET /api/prices/arbitrage validates the commodity', async () => {
    await request(app).get('/api/prices/arbitrage').expect(400);
    await request(app).get('/api/prices/arbitrage?commodity=Gold').expect(404);
  });
});

describe('USSD API', () => {
  test('walks the *182# menu from main menu to a live price', async () => {
    const main = await request(app).post('/api/ussd').send({ text: '' }).expect(200).expect('Content-Type', /text\/plain/);
    expect(main.text).toMatch(/^CON/);
    const crops = await request(app).post('/api/ussd').send({ text: '1' }).expect(200);
    expect(crops.text).toContain('1. Maize');
    const markets = await request(app).post('/api/ussd').send({ text: '1*1' }).expect(200);
    expect(markets.text).toContain('Kimironko-Kigali');
    const price = await request(app).post('/api/ussd').send({ text: '1*1*1' }).expect(200);
    expect(price.text).toMatch(/^END Maize at Kimironko-Kigali\nWholesale: 450 RWF\/kg/);
  });

  test('accepts form-encoded requests like a real USSD gateway', async () => {
    const res = await request(app).post('/api/ussd').type('form').send({ text: '2*1' }).expect(200);
    expect(res.text).toMatch(/^END Best market for Maize/);
  });

  test('rejects malformed text and treats a missing body as the main menu', async () => {
    await request(app).post('/api/ussd').send({ text: 'abc' }).expect(400);
    const res = await request(app).post('/api/ussd').expect(200);
    expect(res.text).toMatch(/^CON/);
  });
});

describe('MoMo API', () => {
  const trade = { buyerPhone: '0781234567', farmerPhone: '0791234567', commodity: 'Red Beans', quantityKg: 25, pricePerKg: 1200 };

  test('POST /api/momo/pay simulates a payment with fee and net payout', async () => {
    const res = await request(app).post('/api/momo/pay').send(trade).expect(201);
    expect(res.body).toEqual(expect.objectContaining({
      status: 'SUCCESSFUL', subtotal: 30000, transactionFee: 300, netFarmerPayout: 29700, currency: 'RWF',
    }));
    expect(res.body.reference).toMatch(/^SOKO-/);
  });

  test('failure scenarios are deterministic and still recorded', async () => {
    const res = await request(app).post('/api/momo/pay').send({ ...trade, scenario: 'insufficient_funds' }).expect(201);
    expect(res.body.status).toBe('FAILED');
  });

  test('validates input with 400 and does not record the attempt', async () => {
    const isolated = createApp();
    await request(isolated).post('/api/momo/pay').send({ ...trade, buyerPhone: '0711234567' }).expect(400);
    await request(isolated).post('/api/momo/pay').expect(400);
    const list = await request(isolated).get('/api/momo/transactions').expect(200);
    expect(list.body).toEqual([]);
  });

  test('GET /api/momo/transactions lists payments newest first', async () => {
    const isolated = createApp();
    const first = await request(isolated).post('/api/momo/pay').send(trade);
    const second = await request(isolated).post('/api/momo/pay').send({ ...trade, quantityKg: 1 });
    const list = await request(isolated).get('/api/momo/transactions').expect(200);
    expect(list.body.map((t) => t.reference)).toEqual([second.body.reference, first.body.reference]);
  });
  test('unexpected errors return a safe 500 without leaking details', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Date.prototype, 'toISOString').mockImplementationOnce(() => { throw new Error('secret internals'); });
    const res = await request(createApp()).post('/api/momo/pay').send(trade).expect(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
    expect(consoleError).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

describe('dashboard', () => {
  test('serves the static dashboard files', async () => {
    const page = await request(app).get('/').expect(200).expect('Content-Type', /html/);
    expect(page.text).toContain('SokoPulse');
    await request(app).get('/styles.css').expect(200).expect('Content-Type', /css/);
    await request(app).get('/app.js').expect(200).expect('Content-Type', /javascript/);
  });
});

describe('config', () => {
  test('defaults to port 3000', () => {
    expect(loadConfig({})).toEqual({ port: 3000 });
    expect(loadConfig({ PORT: '8080' })).toEqual({ port: 8080 });
  });

  test.each(['0', '70000', 'abc', '1.5'])('rejects invalid PORT %s', (PORT) => {
    expect(() => loadConfig({ PORT })).toThrow('PORT');
  });
});
