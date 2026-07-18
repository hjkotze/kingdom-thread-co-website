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

module.exports = {
  subjectFor,
  quoteConfirmationEmail,
  newReplyFromCustomerNotification,
  newQuoteNotification,
  companyReplyEmail,
};
