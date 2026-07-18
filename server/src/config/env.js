const path = require("path");

require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  frontendOrigins: (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),

  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "",
  },

  sessionSecret: process.env.NODE_ENV === "production"
    ? required("SESSION_SECRET")
    : process.env.SESSION_SECRET || "dev-only-insecure-secret",

  airtable: {
    apiKey: process.env.AIRTABLE_API_KEY || "",
    baseId: process.env.AIRTABLE_BASE_ID || "",
  },

  // Outside the web root on HostKing — never served by a static
  // middleware, only through the authenticated download endpoint.
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, "../../uploads"),
};
