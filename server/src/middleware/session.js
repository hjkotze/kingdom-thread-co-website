const session = require("express-session");
const { ConnectSessionKnexStore } = require("connect-session-knex");
const db = require("../config/db");
const env = require("../config/env");

const store = new ConnectSessionKnexStore({
  knex: db,
  tableName: "sessions",
  sidFieldName: "sid",
  createTable: false, // table is managed by our own migration
  cleanupInterval: 0, // 0 fully disables the store's internal setTimeout sweeper
});

// The store kicks off an async `hasTable` readiness check at construction
// time (store.ready) and never attaches a .catch to it internally. If the DB
// is briefly unreachable during process startup, that becomes an unhandled
// promise rejection, which crashes the whole process on modern Node — fatal
// for an on-demand host where every request can trigger a fresh boot.
// Requests made while the DB is down still fail correctly (get/set await
// store.ready and surface the error through express-session as normal); this
// just stops that first rejection from taking the process down.
store.ready.catch((err) => {
  console.error("Session store readiness check failed:", err.message);
});

// HostKing cannot run a persistent process, so we deliberately disable
// connect-session-knex's built-in expired-session sweeper (cleanupInterval:
// 0) rather than let it schedule its own timers. Expired-session cleanup
// instead happens via a cron-triggered script (added in a later phase), the
// same way email ingestion is cron-triggered rather than an in-process loop.

const sessionMiddleware = session({
  store,
  secret: env.sessionSecret,
  name: "blankets.sid",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
});

module.exports = sessionMiddleware;
