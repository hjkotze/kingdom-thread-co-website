import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { getQuote } from "../lib/api/quotes";
import AttachmentsSection from "../components/quote/AttachmentsSection";

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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

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

  if (loading) return null;
  if (notFound || !data) {
    return (
      <section className="min-h-screen bg-background py-28 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-muted-foreground">Quote not found.</p>
          <Link to="/account" className="text-accent text-sm font-medium">
            Back to your account
          </Link>
        </div>
      </section>
    );
  }

  const { quote, messages, attachments } = data;
  const pendingCustomerResponse = quote.status === "awaiting_customer";

  return (
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

        {quote.customisable && (
          <div className="mb-8">
            <h2 className="text-sm text-foreground font-medium mb-4">Design files</h2>
            <AttachmentsSection quoteId={quote.id} attachments={attachments} onUploaded={refetch} />
          </div>
        )}

        <h2 className="text-sm text-foreground font-medium mb-4">Communication</h2>
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className="border border-border p-4"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{m.senderType === "customer" ? "You" : m.senderType === "company" ? "Woven" : "System"}</span>
                <span>{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{m.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
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
