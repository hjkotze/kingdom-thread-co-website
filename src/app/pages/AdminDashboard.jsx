import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { listAdminQuotes } from "../lib/api/adminQuotes";

const STATUS_LABELS = {
  new: "New",
  awaiting_customer: "Awaiting customer",
  awaiting_company: "Awaiting us",
  finalised: "Finalised",
  accepted: "Accepted",
  cancelled: "Cancelled",
};

// A flat list for now — the real queue view with unanswered/stale
// highlighting and the single "active item" claim (§7) lands in Phase 7.
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listAdminQuotes()
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
    navigate("/admin/login");
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
              Admin
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

        <h2 className="text-lg text-foreground mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
          All quote requests
        </h2>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && quotes.length === 0 && <p className="text-sm text-muted-foreground">No quotes yet.</p>}

        <div className="flex flex-col gap-3">
          {quotes.map((quote) => (
            <Link
              key={quote.id}
              to={`/admin/quotes/${quote.id}`}
              className="bg-card border border-border p-5 flex items-center justify-between gap-4 hover:border-accent transition-colors"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div>
                <p className="text-foreground font-medium mb-1">
                  {quote.productName} <span className="text-muted-foreground font-normal">— {quote.customerName}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {quote.size} · {quote.colour} · Qty {quote.quantity} ·{" "}
                  {new Date(quote.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className="text-xs px-3 py-1 shrink-0"
                style={{ borderRadius: "var(--radius)", background: "var(--secondary)", color: "var(--muted-foreground)" }}
              >
                {STATUS_LABELS[quote.status] || quote.status}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
