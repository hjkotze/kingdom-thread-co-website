const app = require("./app");
const env = require("./config/env");

app.listen(env.port, () => {
  console.log(`blankets-api listening on port ${env.port} (${env.nodeEnv})`);
});
