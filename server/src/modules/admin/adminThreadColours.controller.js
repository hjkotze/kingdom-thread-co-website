const service = require("../threadColours/threadColours.service");

async function list(req, res, next) {
  try {
    res.json({ threadColours: await service.listThreadColoursForAdmin() });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const threadColour = await service.createThreadColour(req.body || {});
    res.status(201).json({ threadColour });
  } catch (err) {
    if (err instanceof service.ThreadColourError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const threadColour = await service.updateThreadColour(req.params.id, req.body || {});
    res.json({ threadColour });
  } catch (err) {
    if (err instanceof service.ThreadColourError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    await service.deleteThreadColour(req.params.id);
    res.status(204).end();
  } catch (err) {
    if (err instanceof service.ThreadColourError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { list, create, update, destroy };
