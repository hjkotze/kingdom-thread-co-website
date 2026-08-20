import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Manual paging only (arrows + dots) — no auto-rotate. Fills its parent
// (the parent owns box height/background; this just renders image +
// controls at w-full h-full). Arrows/dots only render when there's more
// than one image, so a single-image product/category looks exactly like
// it did before this component existed.
export default function Carousel({ images, alt, imageClassName = "w-full h-full object-contain" }) {
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  const clamped = Math.min(index, images.length - 1);
  const goTo = (i) => setIndex((i + images.length) % images.length);

  return (
    <div className="relative w-full h-full group/carousel">
      <img src={images[clamped].url} alt={alt} loading="lazy" className={imageClassName} />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goTo(clamped - 1);
            }}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-background/80 text-foreground opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background"
            style={{ borderRadius: "9999px" }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goTo(clamped + 1);
            }}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-background/80 text-foreground opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-background"
            style={{ borderRadius: "9999px" }}
          >
            <ChevronRight size={16} />
          </button>

          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1.5">
            {images.map((img, i) => (
              <button
                key={img.id || img.url}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goTo(i);
                }}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                className="w-2 h-2 transition-colors"
                style={{
                  borderRadius: "9999px",
                  background: i === clamped ? "var(--accent)" : "var(--background)",
                  opacity: i === clamped ? 1 : 0.7,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
