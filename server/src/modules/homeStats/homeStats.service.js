const db = require("../../config/db");
const settingsService = require("../settings/settings.service");

const TURNAROUND_KEY = "turnaround_text";
const DEFAULT_TURNAROUND = "7-10";

// "Fulfilled" is approximated as "accepted" — the furthest state a quote
// reaches in this app (there's no shipping/production/delivery tracking
// anywhere), so it's the closest real proxy for a completed order.
async function ordersFulfilled() {
  const row = await db("quotes").where({ status: "accepted" }).count("* as count").first();
  return Number(row.count) || 0;
}

async function customDesignPercent() {
  const totalRow = await db("quotes").count("* as count").first();
  const total = Number(totalRow.count) || 0;
  if (total === 0) return 0;
  const customRow = await db("quotes").where({ customisable_snapshot: true }).count("* as count").first();
  const custom = Number(customRow.count) || 0;
  return Math.round((custom / total) * 100);
}

async function getHomeStats() {
  const [orders, customPercent, turnaroundText] = await Promise.all([
    ordersFulfilled(),
    customDesignPercent(),
    settingsService.getSetting(TURNAROUND_KEY, DEFAULT_TURNAROUND),
  ]);
  return { ordersFulfilled: orders, customDesignPercent: customPercent, turnaroundText };
}

async function setTurnaroundText(value) {
  if (!value || !value.trim()) throw new Error("Turnaround text is required.");
  return settingsService.setSetting(TURNAROUND_KEY, value.trim());
}

module.exports = { getHomeStats, setTurnaroundText };
