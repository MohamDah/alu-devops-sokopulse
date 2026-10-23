const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const seedMarkets = require('./data/seedMarkets');
const { createPriceService } = require('./services/price-service/price.service');
const { createPriceRouter } = require('./services/price-service/price.routes');
const { createUssdService } = require('./services/ussd-service/ussd.service');
const { createUssdRouter } = require('./services/ussd-service/ussd.routes');
const { createMomoService } = require('./services/momo-service/momo.service');
const { createMomoRouter } = require('./services/momo-service/momo.routes');

function createApp() {
  const app = express();
  const priceService = createPriceService(seedMarkets);
  // The only link between the services: USSD reads prices through this small interface.
  const ussdService = createUssdService({
    priceProvider: {
      listPrices: (filters) => priceService.listPrices(filters),
      getArbitrage: (commodity) => priceService.getArbitrage(commodity),
    },
  });
  const momoService = createMomoService();

  // Local demo runs over plain HTTP, so don't force upgrades to HTTPS.
  app.use(helmet({
    contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } },
    strictTransportSecurity: false,
  }));
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/prices', createPriceRouter(priceService));
  app.use('/api/ussd', createUssdRouter(ussdService));
  app.use('/api/momo', createMomoRouter(momoService));

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
  });

  return app;
}

module.exports = { createApp };
