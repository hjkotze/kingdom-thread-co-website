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
      .filter((line) => line !== null)
      .join("\n"),
  };
}

function companyReplyEmail(quote, bodyText) {
  return {
    subject: `Re: ${subjectFor(quote)}`,
    text: bodyText,
  };
}

// Same shape as companyReplyEmail — a plain in-thread reply — kept as a
// separate export for clarity at call sites (customer vs company sender),
// even though the content is identical either direction.
function customerReplyEmail(quote, bodyText) {
  return {
    subject: `Re: ${subjectFor(quote)}`,
    text: bodyText,
  };
}

// quoteUrl points straight at this quote in the customer's account
// (/account/quotes/:id) — clicking it while logged out hits
// ProtectedRoute's redirect-to-login, and Login.jsx already resumes to
// location.state.from after a successful login, so this one link alone
// carries the customer through "log in" and "land on the right quote"
// with no extra token/magic-link machinery needed. Replying to the email
// itself was never enough to actually accept — accepting requires the
// Privacy Policy consent checkbox, which only exists on the website.
function formalQuoteReadyEmail(quote, snapshot, quoteUrl) {
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
    `Review and accept here — this is the version we'll go ahead with (you'll need to log in, and confirm you agree to our Privacy Policy, to accept):`,
    quoteUrl,
    ``,
    `Replying to this email alone won't confirm your order — please use the link above.`,
    ``,
    `Quote #${quote.id}`,
  ]
    // Boolean would also drop the blank-line "" separators above (empty
    // strings are falsy) — null is the "omit this line" sentinel here so
    // intentional blank lines survive.
    .filter((line) => line !== null)
    .join("\n");

  return { subject: `Re: ${subjectFor(quote)}`, text };
}

// Order-level, potentially spanning several quotes at once (combined
// orders) — unlike every other template here, this can't anchor to one
// quote's "Quote #<id>" thread, so it's a plain, unthreaded email.
function invoiceEmail(invoice, data, quoteUrl) {
  const itemsSummary = data.lines.map((l) => `${l.productName} (qty ${l.quantity})`).join(", ");
  const text = [
    `Hi,`,
    ``,
    `Please find attached invoice ${invoice.invoice_number} for: ${itemsSummary}.`,
    ``,
    `Subtotal: R${data.subtotal.toFixed(2)}`,
    `Shipping: R${data.shippingAmount.toFixed(2)}`,
    `VAT: R${data.vatAmount.toFixed(2)}`,
    `Total: R${data.total.toFixed(2)}`,
    `Paid so far: R${data.amountPaid.toFixed(2)}`,
    `Outstanding balance: R${data.outstanding.toFixed(2)}`,
    ``,
    `Full payment is due to begin production.`,
    data.bankingDetails ? `` : null,
    data.bankingDetails ? `Payment details:` : null,
    data.bankingDetails || null,
    ``,
    `Once you've paid, please reply to this email with your proof of payment so we can start production straight away.`,
    quoteUrl ? `` : null,
    quoteUrl ? `View this order any time in your account:` : null,
    quoteUrl || null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { subject: `Invoice ${invoice.invoice_number}`, text };
}

function customerAcceptedNotification(quote) {
  return {
    subject: `Quote #${quote.id} accepted by customer`,
    text: `The customer accepted the formal quote for Quote #${quote.id} (${quote.product_name_snapshot}). Ready to proceed.`,
  };
}

// Internal notification for the new order/combine flow — replaces
// customerAcceptedNotification when the acceptance spans one or more
// quotes via orders.service.js#createOrderFromQuotes.
function orderAcceptedNotification(order, lines, customer) {
  const itemsSummary = lines.map((l) => `${l.productName} (qty ${l.quantity})`).join(", ");
  return {
    subject: `Order #${order.id} accepted by ${customer.full_name}${lines.length > 1 ? ` (${lines.length} items combined)` : ""}`,
    text: `${customer.full_name} (${customer.email}) accepted: ${itemsSummary}. Ready to proceed.`,
  };
}

// Internal-only, like the work order PDF itself — fires once, exactly
// when invoices.service.js#recordPayment generates the work order(s) for
// an order (full payment reached), never on subsequent payment records.
function workOrderGeneratedNotification(order, lines, customer) {
  const itemsSummary = lines.map((l) => `${l.productName} (qty ${l.quantity})`).join(", ");
  return {
    subject: `Work order generated for order #${order.id} — payment received${lines.length > 1 ? ` (${lines.length} items)` : ""}`,
    text: [
      `Full payment has been received for ${customer.full_name}'s order #${order.id}.`,
      `Items: ${itemsSummary}.`,
      ``,
      `The work order PDF is attached — production can begin.`,
    ].join("\n"),
  };
}

// Only sent when the customer has notify_order_status_changes = true (see
// orders.service.js#updateOrderStatus) — the in-app system message on
// every quote in the order is the always-visible record regardless of
// this preference, this is just an extra nudge on top of it.
function orderStatusChangedEmail(order, customerStatusLabel, customer, quoteUrl) {
  return {
    subject: `Order ${order.order_number} update: ${customerStatusLabel}`,
    text: [
      `Hi ${customer.full_name},`,
      ``,
      `Your order ${order.order_number} is now: ${customerStatusLabel}.`,
      ``,
      `See the full details, or reply to any of your order's messages if you have a question:`,
      quoteUrl || null,
    ]
      // null (not Boolean) is the "omit this line" sentinel — Boolean
      // would also drop the intentional blank-line "" separators above.
      .filter((line) => line !== null)
      .join("\n"),
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
  customerReplyEmail,
  formalQuoteReadyEmail,
  invoiceEmail,
  customerAcceptedNotification,
  orderAcceptedNotification,
  workOrderGeneratedNotification,
  orderStatusChangedEmail,
  verificationEmail,
};
