const db = require("../../config/db");

const VALID_TYPES = ["privacy", "cookies"];

class PolicyError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

function assertValidType(type) {
  if (!VALID_TYPES.includes(type)) throw new PolicyError("Invalid policy type.", 400);
}

// Both rows are seeded by the create-table migration, so this is always a
// simple lookup, never an upsert-on-read — see
// 20260725100001_create_policies_table.js.
async function getPolicy(type) {
  assertValidType(type);
  return db("policies").where({ type }).first();
}

async function updatePolicy(type, content) {
  assertValidType(type);
  await db("policies").where({ type }).update({ content: content || null, updated_at: new Date() });
  return getPolicy(type);
}

function policyRowToPublic(row) {
  return { type: row.type, content: row.content, updatedAt: row.updated_at };
}

module.exports = { PolicyError, getPolicy, updatePolicy, policyRowToPublic };
