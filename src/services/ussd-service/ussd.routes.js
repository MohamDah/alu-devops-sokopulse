const express = require('express');

function createUssdRouter(service) {
  const router = express.Router();

  // POST /api/ussd  { "text": "1*2*3" }  ->  plain text starting with CON (continue) or END (final)
  router.post('/', (req, res) => {
    const { text } = req.body || {};
    res.type('text/plain').send(service.respond(text));
  });

  return router;
}

module.exports = { createUssdRouter };
