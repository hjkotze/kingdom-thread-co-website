const knex = require("knex");
const env = require("./env");

const db = knex({
  client: "mysql2",
  connection: {
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
  },
  // Small pool: each on-demand process handles a handful of concurrent
  // requests at most, and HostKing's MySQL likely caps total connections
  // across all sites on the account.
  pool: { min: 0, max: 5 },
});

module.exports = db;
