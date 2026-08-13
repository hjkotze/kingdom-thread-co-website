const service = require("./homeStats.service");

async function getHomeStats(req, res, next) {
  try {
    res.json(await service.getHomeStats());
  } catch (err) {
    next(err);
  }
}

async function updateTurnaroundText(req, res, next) {
  try {
    const value = req.body?.value;
    if (!value || !value.trim()) {
      return res.status(400).json({ error: "Turnaround text is required." });
    }
    const turnaroundText = await service.setTurnaroundText(value);
    res.json({ turnaroundText });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHomeStats, updateTurnaroundText };
