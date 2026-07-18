const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const sessionMiddleware = require("./middleware/session");
const errorHandler = require("./middleware/errorHandler");
const apiRoutes = require("./routes");

const app = express();

app.set("trust proxy", 1); // HostKing likely terminates TLS at a proxy in front of the app

app.use(
  cors({
    origin: env.frontendOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(sessionMiddleware);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api", apiRoutes);

app.use(errorHandler);

module.exports = app;
