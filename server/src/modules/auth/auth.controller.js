const authService = require("./auth.service");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function validateRegisterInput({ email, password, fullName }) {
  if (!email || !EMAIL_RE.test(email)) return "A valid email address is required.";
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!fullName || !fullName.trim()) return "Full name is required.";
  return null;
}

function establishSession(req, user) {
  req.session.userId = user.id;
  req.session.role = user.role;
}

// Customer self-registration. Admin accounts are never created through a
// public endpoint — see server/scripts/create-admin.js.
async function register(req, res, next) {
  try {
    const { email, password, fullName, phone } = req.body || {};
    const validationError = validateRegisterInput({ email, password, fullName });
    if (validationError) return res.status(400).json({ error: validationError });

    const existing = await authService.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const user = await authService.createUser({ email, password, fullName, phone, role: "customer" });
    establishSession(req, user);
    res.status(201).json({ user: authService.toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

function makeLogin(expectedRole) {
  return async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const user = await authService.findUserByEmail(email);
      // Same generic error whether the account doesn't exist, the password is
      // wrong, or the account exists but is the wrong role for this login
      // form — avoids leaking which of those is true (account enumeration,
      // and specifically avoids revealing "that's an admin account" to the
      // customer-facing login form and vice versa).
      const genericError = () => res.status(401).json({ error: "Invalid email or password." });

      if (!user || user.role !== expectedRole) return genericError();

      const passwordOk = await authService.verifyPassword(user, password);
      if (!passwordOk) return genericError();

      establishSession(req, user);
      res.json({ user: authService.toPublicUser(user) });
    } catch (err) {
      next(err);
    }
  };
}

async function logout(req, res, next) {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie("blankets.sid");
    res.status(204).end();
  });
}

async function me(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = await authService.findUserById(req.session.userId);
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.json({ user: authService.toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  loginCustomer: makeLogin("customer"),
  loginAdmin: makeLogin("admin"),
  logout,
  me,
};
