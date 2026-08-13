const service = require("../categories/categories.service");

async function list(req, res, next) {
  try {
    res.json({ categories: await service.listCategoriesForAdmin() });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const category = await service.getCategoryByIdForAdmin(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json({ category });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const category = await service.createCategory(req.body || {});
    res.status(201).json({ category });
  } catch (err) {
    if (err instanceof service.CategoryError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const category = await service.updateCategory(req.params.id, req.body || {});
    res.json({ category });
  } catch (err) {
    if (err instanceof service.CategoryError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    await service.deleteCategory(req.params.id);
    res.status(204).end();
  } catch (err) {
    if (err instanceof service.CategoryError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function uploadImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded." });
    const category = await service.setCategoryImage(req.params.id, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      buffer: req.file.buffer,
    });
    res.json({ category });
  } catch (err) {
    if (err instanceof service.CategoryError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { list, getOne, create, update, destroy, uploadImage };
