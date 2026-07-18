const env = require("../config/env");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.statusCode || 500).json({
    error: env.isProduction ? "Something went wrong." : err.message,
  });
}

module.exports = errorHandler;
