import { Link } from "react-router";

export const STATUS_LABELS = {
  new: "New",
  awaiting_customer: "Awaiting customer",
  awaiting_company: "Awaiting us",
  finalised: "Finalised",
  accepted: "Accepted",
  cancelled: "Cancelled",
};

export function badgeStyle(quote) {
  if (quote.isStale) {
    return { background: "var(--destructive)", color: "var(--destructive-foreground)" };
  }
  if (quote.needsResponse) {
    return { background: "var(--accent)", color: "var(--accent-foreground)" };
  }
  return { background: "var(--secondary)", color: "var(--muted-foreground)" };
}

export function badgeLabel(quote) {
  return quote.isStale ? "Overdue" : quote.needsResponse ? "Needs reply" : STATUS_LABELS[quote.status] || quote.status;
}

export default function AdminQuoteListItem({ quote, isActive, compact = false }) {
  return (
    <Link
      to={`/admin/quotes/${quote.id}`}
      className="bg-card border p-4 flex items-center justify-between gap-4 hover:border-accent transition-colors"
      style={{
        borderRadius: "var(--radius)",
        borderColor: isActive ? "var(--accent)" : "var(--border)",
        borderWidth: isActive ? 2 : 1,
      }}
    >
      <div className="min-w-0">
        <p className="text-xs text-accent mb-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>
          {quote.quoteNumber || `Quote #${quote.id}`}
        </p>
        <p className="text-foreground font-medium mb-1 truncate">
          {quote.productName}
          {!compact && <span className="text-muted-foreground font-normal"> — {quote.customerName}</span>}
        </p>
        {!compact && (
          <p className="text-xs text-muted-foreground">
            {quote.size} · {quote.colour} · Qty {quote.quantity} · {new Date(quote.createdAt).toLocaleDateString()}
            {" · "}
            {quote.categoryLabel || "No category"}
          </p>
        )}
        {isActive && (
          <p className="text-xs text-accent font-medium mt-1">Currently active</p>
        )}
      </div>
      <span className="text-xs px-3 py-1 shrink-0" style={{ borderRadius: "var(--radius)", ...badgeStyle(quote) }}>
        {badgeLabel(quote)}
      </span>
    </Link>
  );
}
