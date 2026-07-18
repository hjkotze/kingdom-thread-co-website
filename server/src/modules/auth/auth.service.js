const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../../config/db");

const SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_TTL_HOURS = 24;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function findUserByEmail(email) {
  return db("users").where({ email: normalizeEmail(email) }).first();
}

async function findUserById(id) {
  return db("users").where({ id }).first();
}

async function createUser({ email, password, fullName, phone, role = "customer", emailVerified = false }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [id] = await db("users").insert({
    email: normalizeEmail(email),
    password_hash: passwordHash,
    full_name: fullName,
    phone: phone || null,
    role,
    email_verified: emailVerified,
  });
  return findUserById(id);
}

async function deleteUser(id) {
  await db("users").where({ id }).del();
}

async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

// The raw token is emailed to the user and never stored — only its hash,
// same principle as password hashing (a DB read alone can't produce a
// working token).
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function generateVerificationToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000),
  };
}

async function setVerificationToken(userId, { hash, expiresAt }) {
  await db("users").where({ id: userId }).update({
    email_verification_token_hash: hash,
    email_verification_expires_at: expiresAt,
    email_verification_sent_at: new Date(),
  });
}

async function findUserByVerificationToken(rawToken) {
  return db("users").where({ email_verification_token_hash: hashToken(rawToken) }).first();
}

async function markEmailVerified(userId) {
  await db("users").where({ id: userId }).update({
    email_verified: true,
    email_verification_token_hash: null,
    email_verification_expires_at: null,
  });
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    role: user.role,
    emailVerified: Boolean(user.email_verified),
  };
}

module.exports = {
  normalizeEmail,
  findUserByEmail,
  findUserById,
  createUser,
  deleteUser,
  verifyPassword,
  generateVerificationToken,
  setVerificationToken,
  findUserByVerificationToken,
  markEmailVerified,
  toPublicUser,
};
