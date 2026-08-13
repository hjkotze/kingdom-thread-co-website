import { useState } from "react";
import { X } from "lucide-react";

// Chip-style input for array-of-strings fields (Sizes/Colours) — type a
// value, press Enter or "," to add it, click a chip's × to remove it.
export default function TagListInput({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const addValue = () => {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addValue();
    } else if (e.key === "Backspace" && !draft && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  const removeValue = (value) => onChange(values.filter((v) => v !== value));

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-foreground font-medium">{label}</label>
      <div
        className="bg-input-background border border-border px-3 py-2 flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-ring"
        style={{ borderRadius: "var(--radius)" }}
      >
        {values.map((value) => (
          <span
            key={value}
            className="bg-secondary text-foreground text-xs px-2.5 py-1 flex items-center gap-1.5"
            style={{ borderRadius: "var(--radius)" }}
          >
            {value}
            <button type="button" onClick={() => removeValue(value)} aria-label={`Remove ${value}`}>
              <X size={12} className="text-muted-foreground hover:text-foreground" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addValue}
          placeholder={values.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
    </div>
  );
}
