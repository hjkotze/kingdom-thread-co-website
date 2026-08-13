import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getQuote, sendCustomerReply } from "../lib/api/quotes";
import AttachmentsSection from "../components/quote/AttachmentsSection";
import CustomerFormalQuoteSection from "../components/quote/CustomerFormalQuoteSection";
import CustomerInvoiceSection from "../components/quote/CustomerInvoiceSection";
import RateProductWidget from "../components/quote/RateProductWidget";
import Header from "../components/Header";
import { ApiError } from "../lib/api/client";

const STATUS_LABELS = {
  new: "New",
  awaiting_customer: "Awaiting your response",
  awaiting_company: "Awaiting our response",
  finalised: "Finalised",
  accepted: "Accepted",
  cancelled: "Cancelled",
};

export default function QuoteDetail() {
  const { id } = useParams();
  // Set by QuoteReview.jsx when a design-file upload failed right after
  // submitting this quote — see the comment there. Read once; a page
  // refresh clears router state naturally so this doesn't linger forever.
  const { state: locationState } = useLocation();
  const failedUploads = locationState?.failedUploads || null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");

  const refetch = useCallback(() => {
    return getQuote(id).then((result) => setData(result));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    getQuote(id)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setReplyError("");
    try {
      await sendCustomerReply(id, reply.trim());
      setReply("");
      await refetch();
    } catch (err) {
      setReplyError(err instanceof ApiError ? err.message : "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;
  if (notFound || !data) {
    return (
      <>
        <Header />
        <section className="min-h-screen bg-background py-28 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-muted-foreground">Quote not found.</p>
            <Link to="/account" className="text-accent text-sm font-medium">
              Back to your account
            </Link>
          </div>
        </section>
      </>
    );
  }

  const { quote, messages, attachments, snapshots, invoice, lines, payments: invoicePayments, customerAddress } = data;
  const latestSnapshot = snapshots[0] || null;
  // "finalised" means a formal quote exists and hasn't been accepted yet —
  // just as much a pending action for the customer as an unanswered reply.
  const pendingCustomerResponse = quote.status === "awaiting_customer" || quote.status === "finalised";

  return (
    <>
      <Header />
      <section className="min-h-screen bg-background py-28 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft size={14} /> Back to your account
        </Link>

        <div className="flex items-start justify-between gap-4 mb-2">
          <h1
            className="text-3xl text-foreground"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
          >
            {quote.productName}
          </h1>
          <span
            className="text-xs px-3 py-1 shrink-0 mt-1"
            style={{
              borderRadius: "var(--radius)",
              background: pendingCustomerResponse ? "var(--accent)" : "var(--secondary)",
              color: pendingCustomerResponse ? "var(--accent-foreground)" : "var(--muted-foreground)",
            }}
          >
            {STATUS_LABELS[quote.status] || quote.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Quote #{quote.id} · Submitted {new Date(quote.createdAt).toLocaleDateString()}
        </p>

        {pendingCustomerResponse && (
          <p
            className="text-sm px-4 py-3 mb-8 bg-accent/10 border border-accent/30 text-foreground"
            style={{ borderRadius: "var(--radius)" }}
          >
            You have a pending item to respond to on this quote.
          </p>
        )}

        <div
          className="bg-card border border-border p-6 mb-8"
          style={{ borderRadius: "var(--radius)" }}
        >
          <dl className="flex flex-col gap-3 text-sm">
            <Row label="Size" value={quote.size} />
            <Row label="Colour" value={quote.colour} />
            <Row label="Quantity" value={quote.quantity} />
            {quote.requirements && <Row label="Requirements" value={quote.requirements} />}
            {quote.font && <Row label="Font" value={quote.font} />}
            {quote.fontColour && <Row label="Font colour" value={quote.fontColour} />}
            {quote.threadColourCode && <Row label="Thread colour" value={quote.threadColourCode} />}
          </dl>
        </div>

        <RateProductWidget productId={quote.productId} productName={quote.productName} />

        {quote.customisable && (
          <div className="mb-8">
            <h2 className="text-sm text-foreground font-medium mb-4">Design files</h2>
            {failedUploads && (
              <p
                className="text-sm px-4 py-3 mb-4 bg-destructive/10 border border-destructive/30 text-destructive"
                style={{ borderRadius: "var(--radius)" }}
              >
                Your {failedUploads.join(" and ")} didn&apos;t upload when you submitted this request. Please
                attach {failedUploads.length > 1 ? "them" : "it"} again below.
              </p>
            )}
            <AttachmentsSection quoteId={quote.id} attachments={attachments} onUploaded={refetch} />
          </div>
        )}

        <CustomerFormalQuoteSection quote={quote} snapshot={latestSnapshot} onAccepted={refetch} />

        <CustomerInvoiceSection
          quote={quote}
          invoice={invoice}
          lines={lines}
          payments={invoicePayments}
          customerAddress={customerAddress}
        />

        <h2 className="text-sm text-foreground font-medium mb-4">Communication</h2>
        <div className="flex flex-col gap-3 mb-6">
          {messages.map((m) => (
            <div
              key={m.id}
              className="border border-border p-4"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{m.senderType === "customer" ? "You" : m.senderType === "company" ? "Kingdom Thread Co" : "System"}</span>
                <span>{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{m.body}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleReply} className="flex flex-col gap-3">
          {replyError && (
            <p
              className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5"
              style={{ borderRadius: "var(--radius)" }}
            >
              {replyError}
            </p>
          )}
          <textarea
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply, ask a question, or add more detail…"
            className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            style={{ borderRadius: "var(--radius)" }}
          />
          <button
            type="submit"
            disabled={sending}
            className="bg-accent text-accent-foreground py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start px-6"
            style={{ borderRadius: "var(--radius)" }}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
      </section>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-6 border-b border-border pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-foreground text-right">{value}</dd>
    </div>
  );
}
