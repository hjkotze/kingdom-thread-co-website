import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../../lib/api/client";
import { fetchThreadColours } from "../../lib/api/threadColours";
import { createSnapshot } from "../../lib/api/adminQuotes";
import { FONTS } from "../../lib/fonts";
import FormSelect from "./FormSelect";

export default function AdminFormalQuoteSection({ quote, snapshots, onCreated }) {
  const latest = snapshots[0] || null;
  const [product, setProduct] = useState(null);
  const [threadColours, setThreadColours] = useState([]);

  const seed = latest || quote;
  const [size, setSize] = useState(seed.size);
  const [colour, setColour] = useState(seed.colour);
  const [quantity, setQuantity] = useState(seed.quantity);
  const [price, setPrice] = useState(latest?.price ?? quote.price ?? "");
  const [requirements, setRequirements] = useState(seed.requirements || "");
  const [font, setFont] = useState(seed.font || "");
  const [fontColour, setFontColour] = useState(seed.fontColour || "#000000");
  const [threadColourCode, setThreadColourCode] = useState(seed.threadColourCode || "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(!latest);

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
            <Row label="Size" value={latest.size} />
            <Row label="Colour" value={latest.colour} />
            <Row label="Quantity" value={latest.quantity} />
            {latest.price !== null && <Row label="Price" value={`R${latest.price}`} />}
            {latest.requirements && <Row label="Requirements" value={latest.requirements} />}
            {latest.font && <Row label="Font" value={latest.font} />}
            {latest.fontColour && <Row label="Font colour" value={latest.fontColour} />}
            {latest.threadColourCode && <Row label="Thread colour" value={latest.threadColourCode} />}
          </dl>
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
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">Price (R, optional)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>
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
              <FormSelect label="Font" value={font} onChange={(e) => setFont(e.target.value)} options={FONTS} />
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
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground font-medium">Thread colour</label>
                <select
                  value={threadColourCode}
                  onChange={(e) => setThreadColourCode(e.target.value)}
                  className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <option value="">Select a thread colour…</option>
                  {threadColours.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-accent text-accent-foreground py-2.5 px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start"
              style={{ borderRadius: "var(--radius)" }}
            >
              {submitting ? "Saving…" : latest ? "Issue new version" : "Create formal quote"}
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
