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

describe('config', () => {
  test('defaults to port 3000', () => {
    expect(loadConfig({})).toEqual({ port: 3000 });
    expect(loadConfig({ PORT: '8080' })).toEqual({ port: 8080 });
  });

  test.each(['0', '70000', 'abc', '1.5'])('rejects invalid PORT %s', (PORT) => {
    expect(() => loadConfig({ PORT })).toThrow('PORT');
  });
});
