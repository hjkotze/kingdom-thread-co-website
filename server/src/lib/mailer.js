const nodemailer = require("nodemailer");
const crypto = require("crypto");
const env = require("../config/env");

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: { user: env.smtp.user, pass: env.smtp.password },
});

// RFC 5322 Message-ID, including the angle brackets — this exact string is
// what gets stored on messages.email_message_id and matched against
// incoming In-Reply-To/References headers later.
function generateMessageId(quoteId) {
  return `<quote-${quoteId}-${crypto.randomBytes(8).toString("hex")}@${env.mailDomain}>`;
}

async function sendMail({ to, subject, text, html, messageId, inReplyTo, references, attachments }) {
  return transporter.sendMail({
    from: env.smtp.user,
    to,
    subject,
    text,
    html,
    messageId,
    inReplyTo,
    references,
    attachments,
  });
}

module.exports = { transporter, generateMessageId, sendMail };
