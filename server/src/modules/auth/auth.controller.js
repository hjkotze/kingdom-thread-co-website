const authService = require("./auth.service");
const mailer = require("../../lib/mailer");
const emailTemplates = require("../../lib/emailTemplates");
const env = require("../../config/env");
const { PROVINCES } = require("../../lib/address");
const { MIN_PASSWORD_LENGTH } = require("../../lib/passwordPolicy");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_MINUTES = 2;
const RESET_COOLDOWN_MINUTES = 2;

const CELL_PHONE_RE = /^\d{10}$/;
const LANDLINE_AREA_CODE_RE = /^\d{3}$/;
const LANDLINE_NUMBER_RE = /^\d{7}$/;

function validateRegisterInput({ email, password, fullName }) {
  if (!email || !EMAIL_RE.test(email)) return "A valid email address is required.";
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!fullName || !fullName.trim()) return "Full name is required.";
  return null;
}

// Every field optional (landline as a pair — either both parts or
// neither), but whatever is provided must be in the right shape. Shared
// by registration and profile updates, the only two places phone numbers
// are ever written.
function validatePhoneFields({ cellPhone, landlineAreaCode, landlineNumber }) {
  if (cellPhone && !CELL_PHONE_RE.test(cellPhone)) {
    return "Cell phone number must be exactly 10 digits.";
  }
  const hasAreaCode = Boolean(landlineAreaCode);
  const hasNumber = Boolean(landlineNumber);
  if (hasAreaCode !== hasNumber) {
    return "Please provide both the landline area code and number, or leave both blank.";
  }
  if (hasAreaCode && !LANDLINE_AREA_CODE_RE.test(landlineAreaCode)) {
    return "Landline area code must be exactly 3 digits.";
  }
  if (hasNumber && !LANDLINE_NUMBER_RE.test(landlineNumber)) {
    return "Landline number must be exactly 7 digits.";
  }
  return null;
}

// Street/suburb/postal code/province must arrive together or not at all
// (complex is independently optional either way) — same both-or-neither
// shape as the landline validator above, and for the same reason: a half
// -entered address is worse than none, since it'd otherwise pass the
// orders.service.js "has an address" check with unusable data.
function validateAddressFields({ addressLine1, addressSuburb, addressPostalCode, addressProvince }) {
  const provided = [addressLine1, addressSuburb, addressPostalCode, addressProvince];
  const anyProvided = provided.some((v) => v && v.trim());
  if (!anyProvided) return null;
  const allProvided = provided.every((v) => v && v.trim());
  if (!allProvided) {
    return "Please fill in street, suburb, postal code, and province, or leave the address blank.";
  }
  if (!PROVINCES.includes(addressProvince)) return "Invalid province.";
  return null;
}

function establishSession(req, user) {
  req.session.userId = user.id;
  req.session.role = user.role;
}

async function sendVerificationEmail(user) {
  const { raw, hash, expiresAt } = authService.generateVerificationToken();
  await authService.setVerificationToken(user.id, { hash, expiresAt });
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${raw}`;
  const { subject, text } = emailTemplates.verificationEmail(user, verifyUrl);
  await mailer.sendMail({ to: user.email, subject, text });
}

// Customer self-registration. Admin accounts are never created through a
// public endpoint — see server/scripts/create-admin.js. Deliberately does
// NOT establish a session: an unverified account can't be used for
// anything until the link in the verification email is clicked.
async function register(req, res, next) {
  try {
    const { email, password, fullName, cellPhone } = req.body || {};
    const validationError = validateRegisterInput({ email, password, fullName });
    if (validationError) return res.status(400).json({ error: validationError });
    const phoneError = validatePhoneFields({ cellPhone });
    if (phoneError) return res.status(400).json({ error: phoneError });

    const existing = await authService.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const user = await authService.createUser({ email, password, fullName, cellPhone, role: "customer" });

    try {
      await sendVerificationEmail(user);
    } catch (err) {
      // Sending the verification email is the whole point of this account
      // existing right now — an unverified, unverifiable row left behind
      // would just be dead weight, so undo the creation rather than leave
      // it stranded.
      await authService.deleteUser(user.id);
      console.error(`Failed to send verification email to ${user.email}:`, err.message);
      return res.status(502).json({ error: "Couldn't send the verification email. Please try again." });
    }

    res.status(201).json({ message: "Check your email to verify your account before logging in.", email: user.email });
  } catch (err) {
    next(err);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: "Missing verification token." });

    const user = await authService.findUserByVerificationToken(token);
    if (!user) return res.status(400).json({ error: "Invalid or expired verification link." });
    if (user.email_verified) {
      // Already verified (e.g. link clicked twice) — treat as success
      // rather than an error, and still log them in.
      establishSession(req, user);
      return res.json({ user: authService.toPublicUser(user) });
    }
    if (new Date(user.email_verification_expires_at) < new Date()) {
      return res.status(400).json({ error: "This verification link has expired. Request a new one." });
    }

    await authService.markEmailVerified(user.id);
    establishSession(req, user);
    res.json({ user: authService.toPublicUser({ ...user, email_verified: true }) });
  } catch (err) {
    next(err);
  }
}

async function resendVerification(req, res, next) {
  try {
    const { email } = req.body || {};
    // Same generic response regardless of what's actually true — doesn't
    // reveal whether an account exists for this email (account
    // enumeration).
    const genericResponse = () =>
      res.json({ message: "If an account exists for this email and isn't verified yet, we've sent a new link." });

    if (!email) return genericResponse();
    const user = await authService.findUserByEmail(email);
    if (!user || user.email_verified) return genericResponse();

    if (user.email_verification_sent_at) {
      const elapsedMinutes = (Date.now() - new Date(user.email_verification_sent_at).getTime()) / (60 * 1000);
      if (elapsedMinutes < RESEND_COOLDOWN_MINUTES) return genericResponse();
    }

    await sendVerificationEmail(user).catch((err) => {
      console.error(`Failed to resend verification email to ${user.email}:`, err.message);
    });
    genericResponse();
  } catch (err) {
    next(err);
  }
}

async function sendPasswordResetEmail(user) {
  const { raw, hash, expiresAt } = authService.generatePasswordResetToken();
  await authService.setPasswordResetToken(user.id, { hash, expiresAt });
  const resetUrl = `${env.frontendUrl}/reset-password?token=${raw}`;
  const { subject, text } = emailTemplates.passwordResetEmail(user, resetUrl);
  await mailer.sendMail({ to: user.email, subject, text });
}

// Works for any role by email (customer or admin) — the token itself is
// the authorization, not which login form was used to get here. Same
// generic response regardless of outcome, same reasoning as
// resendVerification: doesn't reveal whether an account exists.
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body || {};
    const genericResponse = () =>
      res.json({ message: "If an account exists for this email, we've sent a password reset link." });

    if (!email) return genericResponse();
    const user = await authService.findUserByEmail(email);
    if (!user) return genericResponse();

    if (user.password_reset_sent_at) {
      const elapsedMinutes = (Date.now() - new Date(user.password_reset_sent_at).getTime()) / (60 * 1000);
      if (elapsedMinutes < RESET_COOLDOWN_MINUTES) return genericResponse();
    }

    await sendPasswordResetEmail(user).catch((err) => {
      console.error(`Failed to send password reset email to ${user.email}:`, err.message);
    });
    genericResponse();
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body || {};
    if (!token) return res.status(400).json({ error: "Missing reset token." });
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const user = await authService.findUserByPasswordResetToken(token);
    if (!user || !user.password_reset_expires_at) {
      return res.status(400).json({ error: "Invalid or expired reset link." });
    }
    if (new Date(user.password_reset_expires_at) < new Date()) {
      return res.status(400).json({ error: "This reset link has expired. Request a new one." });
    }

    await authService.resetPassword(user.id, password);
    // The whole reason a password reset exists is "someone else might
    // know my password" — end every session that was already logged in,
    // not just leave them running alongside a new one.
    await authService.invalidateAllSessions(user.id);

    // Best-effort — the password is already changed and the account is
    // usable regardless of whether this confirmation email goes out.
    try {
      const notification = emailTemplates.passwordChangedNotification(user);
      await mailer.sendMail({ to: user.email, ...notification });
    } catch (err) {
      console.error(`Failed to send password-changed notification to ${user.email}:`, err.message);
    }

    establishSession(req, user);
    res.json({ user: authService.toPublicUser({ ...user, email_verified: true }) });
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

      // Checked only after the password is confirmed correct — telling an
      // unverified account "verify your email" is only safe to reveal once
      // they've already proven they own the credentials, otherwise it's a
      // second account-enumeration channel alongside genericError above.
      if (!user.email_verified) {
        return res.status(403).json({ error: "Please verify your email before logging in.", code: "EMAIL_NOT_VERIFIED" });
      }

      establishSession(req, user);
      res.json({ user: authService.toPublicUser(user) });
    } catch (err) {
      next(err);
    }
  };
}

async function logout(req, res, next) {
  const cookieName = req.sessionCookieName || "blankets.sid";
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(cookieName);
    res.status(204).end();
  });
}

// Self-service only — deliberately no admin equivalent anywhere in this
// app. Always operates on the logged-in session's own userId, never an
// id from the request body/params, so there's no way to target another
// account even by tampering with the request.
async function updateProfile(req, res, next) {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const {
      fullName,
      addressLine1,
      addressComplex,
      addressSuburb,
      addressPostalCode,
      addressProvince,
      cellPhone,
      landlineAreaCode,
      landlineNumber,
      notifyOrderStatusChanges,
    } = req.body || {};
    if (!fullName || !fullName.trim()) return res.status(400).json({ error: "Full name is required." });
    const phoneError = validatePhoneFields({ cellPhone, landlineAreaCode, landlineNumber });
    if (phoneError) return res.status(400).json({ error: phoneError });
    const addressError = validateAddressFields({ addressLine1, addressSuburb, addressPostalCode, addressProvince });
    if (addressError) return res.status(400).json({ error: addressError });

    const user = await authService.updateProfile(req.session.userId, {
      fullName: fullName.trim(),
      addressLine1,
      addressComplex,
      addressSuburb,
      addressPostalCode,
      addressProvince,
      cellPhone,
      landlineAreaCode,
      landlineNumber,
      notifyOrderStatusChanges,
    });
    res.json({ user: authService.toPublicUser(user) });
  } catch (err) {
    next(err);
  }
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
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  loginCustomer: makeLogin("customer"),
  loginAdmin: makeLogin("admin"),
  logout,
  me,
  updateProfile,
};
