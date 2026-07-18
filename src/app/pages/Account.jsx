import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { listQuotes } from "../lib/api/quotes";

const STATUS_LABELS = {
  new: "New",
  awaiting_customer: "Awaiting your response",
  awaiting_company: "Awaiting our response",
  finalised: "Finalised",
  accepted: "Accepted",
  cancelled: "Cancelled",
};

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listQuotes()
      .then((data) => {
        if (!cancelled) setQuotes(data.quotes);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <section className="min-h-screen bg-background py-28 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <p
              className="text-accent text-xs tracking-widest uppercase mb-3"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Your account
            </p>
            <h1
              className="text-4xl text-foreground"
              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
            >
              Welcome, {user.fullName.split(" ")[0]}.
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-2"
          >
            Log out
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Your quote requests
          </h2>
          <Link
            to="/#shop"
            className="bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ borderRadius: "var(--radius)" }}
          >
            Start a new quote request
          </Link>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && quotes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t requested a quote yet. Browse the shop and pick a product to get started.
          </p>
        )}

        <div className="flex flex-col gap-3">
          {quotes.map((quote) => {
            const pending = quote.status === "awaiting_customer" || quote.status === "finalised";
            return (
              <Link
                key={quote.id}
                to={`/account/quotes/${quote.id}`}
                className="bg-card border border-border p-5 flex items-center justify-between gap-4 hover:border-accent transition-colors"
                style={{ borderRadius: "var(--radius)" }}
              >
                <div>
                  <p className="text-foreground font-medium mb-1">{quote.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {quote.size} · {quote.colour} · Qty {quote.quantity} ·{" "}
                    {new Date(quote.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className="text-xs px-3 py-1 shrink-0"
                  style={{
                    borderRadius: "var(--radius)",
                    background: pending ? "var(--accent)" : "var(--secondary)",
                    color: pending ? "var(--accent-foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {STATUS_LABELS[quote.status] || quote.status}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
