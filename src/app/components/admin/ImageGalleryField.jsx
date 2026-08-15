import { useEffect, useState } from "react";
import { ImageIcon, X, ChevronLeft, ChevronRight, Plus } from "lucide-react";

// Multi-image version of the old single-image ImageField — shows the
// record's current images (already-saved, reorderable/removable in place)
// plus any newly picked files staged for upload. Everything here is
// controlled by the parent (ProductForm.jsx/AdminCategories.jsx's
// CategoryForm): this component never calls the network itself. The parent
// diffs `images` against the record's original images on save to work out
// which removes/reorder/uploads are actually needed — see the onSubmit
// handlers in AdminProductEdit.jsx/AdminCategories.jsx.
export default function ImageGalleryField({ label, images, onImagesChange, pendingFiles, onPendingFilesChange }) {
  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onPendingFilesChange([...pendingFiles, ...files]);
    e.target.value = "";
  };

  const moveExisting = (index, direction) => {
    const next = images.slice();
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    onImagesChange(next);
  };

  const removeExisting = (index) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const removePending = (index) => {
    onPendingFilesChange(pendingFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-foreground font-medium">{label}</label>
      <div className="flex flex-wrap gap-3">
        {images.length === 0 && pendingFiles.length === 0 && (
          <div
            className="w-20 h-20 border border-border overflow-hidden flex items-center justify-center bg-secondary shrink-0"
            style={{ borderRadius: "var(--radius)" }}
          >
            <ImageIcon size={20} className="text-muted-foreground" />
          </div>
        )}
        {images.map((img, i) => (
          <div
            key={img.id}
            className="relative w-20 h-20 border border-border overflow-hidden bg-secondary shrink-0"
            style={{ borderRadius: "var(--radius)" }}
          >
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeExisting(i)}
              aria-label="Remove image"
              className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center bg-background/90 rounded-full text-foreground"
            >
              <X size={12} />
            </button>
            <div className="absolute bottom-0.5 left-0.5 flex gap-0.5">
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => moveExisting(i, -1)}
                  aria-label="Move earlier"
                  className="w-5 h-5 flex items-center justify-center bg-background/90 rounded-full text-foreground"
                >
                  <ChevronLeft size={12} />
                </button>
              )}
              {i < images.length - 1 && (
                <button
                  type="button"
                  onClick={() => moveExisting(i, 1)}
                  aria-label="Move later"
                  className="w-5 h-5 flex items-center justify-center bg-background/90 rounded-full text-foreground"
                >
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
        {pendingFiles.map((file, i) => (
          <PendingThumb key={i} file={file} onRemove={() => removePending(i)} />
        ))}
        <label
          className="w-20 h-20 border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-accent hover:border-accent transition-colors cursor-pointer shrink-0"
          style={{ borderRadius: "var(--radius)" }}
        >
          <Plus size={20} />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP · max 5MB each · first image shows first</p>
    </div>
  );
}

function PendingThumb({ file, onRemove }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div
      className="relative w-20 h-20 border border-accent overflow-hidden bg-secondary shrink-0"
      style={{ borderRadius: "var(--radius)" }}
    >
      {url && <img src={url} alt="" className="w-full h-full object-cover" />}
      <span className="absolute bottom-0.5 left-0.5 bg-accent text-accent-foreground text-[9px] px-1 leading-tight" style={{ borderRadius: "var(--radius)" }}>
        NEW
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove staged image"
        className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center bg-background/90 rounded-full text-foreground"
      >
        <X size={12} />
      </button>
    </div>
  );
}
