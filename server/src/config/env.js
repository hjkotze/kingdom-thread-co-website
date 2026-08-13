const path = require("path");

require("dotenv").config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const frontendOrigins = (process.env.FRONTEND_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Optional: a LAN subnet prefix (e.g. "192.168.2") to test devices — phones,
// tablets — from any host on that subnet without listing each device's IP
// individually. Off by default; only matters in development.
const lanSubnet = (process.env.FRONTEND_LAN_SUBNET || "").trim();
const lanOriginRegex = lanSubnet
  ? new RegExp(`^https?://${lanSubnet.replace(/\./g, "\\.")}\\.\\d{1,3}(:\\d+)?$`)
  : null;

function isAllowedOrigin(origin) {
  if (!origin) return true; // non-browser requests (curl, server-to-server) send no Origin header
  if (frontendOrigins.includes(origin)) return true;
  if (lanOriginRegex && lanOriginRegex.test(origin)) return true;
  return false;
}

module.exports = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  frontendOrigins,
  isAllowedOrigin,

  // Canonical URL used to build links in outbound emails (verification,
  // etc.) — the first FRONTEND_ORIGINS entry if not set explicitly.
  frontendUrl: process.env.FRONTEND_URL || frontendOrigins[0] || "http://localhost:5173",

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

  // Airtable — replaced by NocoDB (self-hosted) below. Kept commented out
  // rather than deleted in case of rollback.
  // airtable: {
  //   apiKey: process.env.AIRTABLE_API_KEY || "",
  //   baseId: process.env.AIRTABLE_BASE_ID || "",
  // },

  nocodb: {
    baseUrl: process.env.NOCODB_BASE_URL || "",
    apiToken: process.env.NOCODB_API_TOKEN || "",
    baseId: process.env.NOCODB_BASE_ID || "",
  },

  // Outside the web root on HostKing — never served by a static
  // middleware, only through the authenticated download endpoint.
  uploadsDir: process.env.UPLOADS_DIR || path.join(__dirname, "../../uploads"),

  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASSWORD || "",
  },

  imap: {
    host: process.env.IMAP_HOST || "",
    port: Number(process.env.IMAP_PORT) || 993,
    user: process.env.IMAP_USER || "",
    password: process.env.IMAP_PASSWORD || "",
  },

  // Where new-quote / new-reply notification emails are sent — the
  // person(s) actually running the company inbox. Defaults to the SMTP
  // mailbox itself if not set separately.
  companyNotificationEmail: process.env.COMPANY_NOTIFICATION_EMAIL || process.env.SMTP_USER || "",

  // Domain used to construct our own outbound Message-IDs
  // (<quote-123-abc123@mailDomain>). Derived from the SMTP user's domain
  // if not set explicitly.
  mailDomain: process.env.MAIL_DOMAIN || (process.env.SMTP_USER || "").split("@")[1] || "example.com",
};
