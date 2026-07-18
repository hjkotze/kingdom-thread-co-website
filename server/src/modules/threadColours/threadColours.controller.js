const service = require("./threadColours.service");

async function listThreadColours(req, res, next) {
  try {
    res.json({ threadColours: await service.getThreadColours() });
  } catch (err) {
    next(err);
  }
}

module.exports = { listThreadColours };
