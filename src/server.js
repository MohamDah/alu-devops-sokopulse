require('dotenv').config({ quiet: true });
const { createApp } = require('./app');
const { loadConfig } = require('./config');

const { port } = loadConfig();
createApp().listen(port, () => {
  console.log(`SokoPulse running on http://localhost:${port}`);
});
