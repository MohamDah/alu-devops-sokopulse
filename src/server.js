require('dotenv').config({ quiet: true });
const { createApp } = require('./app');
const { loadConfig } = require('./config');

const { port } = loadConfig();

async function start() {
  const app = createApp();
  await app.locals.transactionStore.initialize();
  app.listen(port, () => {
    console.log(`SokoPulse running on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('SokoPulse failed to start:', err.message);
  process.exitCode = 1;
});
