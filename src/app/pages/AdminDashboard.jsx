import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { listAdminQuotes } from "../lib/api/adminQuotes";
import AdminQuoteListItem from "../components/quote/AdminQuoteListItem";

// The queue, sorted by urgency server-side (overdue, then needs-reply
// oldest-first, then everything else by recency) — a working queue, not a
// reporting tool (§7).
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [activeQuoteId, setActiveQuoteId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listAdminQuotes()
      .then((data) => {
        if (!cancelled) {
          setQuotes(data.quotes);
          setActiveQuoteId(data.activeQuoteId);
        }
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

  const overdueCount = quotes.filter((q) => q.isStale).length;
  const needsReplyCount = quotes.filter((q) => q.needsResponse).length;

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

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Quote queue
          </h2>
          {!loading && (needsReplyCount > 0 || overdueCount > 0) && (
            <p className="text-xs text-muted-foreground">
              {overdueCount > 0 && <span className="text-destructive font-medium">{overdueCount} overdue</span>}
              {overdueCount > 0 && needsReplyCount > 0 && " · "}
              {needsReplyCount > 0 && `${needsReplyCount} need${needsReplyCount === 1 ? "s" : ""} a reply`}
            </p>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && quotes.length === 0 && <p className="text-sm text-muted-foreground">No quotes yet.</p>}

        <div className="flex flex-col gap-3">
          {quotes.map((quote) => (
            <AdminQuoteListItem key={quote.id} quote={quote} isActive={quote.id === activeQuoteId} />
          ))}
        </div>
      </div>
    </section>
  );
}
