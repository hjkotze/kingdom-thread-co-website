const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../../config/db");
const { formatAddress } = require("../../lib/address");

const SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_TTL_HOURS = 24;
// Shorter than email verification — a password reset link is more
// sensitive (it's a bearer credential that grants account access, not
// just proof of email ownership), so it's given a tighter window.
const PASSWORD_RESET_TOKEN_TTL_HOURS = 1;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function findUserByEmail(email) {
  return db("users").where({ email: normalizeEmail(email) }).first();
}

async function findUserById(id) {
  return db("users").where({ id }).first();
}

async function createUser({ email, password, fullName, cellPhone, role = "customer", emailVerified = false }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [id] = await db("users").insert({
    email: normalizeEmail(email),
    password_hash: passwordHash,
    full_name: fullName,
    cell_phone: cellPhone || null,
    role,
    email_verified: emailVerified,
  });
  return findUserById(id);
}

// Self-service only — no admin code path touches these fields (address,
// cell phone, landline). Email/password/role are deliberately excluded
// here; they go through their own dedicated, more carefully-guarded flows.
async function updateProfile(
  userId,
  {
    fullName,
    addressLine1,
    addressComplex,
    addressSuburb,
    addressPostalCode,
    addressProvince,
    cellPhone,
    landlineAreaCode,
    landlineNumber,
    notifyOrderStatusChanges,
  },
) {
  await db("users").where({ id: userId }).update({
    full_name: fullName,
    address_line1: addressLine1 || null,
    address_complex: addressComplex || null,
    address_suburb: addressSuburb || null,
    address_postal_code: addressPostalCode || null,
    address_province: addressProvince || null,
    cell_phone: cellPhone || null,
    landline_area_code: landlineAreaCode || null,
    landline_number: landlineNumber || null,
    notify_order_status_changes: Boolean(notifyOrderStatusChanges),
    updated_at: new Date(),
  });
  return findUserById(userId);
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

function generateToken(ttlHours) {
  const raw = crypto.randomBytes(32).toString("hex");
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
  };
}

function generateVerificationToken() {
  return generateToken(VERIFICATION_TOKEN_TTL_HOURS);
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

function generatePasswordResetToken() {
  return generateToken(PASSWORD_RESET_TOKEN_TTL_HOURS);
}

async function setPasswordResetToken(userId, { hash, expiresAt }) {
  await db("users").where({ id: userId }).update({
    password_reset_token_hash: hash,
    password_reset_expires_at: expiresAt,
    password_reset_sent_at: new Date(),
  });
}

async function findUserByPasswordResetToken(rawToken) {
  return db("users").where({ password_reset_token_hash: hashToken(rawToken) }).first();
}

// Also marks the email verified — successfully completing a password
// reset is at least as strong a proof of inbox ownership as clicking a
// verification link, so an unverified account that resets its password
// shouldn't remain stuck unverified afterward.
async function resetPassword(userId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db("users").where({ id: userId }).update({
    password_hash: passwordHash,
    email_verified: true,
    password_reset_token_hash: null,
    password_reset_expires_at: null,
  });
}

// Logs out every active session for this account. The point of a
// password reset is usually "someone else might know my password", so
// completing one should end any session that was already logged in —
// the request that just reset the password is itself unauthenticated
// (it's authorized by the reset token, not a session) and gets a fresh
// session established afterward, so there's nothing to preserve here.
async function invalidateAllSessions(userId) {
  await db("sessions").whereRaw("JSON_EXTRACT(sess, '$.userId') = ?", [userId]).del();
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    cellPhone: user.cell_phone,
    landlineAreaCode: user.landline_area_code,
    landlineNumber: user.landline_number,
    addressLine1: user.address_line1,
    addressComplex: user.address_complex,
    addressSuburb: user.address_suburb,
    addressPostalCode: user.address_postal_code,
    addressProvince: user.address_province,
    address: formatAddress(user),
    notifyOrderStatusChanges: Boolean(user.notify_order_status_changes),
    role: user.role,
    emailVerified: Boolean(user.email_verified),
  };
}

module.exports = {
  normalizeEmail,
  findUserByEmail,
  findUserById,
  createUser,
  updateProfile,
  deleteUser,
  verifyPassword,
  generateVerificationToken,
  setVerificationToken,
  findUserByVerificationToken,
  markEmailVerified,
  generatePasswordResetToken,
  setPasswordResetToken,
  findUserByPasswordResetToken,
  resetPassword,
  invalidateAllSessions,
  toPublicUser,
};
