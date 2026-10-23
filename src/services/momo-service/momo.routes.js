const express = require('express');

function createMomoRouter(service) {
  const router = express.Router();

  // POST /api/momo/pay  simulates a buyer-to-farmer payment (no real money moves)
  router.post('/pay', (req, res) => {
    res.status(201).json(service.pay(req.body));
  });

  // GET /api/momo/transactions  newest first
  router.get('/transactions', (req, res) => {
    res.json(service.listTransactions());
  });

  return router;
}

module.exports = { createMomoRouter };
