const db = require("../config/db");

// DB-backed — see auth_rate_limits migration for why this isn't an
// in-memory counter (express-rate-limit's default store, etc.).
async function recordAttempt(ipAddress, action) {
  await db("auth_rate_limits").insert({ ip_address: ipAddress || "unknown", action, created_at: new Date() });
}

async function countRecentAttempts(ipAddress, action, windowMinutes) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const row = await db("auth_rate_limits")
    .where({ ip_address: ipAddress || "unknown", action })
    .andWhere("created_at", ">", since)
    .count("* as count")
    .first();
  return Number(row.count);
}

// Express middleware factory: records every attempt (even ones that fail
// downstream validation, so retry-hammering still counts) and rejects with
// 429 once the limit is hit within the window.
function rateLimit(action, { max, windowMinutes }) {
  return async (req, res, next) => {
    try {
      const count = await countRecentAttempts(req.ip, action, windowMinutes);
      if (count >= max) {
        return res.status(429).json({ error: "Too many attempts. Please try again later." });
      }
      await recordAttempt(req.ip, action);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { rateLimit, countRecentAttempts, recordAttempt };
