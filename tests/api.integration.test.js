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

describe('config', () => {
  test('defaults to port 3000', () => {
    expect(loadConfig({})).toEqual({ port: 3000 });
    expect(loadConfig({ PORT: '8080' })).toEqual({ port: 8080 });
  });

  test.each(['0', '70000', 'abc', '1.5'])('rejects invalid PORT %s', (PORT) => {
    expect(() => loadConfig({ PORT })).toThrow('PORT');
  });
});
