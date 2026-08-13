const heroImagesService = require("./heroImages.service");

async function listHeroImages(req, res, next) {
  try {
    res.json({ heroImages: await heroImagesService.getHeroImages() });
  } catch (err) {
    next(err);
  }
}

module.exports = { listHeroImages };
