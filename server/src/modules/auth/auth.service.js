const bcrypt = require("bcryptjs");
const db = require("../../config/db");

const SALT_ROUNDS = 12;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function findUserByEmail(email) {
  return db("users").where({ email: normalizeEmail(email) }).first();
}

async function findUserById(id) {
  return db("users").where({ id }).first();
}

async function createUser({ email, password, fullName, phone, role = "customer" }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const [id] = await db("users").insert({
    email: normalizeEmail(email),
    password_hash: passwordHash,
    full_name: fullName,
    phone: phone || null,
    role,
  });
  return findUserById(id);
}

async function verifyPassword(user, password) {
  return bcrypt.compare(password, user.password_hash);
}

function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    role: user.role,
  };
}

module.exports = {
  normalizeEmail,
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  toPublicUser,
};
