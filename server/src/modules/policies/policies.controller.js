// Read-only, unauthenticated — reuses adminPolicies.service.js rather than
// duplicating the type-validation/lookup logic; this module just adds a
// public GET on top (writes stay admin-only, see adminPolicies.routes.js).
const service = require("../admin/adminPolicies.service");

async function getOne(req, res, next) {
  try {
    const policy = await service.getPolicy(req.params.type);
    res.json({ policy: service.policyRowToPublic(policy) });
  } catch (err) {
    if (err instanceof service.PolicyError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { getOne };
