import { useRef } from "react";
import { Upload } from "lucide-react";

export default function FileDropzone({ label, accept, helperText, fileName, onSelect }) {
  const inputRef = useRef(null);

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm text-foreground font-medium">{label}</label>}
      <div
        className="border-2 border-dashed border-border bg-input-background px-6 py-8 flex flex-col items-center gap-3 cursor-pointer hover:border-accent transition-colors"
        style={{ borderRadius: "var(--radius)" }}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={22} className="text-muted-foreground" />
        {fileName ? (
          <p className="text-sm text-foreground font-medium">{fileName}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-center">Click to upload or drag and drop</p>
            {helperText && (
              <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
                {helperText}
              </p>
            )}
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
          e.target.value = ""; // allow re-selecting the same file later
        }}
      />
    </div>
  );
}
