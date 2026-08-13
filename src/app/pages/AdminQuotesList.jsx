import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import AdminLayout from "../components/admin/AdminLayout";
import AdminQuoteListItem, { STATUS_LABELS } from "../components/quote/AdminQuoteListItem";
import { listAdminQuotes } from "../lib/api/adminQuotes";
import { checkEmailReplies } from "../lib/api/adminSettings";
import { ApiError } from "../lib/api/client";

// "cancelled" exists in the DB status enum but no code path ever sets it —
// omitted here (and on the dashboard tiles) as dead.
const STATUS_FILTERS = ["new", "awaiting_company", "awaiting_customer", "finalised", "accepted"];

// Not-yet-finalised quotes have no quote number — sorted to the end
// regardless of direction (a missing value isn't meaningfully "low" or
// "high"), same convention as most spreadsheet/table sort implementations.
function compareQuoteNumber(a, b, direction) {
  if (!a.quoteNumber && !b.quoteNumber) return 0;
  if (!a.quoteNumber) return 1;
  if (!b.quoteNumber) return -1;
  return direction * a.quoteNumber.localeCompare(b.quoteNumber);
}

const SORTERS = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  customerName: (a, b) => a.customerName.localeCompare(b.customerName),
  quoteNumberAsc: (a, b) => compareQuoteNumber(a, b, 1),
  quoteNumberDesc: (a, b) => compareQuoteNumber(a, b, -1),
};

const NO_CATEGORY = "__none__";

export default function AdminQuotesList() {
  const [quotes, setQuotes] = useState([]);
  const [activeQuoteId, setActiveQuoteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [checkingReplies, setCheckingReplies] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checkError, setCheckError] = useState("");

  const load = () => {
    return listAdminQuotes().then((data) => {
      setQuotes(data.quotes);
      setActiveQuoteId(data.activeQuoteId);
    });
  };

  useEffect(() => {
    let cancelled = false;
    load()
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load quotes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckReplies = async () => {
    setCheckingReplies(true);
    setCheckError("");
    setCheckResult(null);
    try {
      const summary = await checkEmailReplies();
      setCheckResult(summary);
      await load();
    } catch (err) {
      setCheckError(err instanceof ApiError ? err.message : "Failed to check for replies.");
    } finally {
      setCheckingReplies(false);
    }
  };

  const status = searchParams.get("status") || "all";
  const category = searchParams.get("category") || "all";

  const setStatus = (next) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === "all") params.delete("status");
      else params.set("status", next);
      return params;
    });
  };

  const setCategory = (next) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (next === "all") params.delete("category");
      else params.set("category", next);
      return params;
    });
  };

  const categoryOptions = useMemo(() => {
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

  const filtered = useMemo(() => {
    let list = quotes;
    if (status !== "all") list = list.filter((q) => q.status === status);
    if (category !== "all") {
      list = category === NO_CATEGORY
        ? list.filter((q) => !q.categorySlug)
        : list.filter((q) => q.categorySlug === category);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (quote) =>
          quote.customerName.toLowerCase().includes(q) ||
          quote.customerEmail.toLowerCase().includes(q) ||
          quote.productName.toLowerCase().includes(q) ||
          (quote.quoteNumber && quote.quoteNumber.toLowerCase().includes(q)),
      );
    }
    return [...list].sort(SORTERS[sort]);
  }, [quotes, status, category, search, sort]);

  return (
    <AdminLayout maxWidthClassName="max-w-4xl">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p
            className="text-accent text-xs tracking-widest uppercase mb-3"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Admin
          </p>
          <h1 className="text-2xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
            Quotes
          </h1>
        </div>
        <button
          onClick={handleCheckReplies}
          disabled={checkingReplies}
          className="text-xs px-4 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-accent transition-colors disabled:opacity-60"
          style={{ borderRadius: "var(--radius)" }}
        >
          {checkingReplies ? "Checking…" : "Check for replies now"}
        </button>
      </div>

      {checkResult && (
        <p
          className="text-sm text-accent bg-accent/10 border border-accent/30 px-4 py-2.5 mb-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          Checked {checkResult.found} message{checkResult.found === 1 ? "" : "s"} — {checkResult.matched} matched
          {checkResult.unmatched > 0 && `, ${checkResult.unmatched} unmatched`}
          {checkResult.errors > 0 && `, ${checkResult.errors} error${checkResult.errors === 1 ? "" : "s"}`}.
        </p>
      )}
      {checkError && (
        <p
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          {checkError}
        </p>
      )}

      {error && (
        <p
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          {error}
        </p>
      )}

      <div className="flex gap-2 flex-wrap mb-4">
        <FilterPill label="All" active={status === "all"} onClick={() => setStatus("all")} />
        {STATUS_FILTERS.map((s) => (
          <FilterPill key={s} label={STATUS_LABELS[s]} active={status === s} onClick={() => setStatus(s)} />
        ))}
      </div>

      <div className="flex gap-3 flex-wrap mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, email, product, or quote number…"
          className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring flex-1 min-w-[220px]"
          style={{ borderRadius: "var(--radius)" }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ borderRadius: "var(--radius)" }}
        >
          <option value="all">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label} ({c.count})
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ borderRadius: "var(--radius)" }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="customerName">Customer name A–Z</option>
          <option value="quoteNumberAsc">Quote number (smallest first)</option>
          <option value="quoteNumberDesc">Quote number (largest first)</option>
        </select>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && (
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} of {quotes.length} shown
        </p>
      )}
      {!loading && quotes.length === 0 && <p className="text-sm text-muted-foreground">No quotes yet.</p>}
      {!loading && quotes.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No quotes match your filters.</p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((quote) => (
          <AdminQuoteListItem key={quote.id} quote={quote} isActive={quote.id === activeQuoteId} />
        ))}
      </div>
    </AdminLayout>
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
