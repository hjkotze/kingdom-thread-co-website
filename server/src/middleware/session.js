const session = require("express-session");
const { ConnectSessionKnexStore } = require("connect-session-knex");
const db = require("../config/db");
const env = require("../config/env");

// Two independent stores against the same underlying `sessions` table —
// only the cookie/session-id namespace differs. Sharing one session (as a
// single global instance previously did) meant logging into the admin
// panel in one browser tab silently overwrote the session cookie for any
// customer tab open in the same browser (and vice versa), since both
// wrote to the same "blankets.sid" cookie — the other tab would keep
// rendering its now-stale AuthContext.user while the server authenticated
// it as the other account, producing spurious 404s/empty lists until a
// fresh login resynced things. See auth.controller.js#establishSession —
// both admin and customer login share that function, but now write to
// whichever req.session this router attaches.
function makeSessionMiddleware(cookieName) {
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
    console.error(`Session store readiness check failed (${cookieName}):`, err.message);
  });

  return session({
    store,
    secret: env.sessionSecret,
    name: cookieName,
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
}

// HostKing cannot run a persistent process, so we deliberately disable
// connect-session-knex's built-in expired-session sweeper (cleanupInterval:
// 0) rather than let it schedule its own timers. Expired-session cleanup
// instead happens via a cron-triggered script (added in a later phase), the
// same way email ingestion is cron-triggered rather than an in-process loop.

const customerSession = makeSessionMiddleware("blankets.sid");
const adminSession = makeSessionMiddleware("blankets.admin.sid");

// Dispatches to exactly one of the two session middlewares based on path,
// so req.session is only ever attached once per request. Stamps
// req.sessionCookieName so auth.controller.js#logout can clear the right
// cookie regardless of which login path established it.
module.exports = function sessionRouter(req, res, next) {
  const isAdmin = req.path.startsWith("/api/admin");
  req.sessionCookieName = isAdmin ? "blankets.admin.sid" : "blankets.sid";
  return (isAdmin ? adminSession : customerSession)(req, res, next);
};
