import { Star } from "lucide-react";

// Display-only — used wherever a product's rating is shown. value is the
// average (or null if no ratings exist yet); count is how many.
export default function StarRating({ value, count, size = 12 }) {
  if (value === null || value === undefined) {
    return <span className="text-xs text-muted-foreground">No ratings yet</span>;
  }
  return (
    <span className="flex items-center gap-1.5">
      <Star size={size} className="fill-accent text-accent" />
      <span className="text-xs text-muted-foreground">
        {value} ({count})
      </span>
    </span>
  );
}
