// Triggered by a HostKing cron job every 5-15 minutes — there is no
// persistent process to run IMAP IDLE or polling loops in-app. Fetches
// unseen INBOX messages, matches each to a quote thread, logs it, and
// (only for successfully matched messages) marks \Seen and moves it to a
// processed folder so it doesn't get reprocessed and stays out of the
// primary Inbox the owner reads in Mac Mail. Unmatched messages are left
// completely alone in INBOX (still unread) so a human notices them
// naturally — only the dedup log entry prevents renotifying about them
// every run.
require("dotenv").config();
const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const db = require("../../src/config/db");
const env = require("../../src/config/env");
const mailer = require("../../src/lib/mailer");
const emailTemplates = require("../../src/lib/emailTemplates");
const { isAllowedMimeType } = require("../../src/lib/fileValidation");

const PROCESSED_FOLDER = process.env.IMAP_PROCESSED_FOLDER || "App-Processed";
const SUBJECT_QUOTE_RE = /Quote #(\d+)/i;

function extractMessageIds(headerValue) {
  if (!headerValue) return [];
  const values = Array.isArray(headerValue) ? headerValue : [headerValue];
  const ids = [];
  for (const value of values) {
    const matches = String(value).match(/<[^>]+>/g);
    if (matches) ids.push(...matches);
  }
  return ids;
}

async function alreadyLogged(emailMessageId, mailbox) {
  const row = await db("email_ingestion_log").where({ email_message_id: emailMessageId, mailbox }).first();
  return Boolean(row);
}

async function logIngestion({ emailMessageId, mailbox, status, quoteId, errorMessage }) {
  await db("email_ingestion_log")
    .insert({
      email_message_id: emailMessageId,
      mailbox,
      status,
      quote_id: quoteId || null,
      error_message: errorMessage || null,
      processed_at: new Date(),
    })
    .onConflict(["email_message_id", "mailbox"])
    .ignore();
}

async function matchQuoteId(parsed) {
  const candidateIds = [...extractMessageIds(parsed.inReplyTo), ...extractMessageIds(parsed.references)];
  if (candidateIds.length > 0) {
    const anchor = await db("messages").whereIn("email_message_id", candidateIds).first();
    if (anchor) return anchor.quote_id;
  }

  const subjectMatch = String(parsed.subject || "").match(SUBJECT_QUOTE_RE);
  if (subjectMatch) {
    const quoteId = Number(subjectMatch[1]);
    const quote = await db("quotes").where({ id: quoteId }).first();
    if (quote) return quote.id;
  }

  return null;
}

async function saveAttachment(quoteId, messageRowId, attachment, uploadedBy) {
  const isImage = isAllowedMimeType("image", attachment.contentType);
  const fileType = isImage ? "image" : "text";

  const dir = path.join(env.uploadsDir, String(quoteId));
  await fs.promises.mkdir(dir, { recursive: true });
  const ext = path.extname(attachment.filename || "") || "";
  const storagePath = path.join(dir, `${crypto.randomUUID()}${ext}`);
  await fs.promises.writeFile(storagePath, attachment.content);

  // Deliberately never promoted to is_current: an emailed attachment is
  // part of the conversation record, not an implicit replacement of the
  // customer's active design file — that only happens through the upload
  // UI's explicit, warned overwrite (§6).
  await db("attachments").insert({
    quote_id: quoteId,
    message_id: messageRowId,
    file_type: fileType,
    original_filename: attachment.filename || "attachment",
    storage_path: storagePath,
    mime_type: attachment.contentType,
    size_bytes: attachment.size,
    uploaded_by: uploadedBy,
    is_current: false,
  });
}

const AUTOMATED_SENDER_RE = /^(mailer-daemon|postmaster|mail-delivery-subsystem|no-?reply)@/i;

// Bounce/DSN notifications (RFC 3464) and autoresponders (RFC 3834) often
// reference the original message's headers, so they can pass thread
// matching just like a real reply — but they aren't customer content and
// must never be logged as one. Checked via sender address, the
// Auto-Submitted header, and the multipart/report content type bounces use.
function isAutomatedMessage(parsed) {
  const fromAddress = parsed.from?.value?.[0]?.address || "";
  if (AUTOMATED_SENDER_RE.test(fromAddress)) return true;

  const autoSubmitted = parsed.headers.get("auto-submitted");
  if (autoSubmitted && String(autoSubmitted).toLowerCase() !== "no") return true;

  const contentType = parsed.headers.get("content-type");
  const contentTypeValue = typeof contentType === "string" ? contentType : contentType?.value;
  if (contentTypeValue && contentTypeValue.toLowerCase().includes("multipart/report")) return true;

  return false;
}

// Guards against a notification email (sent by this same script/app to
// the company) looping back in as a fake "customer" reply — most likely
// when the notification recipient and the scanned mailbox are the same
// address (as in this test setup), but a cheap, always-correct check
// regardless of mailbox layout: a message can never genuinely be customer
// content if it was sent from our own address.
function isFromOwnAddress(parsed) {
  const fromAddress = (parsed.from?.value?.[0]?.address || "").toLowerCase();
  return fromAddress === env.smtp.user.toLowerCase();
}

async function ensureMailbox(client, name) {
  const list = await client.list();
  if (!list.some((box) => box.path === name)) {
    await client.mailboxCreate(name);
  }
}

async function processMessage(client, message) {
  const { content } = await client.download(message.uid, undefined, { uid: true });
  const chunks = [];
  for await (const chunk of content) chunks.push(chunk);
  const parsed = await simpleParser(Buffer.concat(chunks));

  const emailMessageId = parsed.messageId;
  if (!emailMessageId) {
    console.warn(`Message UID ${message.uid} has no Message-ID header, skipping.`);
    return;
  }
  if (await alreadyLogged(emailMessageId, "INBOX")) return;

  if (isAutomatedMessage(parsed) || isFromOwnAddress(parsed)) {
    await logIngestion({ emailMessageId, mailbox: "INBOX", status: "ignored" });
    console.log(`Ignored (automated/bounce/self-sent): ${emailMessageId} (subject: "${parsed.subject}")`);
    await client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true });
    await client.messageMove(message.uid, PROCESSED_FOLDER, { uid: true });
    return;
  }

  const quoteId = await matchQuoteId(parsed);
  if (!quoteId) {
    await logIngestion({ emailMessageId, mailbox: "INBOX", status: "unmatched" });
    console.log(`Unmatched: ${emailMessageId} (subject: "${parsed.subject}") — left in INBOX for manual review.`);
    return;
  }

  const now = new Date();
  const [messageRowId] = await db("messages").insert({
    quote_id: quoteId,
    sender_type: "customer",
    direction: "inbound",
    body_text: parsed.text || "",
    body_html: parsed.html || null,
    email_message_id: emailMessageId,
    in_reply_to: extractMessageIds(parsed.inReplyTo)[0] || extractMessageIds(parsed.references).slice(-1)[0] || null,
  });

  for (const attachment of parsed.attachments || []) {
    await saveAttachment(quoteId, messageRowId, attachment, "customer");
  }

  await db("quotes").where({ id: quoteId }).update({
    status: "awaiting_company",
    last_customer_message_at: now,
    updated_at: now,
  });

  await logIngestion({ emailMessageId, mailbox: "INBOX", status: "matched", quoteId });
  console.log(`Matched: ${emailMessageId} -> quote #${quoteId}`);

  await client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true });
  await client.messageMove(message.uid, PROCESSED_FOLDER, { uid: true });

  const quote = await db("quotes").where({ id: quoteId }).first();
  const notification = emailTemplates.newReplyFromCustomerNotification(quote);
  await mailer.sendMail({ to: env.companyNotificationEmail, ...notification }).catch((err) => {
    console.error(`Failed to send reply notification for quote #${quoteId}:`, err.message);
  });
}

async function main() {
  const client = new ImapFlow({
    host: env.imap.host,
    port: env.imap.port,
    secure: true,
    auth: { user: env.imap.user, pass: env.imap.password },
    logger: false,
  });

  await client.connect();
  try {
    await ensureMailbox(client, PROCESSED_FOLDER);
    const lock = await client.getMailboxLock("INBOX");
    try {
      const uids = await client.search({ seen: false }, { uid: true });
      console.log(`Found ${uids.length} unseen message(s) in INBOX.`);
      for (const uid of uids) {
        try {
          await processMessage(client, { uid });
        } catch (err) {
          console.error(`Error processing message UID ${uid}:`, err);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
}

main()
  .catch((err) => {
    console.error("Email ingestion failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.destroy());
