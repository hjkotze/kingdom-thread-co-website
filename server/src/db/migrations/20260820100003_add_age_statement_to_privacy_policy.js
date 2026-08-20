// Adds a brief age/minors statement to the live Privacy Policy content —
// nothing anywhere previously addressed account age. Only overwrites if
// the content still matches the exact text left by the prior correction
// migration (20260820100001) — if an admin has already hand-edited this
// since, this must not clobber that edit.
const OLD_PRIVACY_POLICY = `This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from our website. We are committed to protecting your privacy and ensuring your personal data is handled securely under applicable data protection laws, including the Protection of Personal Information Act (POPIA) and the General Data Protection Regulation (GDPR).

1. Personal Information We Collect
Because our website requires a user account to make a purchase (no guest checkouts allowed), we collect personal information directly from you when you register an account. This includes:

Account Data: Your full name, email address, phone number, and a secure password.
Order & Delivery Data: Your physical delivery address, billing address, and purchase history.
EFT Documentation: Official Proof of Payment (PoP) documents, since payment for orders is currently made by manual bank transfer.

2. How We Use Your Personal Information
We use your information strictly to fulfill our contract with you. This includes:

Managing and securing your registered user account.
Processing your orders and verifying your manual EFT payments.
Sending essential transaction updates via email (e.g., account activation, order confirmations, and tracking links).
We do not use your data for marketing analytics, tracking pixels, or automated promotional newsletters.

3. Sharing Your Personal Information
We only share your data with essential third-party service providers necessary to complete your transactions and deliver your orders:

Delivery and Logistics: We share your name, delivery address, and contact number with The Courier Guy to ship your packages.

We do not use any third-party payment gateway — payment is by direct bank transfer (EFT) into our own account, verified manually from the Proof of Payment you upload. Your bank login credentials are never seen by us or shared with anyone; you make the transfer directly through your own bank.

4. Data Security and Retention
Your personal data is encrypted in transit using HTTPS/TLS protocols, and user account passwords are encrypted using industry-standard hashing algorithms. We retain your account and transactional data only for as long as your account remains active or as required by law for accounting and tax purposes.

5. Your Rights
You have the right to access the personal information we hold about you, request corrections to inaccurate data, or request the deletion of your account and data (subject to legal or financial retention requirements). We're a small, made-to-order business without an automated self-service deletion tool — email us and we'll action any such request manually.

For any privacy-related inquiries or to exercise your rights, please contact us at:
Email: policy@kingdom-thread-co.co.za
`;

const NEW_PRIVACY_POLICY = `This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from our website. We are committed to protecting your privacy and ensuring your personal data is handled securely under applicable data protection laws, including the Protection of Personal Information Act (POPIA) and the General Data Protection Regulation (GDPR).

1. Personal Information We Collect
Because our website requires a user account to make a purchase (no guest checkouts allowed), we collect personal information directly from you when you register an account. This includes:

Account Data: Your full name, email address, phone number, and a secure password.
Order & Delivery Data: Your physical delivery address, billing address, and purchase history.
EFT Documentation: Official Proof of Payment (PoP) documents, since payment for orders is currently made by manual bank transfer.

2. How We Use Your Personal Information
We use your information strictly to fulfill our contract with you. This includes:

Managing and securing your registered user account.
Processing your orders and verifying your manual EFT payments.
Sending essential transaction updates via email (e.g., account activation, order confirmations, and tracking links).
We do not use your data for marketing analytics, tracking pixels, or automated promotional newsletters.

3. Sharing Your Personal Information
We only share your data with essential third-party service providers necessary to complete your transactions and deliver your orders:

Delivery and Logistics: We share your name, delivery address, and contact number with The Courier Guy to ship your packages.

We do not use any third-party payment gateway — payment is by direct bank transfer (EFT) into our own account, verified manually from the Proof of Payment you upload. Your bank login credentials are never seen by us or shared with anyone; you make the transfer directly through your own bank.

4. Data Security and Retention
Your personal data is encrypted in transit using HTTPS/TLS protocols, and user account passwords are encrypted using industry-standard hashing algorithms. We retain your account and transactional data only for as long as your account remains active or as required by law for accounting and tax purposes.

5. Your Rights
You have the right to access the personal information we hold about you, request corrections to inaccurate data, or request the deletion of your account and data (subject to legal or financial retention requirements). We're a small, made-to-order business without an automated self-service deletion tool — email us and we'll action any such request manually.

6. Age Requirement
You must be 18 years or older, or have the consent of a parent or guardian, to register an account or place an order on this website.

For any privacy-related inquiries or to exercise your rights, please contact us at:
Email: policy@kingdom-thread-co.co.za
`;

exports.up = async function up(knex) {
  const row = await knex("policies").where({ type: "privacy" }).first();
  if (row && row.content === OLD_PRIVACY_POLICY) {
    await knex("policies").where({ type: "privacy" }).update({ content: NEW_PRIVACY_POLICY, updated_at: knex.fn.now() });
  }
};

exports.down = async function down(knex) {
  const row = await knex("policies").where({ type: "privacy" }).first();
  if (row && row.content === NEW_PRIVACY_POLICY) {
    await knex("policies").where({ type: "privacy" }).update({ content: OLD_PRIVACY_POLICY, updated_at: knex.fn.now() });
  }
};
