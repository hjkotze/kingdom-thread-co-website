const db = require("../../config/db");

async function getSetting(key, fallback = null) {
  const row = await db("site_settings").where({ key }).first();
  return row ? row.value : fallback;
}

async function setSetting(key, value) {
  await db("site_settings")
    .insert({ key, value, updated_at: new Date() })
    .onConflict("key")
    .merge({ value, updated_at: new Date() });
  return value;
}

module.exports = { getSetting, setSetting };
