// One-off CLI script for creating admin accounts. There is deliberately no
// HTTP endpoint for this — admin accounts must never be self-service (§1).
//
// Usage: npm run create-admin -- --email=you@domain.com --password=... --name="Your Name"
const authService = require("../src/modules/auth/auth.service");
const db = require("../src/config/db");

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

async function main() {
  const { email, password, name } = parseArgs();
  if (!email || !password || !name) {
    console.error('Usage: npm run create-admin -- --email=you@domain.com --password=... --name="Your Name"');
    process.exitCode = 1;
    return;
  }

  const existing = await authService.findUserByEmail(email);
  if (existing) {
    console.error(`A user with email ${email} already exists (role: ${existing.role}).`);
    process.exitCode = 1;
    return;
  }

  const user = await authService.createUser({ email, password, fullName: name, role: "admin" });
  console.log(`Created admin user #${user.id} (${user.email}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
