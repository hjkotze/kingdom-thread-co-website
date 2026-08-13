const categoriesService = require("./categories.service");

async function listCategories(req, res, next) {
  try {
    res.json({ categories: await categoriesService.getCategories() });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories };
