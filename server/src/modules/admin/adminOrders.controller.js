const service = require("./adminOrders.service");
const ordersService = require("../orders/orders.service");

async function list(req, res, next) {
  try {
    const orders = await service.listOrders();
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const order = await ordersService.updateOrderStatus(req.params.id, req.body?.status);
    res.json({ order: ordersService.orderRowToPublic(order) });
  } catch (err) {
    if (err instanceof ordersService.OrderError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { list, updateStatus };
