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

async function uploadImage(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "No image uploaded." });
    const product = await service.setProductImage(req.params.id, {
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

module.exports = { list, getOne, create, update, destroy, uploadImage };
