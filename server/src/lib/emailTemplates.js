// Subject carries a "Quote #<id>" token used as the thread-matching
// fallback when In-Reply-To/References headers are missing (see
// scripts/cron/ingest-emails.js). The customer's mail client will prefix
// "Re:" on replies automatically; our own outbound replies do it manually.
function subjectFor(quote) {
  return `Quote #${quote.id} - ${quote.product_name_snapshot}`;
}

function quoteConfirmationEmail(quote) {
  const text = [
    `Hi,`,
    ``,
    `We've received your quote request for ${quote.product_name_snapshot} (${quote.size}, ${quote.colour}, qty ${quote.quantity}).`,
    `We'll reply within 1 business day.`,
    ``,
    `You can reply directly to this email with any questions, or view your request at any time from your account.`,
    ``,
    `Quote #${quote.id}`,
  ].join("\n");

  return { subject: subjectFor(quote), text };
}

function newReplyFromCustomerNotification(quote) {
  return {
    subject: `New reply on Quote #${quote.id} (${quote.product_name_snapshot})`,
    text: `A customer replied on Quote #${quote.id}. Check the admin dashboard to respond.`,
  };
}

function newQuoteNotification(quote, customer) {
  return {
    subject: `New quote request #${quote.id} from ${customer.full_name}`,
    text: [
      `${customer.full_name} (${customer.email}) requested a quote:`,
      ``,
      `Product: ${quote.product_name_snapshot}`,
      `Size: ${quote.size} · Colour: ${quote.colour} · Qty: ${quote.quantity}`,
      quote.requirements_text ? `Requirements: ${quote.requirements_text}` : null,
      ``,
      `Quote #${quote.id}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

function companyReplyEmail(quote, bodyText) {
  return {
    subject: `Re: ${subjectFor(quote)}`,
    text: bodyText,
  };
}

function formalQuoteReadyEmail(quote, snapshot) {
  const text = [
    `Hi,`,
    ``,
    `Here's the formal quote for your ${snapshot.product_name} request, locked in based on what we agreed:`,
    ``,
    `Size: ${snapshot.size} · Colour: ${snapshot.colour} · Qty: ${snapshot.quantity}`,
    snapshot.requirements_text ? `Requirements: ${snapshot.requirements_text}` : null,
    snapshot.font ? `Font: ${snapshot.font}` : null,
    snapshot.font_colour ? `Font colour: ${snapshot.font_colour}` : null,
    snapshot.thread_colour_code ? `Thread colour: ${snapshot.thread_colour_code}` : null,
    snapshot.price !== null && snapshot.price !== undefined ? `Price: R${snapshot.price}` : null,
    ``,
    `Log in to your account to review and accept: this is the version we'll go ahead with.`,
    ``,
    `Quote #${quote.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: `Re: ${subjectFor(quote)}`, text };
}

function customerAcceptedNotification(quote) {
  return {
    subject: `Quote #${quote.id} accepted by customer`,
    text: `The customer accepted the formal quote for Quote #${quote.id} (${quote.product_name_snapshot}). Ready to proceed.`,
  };
}

function verificationEmail(user, verifyUrl) {
  return {
    subject: "Verify your email address",
    text: [
      `Hi ${user.full_name},`,
      ``,
      `Please confirm your email address to activate your account:`,
      ``,
      verifyUrl,
      ``,
      `This link expires in 24 hours. If you didn't create an account, you can ignore this email.`,
    ].join("\n"),
  };
}

function passwordResetEmail(user, resetUrl) {
  return {
    subject: "Reset your password",
    text: [
      `Hi ${user.full_name},`,
      ``,
      `We received a request to reset your password. Click below to choose a new one:`,
      ``,
      resetUrl,
      ``,
      `This link expires in 1 hour. If you didn't request this, you can ignore this email — your password won't be changed.`,
    ].join("\n"),
  };
}

function passwordChangedNotification(user) {
  return {
    subject: "Your password was changed",
    text: [
      `Hi ${user.full_name},`,
      ``,
      `This is a confirmation that the password for your account (${user.email}) was just changed.`,
      ``,
      `If this wasn't you, please contact us immediately.`,
    ].join("\n"),
  };
}

module.exports = {
  subjectFor,
  quoteConfirmationEmail,
  newReplyFromCustomerNotification,
  newQuoteNotification,
  passwordResetEmail,
  passwordChangedNotification,
  companyReplyEmail,
  formalQuoteReadyEmail,
  customerAcceptedNotification,
  verificationEmail,
};
