import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Download } from "lucide-react";
import { getAdminQuote, sendAdminReply } from "../lib/api/adminQuotes";
import { attachmentDownloadUrl } from "../lib/api/attachments";
import { ApiError } from "../lib/api/client";
import AdminFormalQuoteSection from "../components/quote/AdminFormalQuoteSection";

const STATUS_LABELS = {
  new: "New",
  awaiting_customer: "Awaiting customer",
  awaiting_company: "Awaiting us",
  finalised: "Finalised",
  accepted: "Accepted",
  cancelled: "Cancelled",
};

export default function AdminQuoteDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = () => getAdminQuote(id).then(setData);

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      await sendAdminReply(id, reply.trim());
      setReply("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send reply.");
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;
  if (!data) {
    return (
      <section className="min-h-screen bg-background py-28 px-6">
        <div className="max-w-2xl mx-auto text-center text-muted-foreground">Quote not found.</div>
      </section>
    );
  }

  const { quote, messages, attachments, snapshots } = data;

  return (
    <section className="min-h-screen bg-background py-28 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft size={14} /> Back to all quotes
        </Link>

        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
            {quote.productName}
          </h1>
          <span
            className="text-xs px-3 py-1 shrink-0 mt-1"
            style={{ borderRadius: "var(--radius)", background: "var(--secondary)", color: "var(--muted-foreground)" }}
          >
            {STATUS_LABELS[quote.status] || quote.status}
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Quote #{quote.id} · {quote.customerName} ({quote.customerEmail})
        </p>

        <div className="bg-card border border-border p-6 mb-8" style={{ borderRadius: "var(--radius)" }}>
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

        {attachments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm text-foreground font-medium mb-4">Files</h2>
            <ul className="flex flex-col gap-2">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="border border-border p-3 flex items-center justify-between gap-4 text-sm"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <span className="truncate">
                    {a.originalFilename} {a.isCurrent && <span className="text-xs text-accent">(current)</span>}
                  </span>
                  <a href={attachmentDownloadUrl(quote.id, a.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <Download size={14} />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <AdminFormalQuoteSection quote={quote} snapshots={snapshots} onCreated={load} />

        <h2 className="text-sm text-foreground font-medium mb-4">Communication</h2>
        <div className="flex flex-col gap-3 mb-8">
          {messages.map((m) => (
            <div key={m.id} className="border border-border p-4" style={{ borderRadius: "var(--radius)" }}>
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>{m.senderType === "customer" ? quote.customerName : m.senderType === "company" ? "You" : "System"}</span>
                <span>{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">{m.body}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleReply} className="flex flex-col gap-3">
          {error && (
            <p
              className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5"
              style={{ borderRadius: "var(--radius)" }}
            >
              {error}
            </p>
          )}
          <textarea
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply to the customer…"
            className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            style={{ borderRadius: "var(--radius)" }}
          />
          <button
            type="submit"
            disabled={sending}
            className="bg-accent text-accent-foreground py-3 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start px-6"
            style={{ borderRadius: "var(--radius)" }}
          >
            {sending ? "Sending…" : "Send reply"}
          </button>
        </form>
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
