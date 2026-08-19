// A fresh production database gets empty vat_rates/shipping_rates tables
// and null policy content from their creation migrations (see
// PRODUCTION_DEPLOYMENT.md §6b) — VAT is genuinely required for order/
// invoice pricing to work at all, and the policy pages are legal-facing
// content, not test data. This seeds the real, currently-live values
// (copied from the production/dev database as of 2026-08-19) so a new
// deploy isn't broken or empty on day one — the admin can still change
// any of this afterward from /admin/configuration/settings and the two
// policy pages exactly as before.
const PRIVACY_POLICY = `This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from our website. We are committed to protecting your privacy and ensuring your personal data is handled securely under applicable data protection laws, including the Protection of Personal Information Act (POPIA) and the General Data Protection Regulation (GDPR).

1. Personal Information We Collect
Because our website requires a user account to make a purchase (no guest checkouts allowed), we collect personal information directly from you when you register an account. This includes:

Account Data: Your full name, email address, phone number, and a secure password.
Order & Delivery Data: Your physical delivery address, billing address, and purchase history.
EFT Documentation: Official Proof of Payment (PoP) documents if you choose the manual bank transfer payment option.

2. How We Use Your Personal Information
We use your information strictly to fulfill our contract with you. This includes:

Managing and securing your registered user account.
Processing your orders, payments, and manual EFT verifications.
Sending essential transaction updates via email (e.g., account activation, order confirmations, and tracking links).
We do not use your data for marketing analytics, tracking pixels, or automated promotional newsletters.

3. Sharing Your Personal Information
We only share your data with essential third-party service providers necessary to complete your transactions and deliver your orders:

Delivery and Logistics: We share your name, delivery address, and contact number with The Courier Guy to ship your packages.
Payment Gateways: Your payment details are processed directly by our secure, PCI-compliant payment partners: PayFast, Yoco, and PayPal. We do not store, view, or process your credit card numbers or bank login credentials on our servers.

4. Data Security and Retention
Your personal data is encrypted in transit using HTTPS/TLS protocols, and user account passwords are encrypted using industry-standard hashing algorithms. We retain your account and transactional data only for as long as your account remains active or as required by law for accounting and tax purposes.

5. Your Rights
You have the right to access the personal information we hold about you, request corrections to inaccurate data, or request the deletion of your account and data (subject to legal or financial retention requirements).

For any privacy-related inquiries or to exercise your rights, please contact us at:
Email: policy@kingdom-thread-co.co.za
`;

const COOKIE_POLICY = `This website uses cookies to ensure our custom e-commerce platform functions securely and correctly. This policy explains what cookies are, how we use them, and why they are necessary.

1. What Are Cookies?
Cookies are small text files placed on your computer or mobile device by your web browser when you visit a website.

2. The Cookies We Use (Strictly Necessary Cookies)
This website only uses first-party, strictly necessary session cookies. These cookies are mandatory for our system to function and do not track your personal identity outside of our website. They are used exclusively to:

Verify that you are securely logged into your user account.
Maintain your user session as you browse from page to page.
Ensure items added to your shopping cart remain there during your session.
Because these cookies are purely operational and required for the basic functionality of the website, they do not require prior user consent under POPIA or GDPR regulations.

3. What We Do Not Do

No Third-Party Cookies: We do not allow third-party cookies on our site.
No Marketing or Analytics: We do not use Google Analytics, Meta Pixels, tracking scripts, or behavioral profiling tools.
No Advertising: Your data and browsing history are never tracked, packaged, or shared with advertising networks.

4. Managing Your Cookies
You can choose to disable or block cookies through your browser settings. However, because our website relies entirely on session cookies to manage user logins, disabling cookies will prevent you from logging into your account, adding items to your cart, or completing a purchase.`;

const CURRENT_VAT_RATE_PERCENT = "15.00";
const CURRENT_VAT_VALID_FROM = "2026-01-01";

exports.up = async function up(knex) {
  // Only seed if genuinely empty — running this against dev's existing
  // database (which already has this same real data) must stay a no-op
  // rather than inserting a duplicate rate or clobbering admin edits.
  const { count } = await knex("vat_rates").count("* as count").first();
  if (Number(count) === 0) {
    await knex("vat_rates").insert({
      rate_percent: CURRENT_VAT_RATE_PERCENT,
      valid_from: CURRENT_VAT_VALID_FROM,
      valid_to: null,
    });
  }

  for (const [type, content] of [["privacy", PRIVACY_POLICY], ["cookies", COOKIE_POLICY]]) {
    const row = await knex("policies").where({ type }).first();
    if (row && row.content === null) {
      await knex("policies").where({ type }).update({ content, updated_at: knex.fn.now() });
    }
  }
};

exports.down = async function down(knex) {
  await knex("vat_rates").where({ rate_percent: CURRENT_VAT_RATE_PERCENT, valid_from: CURRENT_VAT_VALID_FROM }).del();
  await knex("policies").whereIn("type", ["privacy", "cookies"]).update({ content: null });
};
