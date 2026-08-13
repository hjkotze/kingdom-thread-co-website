import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { FONTS } from "../../lib/fonts";

// A native <select> can't render each <option> in its own font — this
// swaps to the Radix-based Select (src/app/components/ui/select.jsx,
// previously unused anywhere) so both the closed trigger and each item in
// the open list preview the font it names, not just say its name.
export default function FontSelect({ label = "Font", value, onValueChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-foreground font-medium">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className="w-full border-border bg-input-background focus-visible:ring-ring"
          style={{ borderRadius: "var(--radius)" }}
        >
          <SelectValue placeholder="Select…">
            {value ? <span style={{ fontFamily: value }}>{value}</span> : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="border-border bg-popover">
          {FONTS.map((f) => (
            <SelectItem key={f} value={f} style={{ fontFamily: f }}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
