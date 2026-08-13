import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";

// Shows the current image (if any) with a file picker for staging a
// replacement. Doesn't upload anything itself — the parent form calls the
// relevant uploadProductImage/uploadCategoryImage API after its own
// create/update call succeeds (same two-step pattern QuoteReview.jsx uses
// for quote attachments: create the record, then upload against its ID).
export default function ImageField({ label, imageUrl, onFileSelected }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    onFileSelected(file);
  };

  const displayUrl = previewUrl || imageUrl;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-foreground font-medium">{label}</label>
      <div className="flex items-center gap-4">
        <div
          className="w-20 h-20 border border-border overflow-hidden flex items-center justify-center bg-secondary shrink-0"
          style={{ borderRadius: "var(--radius)" }}
        >
          {displayUrl ? (
            <img src={displayUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-muted-foreground" />
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs text-accent font-medium"
        >
          {displayUrl ? "Change image" : "Upload image"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP · max 5MB</p>
    </div>
  );
}
