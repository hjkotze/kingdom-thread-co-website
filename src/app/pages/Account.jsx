import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { listQuotes } from "../lib/api/quotes";
import { listMyOrders } from "../lib/api/orders";
import { ApiError } from "../lib/api/client";
import { STATUSES, CUSTOMER_LABELS, SHIPPED_STATUSES } from "../lib/orderStatus";
import Header from "../components/Header";

const QUOTE_STATUS_LABELS = {
  new: "New",
  awaiting_customer: "Awaiting your response",
  awaiting_company: "Awaiting our response",
  finalised: "Finalised",
  accepted: "Accepted",
  cancelled: "Cancelled",
};

// "cancelled" exists in the DB status enum but no code path ever sets it —
// omitted here as dead, same reasoning as the admin quotes list filters.
const QUOTE_STATUSES = ["new", "awaiting_company", "awaiting_customer", "finalised", "accepted"];

// Header.jsx's "not yet shipped" badge links here as a comma-separated list
// of every unshipped status — recognised specially below so that lands on
// a friendly "Not yet shipped" heading instead of a generic fallback.
const UNSHIPPED_STATUSES = STATUSES.filter((s) => !SHIPPED_STATUSES.includes(s));
const AWAITING_REPLY_STATUSES = ["awaiting_customer", "finalised"];

// Two top-level entry points — orders (production/shipping) and quotes
// (the request/negotiation stage before an order exists) — each with its
// own status dashboard, kept deliberately separate: mixing them meant
// selecting e.g. "Finalised" (a quote status) still rendered the entire
// unfiltered orders list above it, pushing what you actually asked for
// below the fold.
export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [combining, setCombining] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const view = searchParams.get("view"); // "orders" | "quotes" | null (landing)
  // Supports a comma-separated list (e.g. "awaiting_customer,finalised",
  // used by the header's "awaiting your reply" badge, which counts both).
  const statusParam = searchParams.get("status");
  const statusFilter = statusParam ? statusParam.split(",") : null;

  const showLanding = !view && !combining;
  const showOrdersDashboard = view === "orders" && !statusFilter;
  const showOrdersList = view === "orders" && Boolean(statusFilter);
  const showQuotesDashboard = view === "quotes" && !statusFilter && !combining;
  const showQuotesList = view === "quotes" && (Boolean(statusFilter) || combining);

  const handleBack = () => {
    if (showOrdersList) {
      setSearchParams({ view: "orders" });
    } else if (showQuotesList) {
      setCombining(false);
      setSelectedIds([]);
      setSearchParams({ view: "quotes" });
    } else {
      setSearchParams({});
    }
  };
  const backLabel =
    showOrdersList || showQuotesList ? `Back to ${view === "orders" ? "Orders" : "Quotes"}` : "Back to dashboard";

  useEffect(() => {
    let cancelled = false;
    Promise.all([listQuotes(), listMyOrders()])
      .then(([quotesData, ordersData]) => {
        if (cancelled) return;
        setQuotes(quotesData.quotes);
        setOrders(ordersData.orders);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load your account. Please try again.");
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

  // Combinable = a formal quote is ready and it hasn't been accepted (as
  // part of any order) yet — same eligibility rule the backend enforces
  // in orders.service.js#getEligibleQuoteForAccept.
  const eligibleIds = useMemo(
    () => new Set(quotes.filter((q) => q.status === "finalised" && !q.orderId).map((q) => q.id)),
    [quotes],
  );

  const quoteStatusCounts = useMemo(() => {
    const counts = {};
    QUOTE_STATUSES.forEach((s) => {
      counts[s] = 0;
    });
    quotes.forEach((q) => {
      if (counts[q.status] !== undefined) counts[q.status] += 1;
    });
    return counts;
  }, [quotes]);

  const orderStatusCounts = useMemo(() => {
    const counts = {};
    STATUSES.forEach((s) => {
      counts[s] = 0;
    });
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status] += 1;
    });
    return counts;
  }, [orders]);

  const awaitingResponseCount = quoteStatusCounts.awaiting_customer;

  // The list shown once a specific status (or the combine-selection mode)
  // has been picked — never a mixed "everything" list.
  const quotesForList = useMemo(() => {
    if (combining) return quotes.filter((q) => eligibleIds.has(q.id));
    return statusFilter ? quotes.filter((q) => statusFilter.includes(q.status)) : quotes;
  }, [quotes, statusFilter, combining, eligibleIds]);

  const ordersForList = useMemo(
    () => (statusFilter ? orders.filter((o) => statusFilter.includes(o.status)) : orders),
    [orders, statusFilter],
  );

  const quoteListHeading = combining
    ? "Select requests to combine"
    : statusFilter && statusFilter.length === 1
      ? QUOTE_STATUS_LABELS[statusFilter[0]] || statusFilter[0]
      : statusFilter && statusFilter.join(",") === AWAITING_REPLY_STATUSES.join(",")
        ? "Awaiting your reply"
        : "Filtered quotes";

  const orderListHeading =
    statusFilter && statusFilter.length === 1
      ? CUSTOMER_LABELS[statusFilter[0]] || statusFilter[0]
      : statusFilter && statusFilter.join(",") === UNSHIPPED_STATUSES.join(",")
        ? "Not yet shipped"
        : "Orders";

  const toggleCombining = () => {
    setCombining((c) => !c);
    setSelectedIds([]);
  };

  const toggleSelected = (id) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const selectAll = () => setSelectedIds(Array.from(eligibleIds));

  const handleReview = () => {
    navigate(`/account/orders/review?ids=${selectedIds.join(",")}`);
  };

  return (
    <>
      <Header />
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

        {error && (
          <p
            className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-8"
            style={{ borderRadius: "var(--radius)" }}
          >
            {error}
          </p>
        )}

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!showLanding && (
          <button onClick={handleBack} className="text-sm text-accent font-medium mb-6">
            ← {backLabel}
          </button>
        )}

        {/* Landing — choose Orders or Quotes. */}
        {!loading && showLanding && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <h2 className="text-lg text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                Your account
              </h2>
              <Link
                to="/#shop"
                className="bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ borderRadius: "var(--radius)" }}
              >
                Start a new quote request
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link
                to="/account?view=orders"
                className="bg-card border border-border p-6 hover:border-accent transition-colors"
                style={{ borderRadius: "var(--radius)" }}
              >
                <p className="text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {orders.length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Order{orders.length === 1 ? "" : "s"} — production &amp; shipping status
                </p>
              </Link>
              <Link
                to="/account?view=quotes"
                className="bg-card border border-border p-6 hover:border-accent transition-colors"
                style={{ borderRadius: "var(--radius)" }}
              >
                <p className="text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {quotes.length}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Quote request{quotes.length === 1 ? "" : "s"}</p>
                {awaitingResponseCount > 0 && (
                  <p className="text-xs text-accent font-medium mt-2">
                    {awaitingResponseCount} awaiting your response
                  </p>
                )}
              </Link>
            </div>
          </div>
        )}

        {/* Orders — status dashboard. */}
        {!loading && showOrdersDashboard && (
          <div className="mb-10">
            <h2
              className="text-lg text-foreground mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Orders
            </h2>
            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">You don&apos;t have any orders yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {STATUSES.map((status) => (
                  <Link
                    key={status}
                    to={`/account?view=orders&status=${status}`}
                    className="bg-card border border-border p-5 hover:border-accent transition-colors"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    <p className="text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {orderStatusCounts[status]}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{CUSTOMER_LABELS[status]}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders — the orders in the one status picked. */}
        {!loading && showOrdersList && (
          <div className="mb-10">
            <h2
              className="text-lg text-foreground mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {orderListHeading}
            </h2>
            {ordersForList.length === 0 && (
              <p className="text-sm text-muted-foreground">No orders in this status.</p>
            )}
            <div className="flex flex-col gap-3">
              {ordersForList.map((order) => (
                <Link
                  key={order.orderId}
                  to={`/account/quotes/${order.lines[0]?.quoteId}`}
                  className="bg-card border border-border p-5 flex flex-col gap-2 hover:border-accent transition-colors"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-foreground font-medium">
                      Order {order.orderNumber || `#${order.orderId}`}
                      {order.combined && (
                        <span
                          className="ml-2 text-xs px-2.5 py-1 align-middle"
                          style={{ borderRadius: "var(--radius)", background: "var(--accent)", color: "var(--accent-foreground)" }}
                        >
                          Combined — {order.itemCount} items
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {order.lines.map((l) => l.productName).join(", ")}
                  </p>
                  <p className="text-xs text-accent font-medium">{order.statusLabel}</p>
                  {order.invoice && (
                    <p className="text-xs text-muted-foreground">
                      Invoice {order.invoice.invoiceNumber} · R{order.invoice.total.toFixed(2)}
                      {order.invoice.outstanding > 0
                        ? ` · R${order.invoice.outstanding.toFixed(2)} outstanding`
                        : " · Paid in full"}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quotes — status dashboard. */}
        {!loading && showQuotesDashboard && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <h2 className="text-lg text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                Quotes
              </h2>
              <div className="flex items-center gap-3">
                {eligibleIds.size > 1 && (
                  <button onClick={toggleCombining} className="text-sm text-accent font-medium">
                    Combine requests
                  </button>
                )}
                <Link
                  to="/#shop"
                  className="bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  Start a new quote request
                </Link>
              </div>
            </div>
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t requested a quote yet. Browse the shop and pick a product to get started.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {QUOTE_STATUSES.map((status) => (
                  <Link
                    key={status}
                    to={`/account?view=quotes&status=${status}`}
                    className="bg-card border border-border p-5 hover:border-accent transition-colors"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    <p className="text-3xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                      {quoteStatusCounts[status]}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{QUOTE_STATUS_LABELS[status]}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quotes — the quotes in the one status picked, or the
            combine-selection list. */}
        {!loading && showQuotesList && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <h2 className="text-lg text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
                {quoteListHeading}
              </h2>
              {combining && (
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={selectAll} className="text-xs text-accent font-medium">
                    Select all ({eligibleIds.size})
                  </button>
                  <button
                    onClick={handleReview}
                    disabled={selectedIds.length === 0}
                    className="bg-accent text-accent-foreground px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    Review & accept ({selectedIds.length})
                  </button>
                </div>
              )}
            </div>

            {combining && (
              <p className="text-sm text-muted-foreground mb-4">
                Select the requests to combine into one order — one shipping charge, one invoice.
              </p>
            )}

            {quotesForList.length === 0 && (
              <p className="text-sm text-muted-foreground">No quote requests match this filter.</p>
            )}

            <div className="flex flex-col gap-3">
              {quotesForList.map((quote) => {
                const pending = quote.status === "awaiting_customer" || quote.status === "finalised";
                const content = (
                  <>
                    {combining && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(quote.id)}
                        onChange={() => toggleSelected(quote.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
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
                      {QUOTE_STATUS_LABELS[quote.status] || quote.status}
                    </span>
                  </>
                );

                const className =
                  "bg-card border border-border p-5 flex items-center gap-4 hover:border-accent transition-colors";
                const style = { borderRadius: "var(--radius)" };

                return combining ? (
                  <label key={quote.id} className={`${className} cursor-pointer`} style={style}>
                    {content}
                  </label>
                ) : (
                  <Link key={quote.id} to={`/account/quotes/${quote.id}`} className={className} style={style}>
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </section>
    </>
  );
}
