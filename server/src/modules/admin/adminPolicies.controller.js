const service = require("./adminPolicies.service");

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

async function update(req, res, next) {
  try {
    const policy = await service.updatePolicy(req.params.type, req.body?.content);
    res.json({ policy: service.policyRowToPublic(policy) });
  } catch (err) {
    if (err instanceof service.PolicyError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = { getOne, update };
