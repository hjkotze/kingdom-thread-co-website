import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { fetchMyRating, submitRating } from "../../lib/api/ratings";
import { ApiError } from "../../lib/api/client";

// Only ever rendered where eligibility is already guaranteed by context
// (a customer looking at their own quote for this exact product) — it
// doesn't check eligibility itself, a 403 from the API is the only
// failure path, and that'd mean this widget was placed somewhere it
// shouldn't be.
export default function RateProductWidget({ productId, productName }) {
  const [myRating, setMyRating] = useState(null);
  const [hovered, setHovered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchMyRating(productId)
      .then((data) => {
        if (!cancelled) setMyRating(data.rating);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleRate = async (value) => {
    setSubmitting(true);
    setError("");
    setJustSaved(false);
    try {
      await submitRating(productId, value);
      setMyRating(value);
      setJustSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const displayValue = hovered || myRating || 0;

  return (
    <div
      className="bg-card border border-border p-5 mb-8 flex flex-col gap-2"
      style={{ borderRadius: "var(--radius)" }}
    >
      <p className="text-sm text-foreground font-medium">
        {myRating ? `Your rating for ${productName}` : `Rate ${productName}`}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={submitting}
              onMouseEnter={() => setHovered(n)}
              onClick={() => handleRate(n)}
              aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
              className="disabled:opacity-60"
            >
              <Star size={22} className={n <= displayValue ? "fill-accent text-accent" : "text-muted-foreground"} />
            </button>
          ))}
        </div>
        {justSaved && !submitting && <span className="text-xs text-accent">Saved</span>}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
