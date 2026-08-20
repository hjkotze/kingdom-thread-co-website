// First-deploy convenience: creates a single admin account from env vars,
// but only when the users table has zero admins. Once any admin exists —
// whether created this way or via `npm run create-admin` — this becomes a
// permanent no-op, even if INITIAL_ADMIN_EMAIL/PASSWORD are left set. That
// makes it safe to leave configured; it can never reset an existing admin's
// password or run twice.
const authService = require("../modules/auth/auth.service");
const db = require("../config/db");
const { MIN_PASSWORD_LENGTH } = require("./passwordPolicy");

async function ensureInitialAdmin() {
  const email = process.env.INITIAL_ADMIN_EMAIL;
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const fullName = process.env.INITIAL_ADMIN_NAME || "Admin";

  if (!email || !password) return; // not configured — nothing to do

  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `INITIAL_ADMIN_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters — skipping initial admin bootstrap.`,
    );
    return;
  }

  const { count } = await db("users").where({ role: "admin" }).count("* as count").first();
  if (Number(count) > 0) return; // an admin already exists — never touch it

  const existing = await authService.findUserByEmail(email);
  if (existing) {
    console.warn(
      `INITIAL_ADMIN_EMAIL (${email}) is already registered as a ${existing.role} account — skipping initial admin bootstrap.`,
    );
    return;
  }

  const user = await authService.createUser({
    email,
    password,
    fullName,
    role: "admin",
    emailVerified: true,
  });
  console.log(
    `Bootstrapped initial admin account #${user.id} (${user.email}). ` +
      "You can remove INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD from the environment now — they have no further effect once an admin exists.",
  );
}

module.exports = { ensureInitialAdmin };
