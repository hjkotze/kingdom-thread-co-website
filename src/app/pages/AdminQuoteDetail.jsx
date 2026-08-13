import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Download } from "lucide-react";
import { getAdminQuote, sendAdminReply, listAdminQuotes } from "../lib/api/adminQuotes";
import { attachmentDownloadUrl } from "../lib/api/attachments";
import { ApiError } from "../lib/api/client";
import AdminFormalQuoteSection from "../components/quote/AdminFormalQuoteSection";
import AdminInvoiceSection from "../components/quote/AdminInvoiceSection";
import AdminQuoteListItem, { badgeStyle, badgeLabel } from "../components/quote/AdminQuoteListItem";
import AdminLayout from "../components/admin/AdminLayout";

export default function AdminQuoteDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = () => getAdminQuote(id).then(setData);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminQuote(id), listAdminQuotes()])
      .then(([quoteData, queueData]) => {
        if (cancelled) return;
        setData(quoteData);
        setQueue(queueData.quotes);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
      <AdminLayout>
        <p className="text-sm text-muted-foreground text-center">Quote not found.</p>
      </AdminLayout>
    );
  }

  const { quote, messages, attachments, snapshots, invoice, order, lines, payments, workOrders, customerAddress } = data;
  const combined = order && lines.length > 1;
  // Everything else still needing attention, so it stays visible on the
  // same screen while working the active item (§7) — not just the
  // dashboard's full list.
  const needsAttention = queue.filter((q) => q.id !== quote.id && q.needsResponse).slice(0, 6);

  return (
    <AdminLayout maxWidthClassName="max-w-5xl">
      <div className="grid lg:grid-cols-[1fr_300px] gap-10 items-start">
        <div className="min-w-0">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft size={14} /> Back to all quotes
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
              style={{ borderRadius: "var(--radius)", ...badgeStyle(quote) }}
            >
              {badgeLabel(quote)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            Quote #{quote.id} · {quote.customerName} ({quote.customerEmail})
          </p>
          <p className="text-xs text-accent mb-8" style={{ fontFamily: "'DM Mono', monospace", minHeight: "1em" }}>
            {[
              snapshots[0]?.quoteNumber,
              order?.orderNumber && `Order ${order.orderNumber}`,
              invoice?.invoiceNumber && `Invoice ${invoice.invoiceNumber}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>

          <div className="bg-card border border-border p-6 mb-8" style={{ borderRadius: "var(--radius)" }}>
            <dl className="flex flex-col gap-3 text-sm">
              <Row label="Size" value={quote.size} />
              <Row label="Colour" value={quote.colour} />
              <Row label="Quantity" value={quote.quantity} />
              {/* quote.price is the product's per-unit price at request
                  time (see quotes.service.js) — never scaled by quantity,
                  so show it labelled as such alongside the actual total. */}
              {quote.price !== null && <Row label="Unit price" value={`R${quote.price}`} />}
              {quote.price !== null && (
                <Row label="Total price" value={`R${(quote.price * quote.quantity).toFixed(2)}`} />
              )}
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
                    <a
                      href={attachmentDownloadUrl(quote.id, a.id)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <Download size={14} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {combined && (
            <div
              className="bg-accent/10 border border-accent/30 px-4 py-3 mb-8"
              style={{ borderRadius: "var(--radius)" }}
            >
              <p className="text-sm text-foreground font-medium mb-1">
                Part of combined order {order.orderNumber} — {lines.length} items
              </p>
              <p className="text-xs text-muted-foreground">
                {lines.map((l) => l.productName).join(", ")}
              </p>
            </div>
          )}

          <AdminFormalQuoteSection quote={quote} snapshots={snapshots} onCreated={load} />

          <AdminInvoiceSection
            invoice={invoice}
            lines={lines}
            payments={payments}
            workOrders={workOrders}
            customerAddress={customerAddress}
            onUpdated={load}
          />

          <h2 className="text-sm text-foreground font-medium mb-4">Communication</h2>
          <div className="flex flex-col gap-3 mb-8">
            {messages.map((m) => (
              <div key={m.id} className="border border-border p-4" style={{ borderRadius: "var(--radius)" }}>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>
                    {m.senderType === "customer" ? quote.customerName : m.senderType === "company" ? "You" : "System"}
                  </span>
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

        <aside className="lg:sticky lg:top-28">
          <h2 className="text-sm text-foreground font-medium mb-4">Needs attention</h2>
          {needsAttention.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing else waiting on you right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {needsAttention.map((q) => (
                <AdminQuoteListItem key={q.id} quote={q} isActive={false} compact />
              ))}
            </div>
          )}
        </aside>
      </div>
    </AdminLayout>
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
