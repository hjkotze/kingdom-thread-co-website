import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

function Swatch({ hex }) {
  return (
    <span
      className="w-4 h-4 shrink-0 border border-border"
      style={{ borderRadius: "var(--radius)", background: hex || "transparent" }}
    />
  );
}

// Native <option>s can only ever be plain text, so a colour swatch inside
// the list — and next to the selected value once closed — needs the
// Radix-based Select (src/app/components/ui/select.jsx) instead of a bare
// <select>. Both the trigger and each item show swatch + code — name, the
// same "code — name" pairing used everywhere else thread colours appear.
export default function ThreadColourSelect({ label = "Thread colour", value, onValueChange, threadColours }) {
  const selected = threadColours.find((c) => c.code === value);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-foreground font-medium">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className="w-full border-border bg-input-background focus-visible:ring-ring"
          style={{ borderRadius: "var(--radius)" }}
        >
          <SelectValue placeholder="Select a thread colour…">
            {selected ? (
              <>
                <Swatch hex={selected.hex} />
                {selected.code} — {selected.name}
              </>
            ) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="border-border bg-popover">
          {threadColours.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <Swatch hex={c.hex} />
              {c.code} — {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
