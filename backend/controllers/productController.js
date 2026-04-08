const productService = require("../services/productService");

async function list(req, res) {
  const data = await productService.listProducts(req.auth, req.query);
  res.json(data);
}

async function create(req, res) {
  const data = await productService.createProduct(req.auth, req.body);
  res.status(201).json({ data });
}

async function update(req, res) {
  const data = await productService.updateProduct(req.auth, req.params.productId, req.body);
  res.json({ data });
}

async function remove(req, res) {
  const data = await productService.deleteProduct(req.auth, req.params.productId);
  res.json({ data });
}

async function enableForCompany(req, res) {
  const data = await productService.enableProductForCompany(
    req.auth,
    req.params.companyId,
    req.params.productId
  );
  res.json({ data });
}

module.exports = {
  create,
  enableForCompany,
  list,
  remove,
  update,
};
