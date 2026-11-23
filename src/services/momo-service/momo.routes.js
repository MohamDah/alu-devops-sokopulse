const express = require('express');

function createMomoRouter(service) {
  const router = express.Router();

  // POST /api/momo/pay  simulates a buyer-to-farmer payment (no real money moves)
  router.post('/pay', async (req, res, next) => {
    try {
      res.status(201).json(await service.payAndStore(req.body));
    } catch (err) {
      next(err);
    }
  });

  // GET /api/momo/transactions  newest first
  router.get('/transactions', async (req, res, next) => {
    try {
      res.json(await service.listTransactions());
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createMomoRouter };
