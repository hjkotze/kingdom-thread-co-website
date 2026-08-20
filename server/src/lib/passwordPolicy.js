// Single source of truth for the minimum password length — previously
// duplicated separately in auth.controller.js and bootstrapAdmin.js, and
// missing entirely from create-admin.js (the CLI script silently accepted
// any password length at all). Import this everywhere a password gets
// validated instead of hardcoding the number again.
const MIN_PASSWORD_LENGTH = 10;

module.exports = { MIN_PASSWORD_LENGTH };
