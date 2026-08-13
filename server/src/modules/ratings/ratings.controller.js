const service = require("./ratings.service");

async function getSummary(req, res, next) {
  try {
    res.json({ rating: await service.getRatingSummary(req.params.id) });
  } catch (err) {
    next(err);
  }
}

async function getMine(req, res, next) {
  try {
    const rating = await service.getMyRating(req.session.userId, req.params.id);
    res.json({ rating });
  } catch (err) {
    next(err);
  }
}

async function submit(req, res, next) {
  try {
    const rating = await service.submitRating(req.session.userId, req.params.id, req.body?.rating);
    res.status(201).json({ rating });
  } catch (err) {
    if (err instanceof service.RatingError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { getSummary, getMine, submit };
