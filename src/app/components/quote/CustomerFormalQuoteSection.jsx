import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { acceptQuote, quotePdfUrl } from "../../lib/api/quotes";
import { ApiError } from "../../lib/api/client";

// The formal quote is deliberately shown separately from the Communication
// thread below — a locked snapshot of only what was agreed, not the raw
// back-and-forth (§5).
export default function CustomerFormalQuoteSection({ quote, snapshot, onAccepted }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  if (!snapshot) return null;

  const handleAccept = async () => {
    if (!agreedToPolicy) {
      setError("Please agree to the Privacy Policy to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await acceptQuote(quote.id);
      onAccepted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to accept. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-sm text-foreground font-medium mb-4">Formal quote</h2>
      <div
        className="border p-6"
        style={{
          borderRadius: "var(--radius)",
          borderColor: snapshot.acceptedByCustomer ? "var(--accent)" : "var(--border)",
          background: "var(--card)",
        }}
      >
        {snapshot.acceptedByCustomer ? (
          <p className="flex items-center gap-2 text-sm text-accent font-medium mb-4">
            <CheckCircle2 size={16} /> Accepted {new Date(snapshot.acceptedAt).toLocaleDateString()}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">
            This is the locked, agreed-upon version of your request. Review and accept to confirm we should go
            ahead — full payment is due on acceptance.
          </p>
        )}

        <dl className="flex flex-col gap-3 text-sm mb-4">
          {snapshot.quoteNumber && <Row label="Quote number" value={snapshot.quoteNumber} />}
          <Row label="Product" value={snapshot.productName} />
          <Row label="Size" value={snapshot.size} />
          <Row label="Colour" value={snapshot.colour} />
          <Row label="Quantity" value={snapshot.quantity} />
          {snapshot.unitPrice !== null && <Row label="Unit price" value={`R${snapshot.unitPrice}`} />}
          {snapshot.price !== null && <Row label="Price" value={`R${snapshot.price}`} />}
          {snapshot.requirements && <Row label="Requirements" value={snapshot.requirements} />}
          {snapshot.font && <Row label="Font" value={snapshot.font} />}
          {snapshot.fontColour && <Row label="Font colour" value={snapshot.fontColour} />}
          {snapshot.threadColourCode && <Row label="Thread colour" value={snapshot.threadColourCode} />}
          {snapshot.notes && <Row label="Notes" value={snapshot.notes} />}
        </dl>

        {snapshot.quoteNumber && (
          <a
            href={quotePdfUrl(quote.id)}
            className="text-sm text-accent font-medium mb-4 inline-block"
            target="_blank"
            rel="noreferrer"
          >
            Download quote PDF
          </a>
        )}

        {error && (
          <p
            className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-4"
            style={{ borderRadius: "var(--radius)" }}
          >
            {error}
          </p>
        )}

        {!snapshot.acceptedByCustomer && (
          <>
            <label className="flex items-start gap-2.5 text-sm text-foreground cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={agreedToPolicy}
                onChange={(e) => setAgreedToPolicy(e.target.checked)}
                className="w-4 h-4 mt-0.5 shrink-0"
              />
              <span>
                I agree to the{" "}
                <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-accent font-medium">
                  Privacy Policy
                </a>
              </span>
            </label>
            <button
              onClick={handleAccept}
              disabled={submitting || !agreedToPolicy}
              className="bg-accent text-accent-foreground py-2.5 px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ borderRadius: "var(--radius)" }}
            >
              {submitting ? "Accepting…" : "Accept this quote"}
            </button>
          </>
        )}
      </div>
    </div>
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
