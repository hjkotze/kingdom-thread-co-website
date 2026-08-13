import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import AdminLayout from "../components/admin/AdminLayout";
import { listAdminOrders, updateOrderStatus } from "../lib/api/adminOrders";
import { ApiError } from "../lib/api/client";
import { STATUSES, ADMIN_LABELS } from "../lib/orderStatus";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = () => {
    return listAdminOrders().then((data) => setOrders(data.orders));
  };

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load orders.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (orderId, status) => {
    setSavingId(orderId);
    setError("");
    try {
      await updateOrderStatus(orderId, status);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setSavingId(null);
    }
  };

  const combinedOnly = searchParams.get("combined") === "1";
  const filtered = combinedOnly ? orders.filter((o) => o.combined) : orders;

  const toggleCombinedOnly = () => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (combinedOnly) params.delete("combined");
      else params.set("combined", "1");
      return params;
    });
  };

  return (
    <AdminLayout maxWidthClassName="max-w-4xl">
      <div className="mb-8">
        <p
          className="text-accent text-xs tracking-widest uppercase mb-3"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          Admin
        </p>
        <h1 className="text-2xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          Orders
        </h1>
      </div>

      {error && (
        <p
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-2 flex-wrap mb-4">
        <FilterPill label="All orders" active={!combinedOnly} onClick={toggleCombinedOnly} />
        <FilterPill label="Combined only" active={combinedOnly} onClick={toggleCombinedOnly} />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && filtered.length === 0 && <p className="text-sm text-muted-foreground">No orders match.</p>}

      <div className="flex flex-col gap-3">
        {filtered.map((order) => {
          const expanded = expandedId === order.id;
          return (
            <div key={order.id} className="bg-card border border-border" style={{ borderRadius: "var(--radius)" }}>
              <div className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <button
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  className="min-w-0 text-left flex-1"
                >
                  <p className="text-foreground font-medium mb-1 flex items-center gap-2 flex-wrap">
                    Order {order.orderNumber || `#${order.id}`} — {order.customerName}
                    {order.combined && (
                      <span
                        className="text-xs px-2.5 py-1"
                        style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "var(--accent-foreground)" }}
                      >
                        Combined — {order.itemCount} items
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.invoiceNumber || "No invoice"} · {new Date(order.createdAt).toLocaleDateString()}
                    {order.total !== null && ` · R${order.total.toFixed(2)}`}
                    {order.total !== null && order.outstanding > 0 && ` · R${order.outstanding.toFixed(2)} outstanding`}
                    {order.workOrderCount > 0 && ` · ${order.workOrderCount} work order${order.workOrderCount === 1 ? "" : "s"}`}
                  </p>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={order.status}
                    disabled={savingId === order.id}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="bg-input-background border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ADMIN_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setExpandedId(expanded ? null : order.id)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expanded ? "Hide" : "Show"} items
                  </button>
                </div>
              </div>
              {expanded && (
                <div className="border-t border-border px-4 py-4 flex flex-col gap-4">
                  {order.lines.map((line) => (
                    <div
                      key={line.quoteId}
                      className="bg-background border border-border p-4"
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <Link
                          to={`/admin/quotes/${line.quoteId}`}
                          className="text-foreground font-medium hover:text-accent transition-colors"
                        >
                          {line.productName}
                        </Link>
                        <span className="text-xs text-muted-foreground shrink-0">Quote #{line.quoteId}</span>
                      </div>
                      <dl className="flex flex-col gap-1.5 text-sm">
                        <LineRow label="Size" value={line.size} />
                        <LineRow label="Colour" value={line.colour} />
                        <LineRow label="Quantity" value={line.quantity} />
                        <LineRow label="Unit price" value={`R${line.unitPrice.toFixed(2)}`} />
                        <LineRow label="Amount" value={`R${line.amount.toFixed(2)}`} />
                        {line.requirements && <LineRow label="Requirements" value={line.requirements} />}
                        {line.font && <LineRow label="Font" value={line.font} />}
                        {line.fontColour && <LineRow label="Font colour" value={line.fontColour} />}
                        {line.threadColourCode && <LineRow label="Thread colour" value={line.threadColourCode} />}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}

function LineRow({ label, value }) {
  return (
    <div className="flex justify-between gap-6 border-b border-border pb-1.5 last:border-0 last:pb-0">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-foreground text-right">{value}</dd>
    </div>
  );
}

function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xs px-4 py-2 border transition-colors"
      style={{
        borderRadius: "var(--radius)",
        borderColor: active ? "var(--accent)" : "var(--border)",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "var(--accent-foreground)" : "var(--muted-foreground)",
      }}
    >
      {label}
    </button>
  );
}
