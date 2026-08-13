const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const sessionMiddleware = require("./middleware/session");
const errorHandler = require("./middleware/errorHandler");
const apiRoutes = require("./routes");
const { ensureInitialAdmin } = require("./lib/bootstrapAdmin");

const app = express();

// Fire-and-forget: creates INITIAL_ADMIN_EMAIL as an admin on first boot if
// no admin exists yet, then becomes permanently inert. Never blocks app
// startup or crashes it — see server/src/lib/bootstrapAdmin.js.
ensureInitialAdmin().catch((err) => console.error("Initial admin bootstrap failed:", err.message));

app.set("trust proxy", 1); // HostKing likely terminates TLS at a proxy in front of the app

app.use(
  cors({
    origin: (origin, callback) => callback(null, env.isAllowedOrigin(origin)),
    credentials: true,
  }),
);
app.use(express.json());
app.use(sessionMiddleware);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api", apiRoutes);

app.use(errorHandler);

module.exports = app;
