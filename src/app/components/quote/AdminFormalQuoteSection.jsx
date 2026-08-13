import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../lib/api/client";
import { fetchThreadColours } from "../../lib/api/threadColours";
import { createSnapshot, sendSnapshot } from "../../lib/api/adminQuotes";
import { fetchInvoiceSettings } from "../../lib/api/adminSettings";
import { quotePdfUrl } from "../../lib/api/adminInvoices";
import FormSelect from "./FormSelect";
import FontSelect from "./FontSelect";
import ThreadColourSelect from "./ThreadColourSelect";

export default function AdminFormalQuoteSection({ quote, snapshots, onCreated }) {
  const latest = snapshots[0] || null;
  const [product, setProduct] = useState(null);
  const [threadColours, setThreadColours] = useState([]);

  const seed = latest || quote;
  const [size, setSize] = useState(seed.size);
  const [colour, setColour] = useState(seed.colour);
  const [quantity, setQuantity] = useState(seed.quantity);
  // For a brand-new quote, quote.price is the customer's per-unit price
  // at request time (never scaled by quantity — see quotes.service.js)
  // — the Total must seed as unit price × the original quantity, not the
  // bare unit price, or it reads as correct until the admin happens to
  // retype the quantity and trigger a recalculation.
  const [price, setPrice] = useState(
    latest?.price ?? (quote.price != null && quote.quantity ? Number((quote.price * quote.quantity).toFixed(2)) : quote.price ?? ""),
  );
  // Prefers the persisted unit_price; falls back to implying one from an
  // older snapshot saved before that column existed, or the product's
  // current listed price for a brand-new quote.
  const [unitPrice, setUnitPrice] = useState(
    latest?.unitPrice ??
      (latest?.price != null && latest.quantity ? Number((latest.price / latest.quantity).toFixed(2)) : quote.price ?? ""),
  );
  const [requirements, setRequirements] = useState(seed.requirements || "");
  const [font, setFont] = useState(seed.font || "");
  const [fontColour, setFontColour] = useState(seed.fontColour || "#000000");
  const [threadColourCode, setThreadColourCode] = useState(seed.threadColourCode || "");
  const [notes, setNotes] = useState(latest?.notes ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(!latest);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/products/${quote.productId}`).then((data) => {
      if (!cancelled) setProduct(data.product);
    });
    if (quote.customisable) {
      fetchThreadColours().then((data) => {
        if (!cancelled) setThreadColours(data.threadColours);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [quote.productId, quote.customisable]);

  // Pre-fills Notes from the site-wide default — only for a brand-new
  // formal quote (no prior snapshot to have already carried its own
  // notes forward), and only if the admin hasn't typed anything yet.
  useEffect(() => {
    if (latest) return;
    let cancelled = false;
    fetchInvoiceSettings().then((data) => {
      if (!cancelled && data.defaultQuoteNotes) {
        setNotes((current) => (current ? current : data.defaultQuoteNotes));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Total price recalculates from quantity × unit price whenever either
  // changes — but only on explicit edits to those two fields, never on
  // mount, so opening "Edit / re-issue" doesn't silently overwrite a
  // previously custom-typed total before the admin touches anything.
  const recalcPrice = (nextQuantity, nextUnitPrice) => {
    const qty = Number(nextQuantity);
    const unit = Number(nextUnitPrice);
    if (nextQuantity !== "" && nextUnitPrice !== "" && !Number.isNaN(qty) && !Number.isNaN(unit) && qty > 0) {
      setPrice((qty * unit).toFixed(2));
    }
  };

  const handleQuantityChange = (e) => {
    setQuantity(e.target.value);
    recalcPrice(e.target.value, unitPrice);
  };

  const handleUnitPriceChange = (e) => {
    setUnitPrice(e.target.value);
    recalcPrice(quantity, e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createSnapshot(quote.id, {
        size,
        colour,
        quantity: Number(quantity),
        price: price === "" ? null : Number(price),
        unitPrice: unitPrice === "" ? null : Number(unitPrice),
        notes,
        requirements,
        font,
        fontColour,
        threadColourCode,
      });
      setShowForm(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create formal quote.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    setSendError("");
    try {
      await sendSnapshot(quote.id);
      onCreated();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "Failed to send quote.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm text-foreground font-medium">Formal quote</h2>
        {latest && !showForm && (
          <button onClick={() => setShowForm(true)} className="text-xs text-accent font-medium">
            {latest.acceptedByCustomer ? "Create new version" : "Edit / re-issue"}
          </button>
        )}
      </div>

      {latest && (
        <div
          className="border border-border p-5 mb-4"
          style={{
            borderRadius: "var(--radius)",
            borderColor: latest.acceptedByCustomer ? "var(--accent)" : "var(--border)",
          }}
        >
          {latest.acceptedByCustomer && (
            <p className="text-xs text-accent font-medium mb-3">
              Accepted by customer {new Date(latest.acceptedAt).toLocaleString()}
            </p>
          )}
          <dl className="flex flex-col gap-2 text-sm">
            {latest.quoteNumber && <Row label="Quote number" value={latest.quoteNumber} />}
            <Row label="Size" value={latest.size} />
            <Row label="Colour" value={latest.colour} />
            <Row label="Quantity" value={latest.quantity} />
            {latest.unitPrice !== null && <Row label="Unit price" value={`R${latest.unitPrice}`} />}
            {latest.price !== null && <Row label="Total price" value={`R${latest.price}`} />}
            {latest.requirements && <Row label="Requirements" value={latest.requirements} />}
            {latest.font && <Row label="Font" value={latest.font} />}
            {latest.fontColour && <Row label="Font colour" value={latest.fontColour} />}
            {latest.threadColourCode && <Row label="Thread colour" value={latest.threadColourCode} />}
            {latest.notes && <Row label="Notes" value={latest.notes} />}
          </dl>

          {sendError && <p className="text-xs text-destructive mt-3">{sendError}</p>}

          <div className="flex items-center gap-4 mt-3">
            {latest.quoteNumber && (
              <a href={quotePdfUrl(quote.id)} className="text-xs text-accent font-medium" target="_blank" rel="noreferrer">
                Download quote PDF
              </a>
            )}
            {latest.sentAt ? (
              <span className="text-xs text-muted-foreground">Sent {new Date(latest.sentAt).toLocaleString()}</span>
            ) : (
              <button onClick={handleSend} disabled={sending} className="text-xs text-accent font-medium disabled:opacity-60">
                {sending ? "Sending…" : "Send quote to customer"}
              </button>
            )}
          </div>
        </div>
      )}

      {!latest && !showForm && (
        <p className="text-sm text-muted-foreground mb-4">No formal quote created yet.</p>
      )}

      {showForm && product && (
        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border p-5 flex flex-col gap-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          {error && (
            <p
              className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5"
              style={{ borderRadius: "var(--radius)" }}
            >
              {error}
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <FormSelect label="Size" value={size} onChange={(e) => setSize(e.target.value)} options={product.sizes} />
            <FormSelect
              label="Colour"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              options={product.colours}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={handleQuantityChange}
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">Unit price (R)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={handleUnitPriceChange}
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground font-medium">Total price (R, optional)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Auto-calculated from quantity × unit price — edit to override"
              className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ borderRadius: "var(--radius)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground font-medium">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Shown on the quote and invoice PDFs — e.g. payment terms"
              className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              style={{ borderRadius: "var(--radius)" }}
            />
          </div>

          {quote.customisable && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground font-medium">Requirements / wording</label>
                <textarea
                  rows={3}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  style={{ borderRadius: "var(--radius)" }}
                />
              </div>
              <FontSelect value={font} onValueChange={setFont} />
              {/* Exactly one applies — see ProductQuoteCustomise.jsx for
                  the same split on the customer-facing side. */}
              {product.printingMethod === "Embroidered" ? (
                <ThreadColourSelect value={threadColourCode} onValueChange={setThreadColourCode} threadColours={threadColours} />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-foreground font-medium">Font colour</label>
                  <input
                    type="color"
                    value={fontColour}
                    onChange={(e) => setFontColour(e.target.value)}
                    className="w-11 h-11 border border-border cursor-pointer"
                    style={{ borderRadius: "var(--radius)" }}
                  />
                </div>
              )}
            </>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-accent text-accent-foreground py-2.5 px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start"
              style={{ borderRadius: "var(--radius)" }}
            >
              {submitting ? "Saving…" : latest ? "Issue new version" : "Save formal quote"}
            </button>
            {latest && (
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-foreground text-right">{value}</dd>
    </div>
  );
}
