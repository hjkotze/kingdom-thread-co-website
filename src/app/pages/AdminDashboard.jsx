import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { listAdminQuotes } from "../lib/api/adminQuotes";
import { listAdminOrders } from "../lib/api/adminOrders";
import { ApiError } from "../lib/api/client";
import AdminLayout from "../components/admin/AdminLayout";

const NO_CATEGORY = "__none__";

// "cancelled" exists in the DB status enum but no code path ever sets it —
// omitted here (and on the quotes list page's status filter) as dead.
const STATUS_TILES = [
  { status: "new", label: "New requests" },
  { status: "awaiting_company", label: "Awaiting your reply" },
  { status: "awaiting_customer", label: "Awaiting customer" },
  { status: "finalised", label: "Finalised" },
  { status: "accepted", label: "Accepted" },
];

// Landing page for admin login — status/category counts you can drill into,
// not a working queue itself (that's /admin/quotes now).
export default function AdminDashboard() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAdminQuotes(), listAdminOrders()])
      .then(([quotesData, ordersData]) => {
        if (cancelled) return;
        setQuotes(quotesData.quotes);
        setOrders(ordersData.orders);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load quotes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const combinedOrderCount = useMemo(() => orders.filter((o) => o.combined).length, [orders]);

  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_TILES.forEach((t) => {
      counts[t.status] = { total: 0, overdue: 0 };
    });
    quotes.forEach((q) => {
      if (!counts[q.status]) return;
      counts[q.status].total += 1;
      if (q.isStale) counts[q.status].overdue += 1;
    });
    return counts;
  }, [quotes]);

  const categoryCounts = useMemo(() => {
    const map = new Map();
    quotes.forEach((q) => {
      const key = q.categorySlug ?? NO_CATEGORY;
      if (!map.has(key)) {
        map.set(key, { slug: key, label: q.categoryLabel || "No category", count: 0 });
      }
      map.get(key).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [quotes]);

  return (
    <AdminLayout>
      <div className="mb-10">
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

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          Quotes by status
        </h2>
        <Link to="/admin/quotes" className="text-xs text-accent font-medium">
          View all quotes →
        </Link>
      </div>

      {error && (
        <p
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-muted-foreground mb-8">Loading…</p>}

      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          <Link
            to="/admin/orders?combined=1"
            className="bg-card border border-border p-5 hover:border-accent transition-colors"
            style={{ borderRadius: "var(--radius)" }}
          >
            <p className="text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
              {combinedOrderCount}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Combined orders</p>
          </Link>
          {STATUS_TILES.map((tile) => {
            const counts = statusCounts[tile.status];
            return (
              <Link
                key={tile.status}
                to={`/admin/quotes?status=${tile.status}`}
                className="bg-card border border-border p-5 hover:border-accent transition-colors"
                style={{ borderRadius: "var(--radius)" }}
              >
                <p className="text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {counts.total}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{tile.label}</p>
                {counts.overdue > 0 && (
                  <p className="text-xs text-destructive font-medium mt-1">{counts.overdue} overdue</p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {!loading && categoryCounts.length > 0 && (
        <>
          <h2 className="text-lg text-foreground mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Quotes by category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categoryCounts.map((c) => (
              <Link
                key={c.slug}
                to={`/admin/quotes?category=${c.slug}`}
                className="bg-card border border-border p-5 hover:border-accent transition-colors"
                style={{ borderRadius: "var(--radius)" }}
              >
                <p className="text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {c.count}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{c.label}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
