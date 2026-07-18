const productsService = require("./products.service");

async function listCategories(req, res, next) {
  try {
    res.json({ categories: await productsService.getCategories() });
  } catch (err) {
    next(err);
  }
}

async function listProducts(req, res, next) {
  try {
    res.json({ products: await productsService.getProducts() });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await productsService.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories, listProducts, getProduct };
