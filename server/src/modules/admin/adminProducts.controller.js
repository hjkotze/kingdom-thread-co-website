const service = require("../products/products.service");

async function list(req, res, next) {
  try {
    res.json({ products: await service.listProductsForAdmin() });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const product = await service.getProductByIdForAdmin(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const product = await service.createProduct(req.body || {});
    res.status(201).json({ product });
  } catch (err) {
    if (err instanceof service.ProductAdminError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const product = await service.updateProduct(req.params.id, req.body || {});
    res.json({ product });
  } catch (err) {
    if (err instanceof service.ProductAdminError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function destroy(req, res, next) {
  try {
    await service.deleteProduct(req.params.id);
    res.status(204).end();
  } catch (err) {
    if (err instanceof service.ProductAdminError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function addImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded." });
    const product = await service.addProductImage(req.params.id, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      buffer: req.file.buffer,
    });
    res.json({ product });
  } catch (err) {
    if (err instanceof service.ProductAdminError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function removeImage(req, res, next) {
  try {
    const product = await service.removeProductImage(req.params.id, req.params.attachmentId);
    res.json({ product });
  } catch (err) {
    if (err instanceof service.ProductAdminError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

async function reorderImages(req, res, next) {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order)) return res.status(400).json({ error: "order must be a list of image ids." });
    const product = await service.reorderProductImages(req.params.id, order);
    res.json({ product });
  } catch (err) {
    if (err instanceof service.ProductAdminError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { list, getOne, create, update, destroy, addImage, removeImage, reorderImages };
