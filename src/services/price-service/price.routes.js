const express = require('express');

function createPriceRouter(service) {
  const router = express.Router();

  // GET /api/prices?commodity=Maize&market=Musanze
  router.get('/', (req, res) => {
    res.json(service.listPrices(req.query));
  });

  // GET /api/prices/arbitrage?commodity=Maize
  router.get('/arbitrage', (req, res) => {
    res.json(service.getArbitrage(req.query.commodity));
  });

  return router;
}

module.exports = { createPriceRouter };
