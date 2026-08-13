import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { listEligibleOrders, createOrder } from "../lib/api/orders";
import { ApiError } from "../lib/api/client";
import Header from "../components/Header";

export default function OrderReview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = searchParams.get("ids")?.split(",").map(Number).filter(Boolean) || [];

  const [lines, setLines] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listEligibleOrders()
      .then((data) => {
        if (!cancelled) setLines(data.lines.filter((l) => ids.includes(l.quoteId)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccept = async () => {
    if (!agreedToPolicy) {
      setError("Please agree to the Privacy Policy to continue.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createOrder(ids);
      navigate("/account");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to accept. Please try again.");
      setSubmitting(false);
    }
  };

  const subtotal = (lines || []).reduce((sum, l) => sum + (l.amount || 0), 0);

  return (
    <>
      <Header />
      <section className="min-h-screen bg-background py-28 px-6">
        <div className="max-w-2xl mx-auto">
          <Link to="/account" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft size={14} /> Back to your account
          </Link>

          <p className="text-accent text-xs tracking-widest uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>
            Review order
          </p>
          <h1 className="text-3xl text-foreground mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>
            {ids.length > 1 ? `Combine ${ids.length} requests` : "Accept this request"}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {ids.length > 1
              ? "These requests will be billed as one order with a single shipping charge."
              : "Review the details below before accepting."}
          </p>

          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

          {!loading && lines && (
            <>
              <div className="border border-border mb-6" style={{ borderRadius: "var(--radius)" }}>
                {lines.map((line, index) => (
                  <div
                    key={line.quoteId}
                    className="p-5 flex items-center justify-between gap-4"
                    style={{ borderTop: index > 0 ? "1px solid var(--border)" : "none" }}
                  >
                    <div className="min-w-0">
                      <p className="text-foreground font-medium">{line.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.size} · {line.colour} · Qty {line.quantity}
                      </p>
                    </div>
                    <p className="text-sm text-foreground shrink-0">R{(line.amount || 0).toFixed(2)}</p>
                  </div>
                ))}
                <div className="px-5 py-4 border-t border-border flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground font-medium">R{subtotal.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-6">
                Shipping and VAT are calculated on your invoice once accepted — combining reduces shipping to a
                single charge for the whole order. Full payment is due on acceptance.
              </p>

              {error && (
                <p
                  className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-4"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  {error}
                </p>
              )}

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
                disabled={submitting || lines.length === 0 || !agreedToPolicy}
                className="bg-accent text-accent-foreground py-3.5 px-8 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                style={{ borderRadius: "var(--radius)" }}
              >
                {submitting ? "Accepting…" : "Accept & pay in full"}
              </button>
            </>
          )}
        </div>
      </section>
    </>
  );
}
