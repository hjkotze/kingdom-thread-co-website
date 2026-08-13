const app = require("./app");
const env = require("./config/env");

app.listen(env.port, '0.0.0.0', () => {
  console.log(`blankets-api listening on port ${env.port} (${env.nodeEnv})`);
});
