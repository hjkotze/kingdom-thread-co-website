import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { apiFetch } from "../lib/api/client";
import { fetchThreadColours } from "../lib/api/threadColours";
import { useQuoteDraft } from "../lib/quote/QuoteDraftContext";
import AuthCard from "../components/auth/AuthCard";
import FontSelect from "../components/quote/FontSelect";
import ThreadColourSelect from "../components/quote/ThreadColourSelect";
import FileDropzone from "../components/quote/FileDropzone";
import Header from "../components/Header";

const COMMON_FONT_COLOURS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Charcoal", hex: "#333333" },
  { name: "Navy", hex: "#1B2A4A" },
  { name: "Burgundy", hex: "#7B1E3A" },
  { name: "Forest Green", hex: "#1F4D2C" },
  { name: "Gold", hex: "#C9A227" },
  { name: "Silver", hex: "#B8B8B8" },
  { name: "Rose Gold", hex: "#B76E79" },
  { name: "Ivory", hex: "#F8F1E7" },
];

export default function ProductQuoteCustomise() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { draft, files, updateDraft, setDraftFile } = useQuoteDraft();

  const [product, setProduct] = useState(null);
  const [threadColours, setThreadColours] = useState([]);
  const [loading, setLoading] = useState(true);

  const [requirements, setRequirements] = useState(draft?.requirements || "");
  const [font, setFont] = useState(draft?.font || "");
  const [fontColour, setFontColour] = useState(draft?.fontColour || "#000000");
  const [threadColourCode, setThreadColourCode] = useState(draft?.threadColourCode || "");
  const [error, setError] = useState("");

  useEffect(() => {
    // No in-progress selection for this product — the customer landed here
    // without going through step 1 (direct URL, refresh lost sessionStorage
    // in a private window, etc.). Send them back to start over.
    if (!draft || draft.productId !== productId) {
      navigate(`/quote/${productId}`, { replace: true });
      return;
    }
    let cancelled = false;
    Promise.all([apiFetch(`/products/${productId}`), fetchThreadColours()])
      .then(([productData, threadData]) => {
        if (cancelled) return;
        setProduct(productData.product);
        setThreadColours(threadData.threadColours);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const matchingPreset = COMMON_FONT_COLOURS.find((c) => c.hex.toLowerCase() === fontColour.toLowerCase());

  const isEmbroidered = product?.printingMethod === "Embroidered";

  const handleContinue = (e) => {
    e.preventDefault();
    if (!requirements.trim()) return setError("Please describe your requirements.");
    if (!font) return setError("Please choose a font.");
    if (isEmbroidered && !threadColourCode) return setError("Please choose a thread colour.");

    updateDraft({
      requirements: requirements.trim(),
      font,
      fontColour: isEmbroidered ? null : fontColour,
      threadColourCode: isEmbroidered ? threadColourCode : null,
    });
    navigate("/quote/review");
  };

  if (loading || !product) return null;

  return (
    <>
      <Header />
      <AuthCard
      eyebrow="Step 2 of 2"
      title="Your design"
      subtitle={`Tell us what you'd like on your ${product.name.toLowerCase()}.`}
      error={error}
    >
      <form className="flex flex-col gap-5" onSubmit={handleContinue}>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-foreground font-medium">Requirements / wording</label>
          <textarea
            rows={4}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="e.g. 'Smith Family 2024' or describe the design you'd like"
            className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>

        <FileDropzone
          label="Upload an image (optional)"
          accept=".png,.jpg,.jpeg,.webp,.svg"
          helperText="PNG, JPG, WEBP, SVG · max 20 MB"
          fileName={files.image?.name}
          onSelect={(file) => setDraftFile("image", file)}
        />

        <FileDropzone
          label="Upload a text/wording file (optional)"
          accept=".txt,.pdf,.doc,.docx"
          helperText="TXT, PDF, DOC, DOCX · max 20 MB"
          fileName={files.text?.name}
          onSelect={(file) => setDraftFile("text", file)}
        />

        <FontSelect value={font} onValueChange={setFont} />

        {/* Exactly one of these two applies, never both — an embroidered
            product's visible colour *is* whatever thread is chosen; a
            sublimation-printed product has no physical thread at all. */}
        {isEmbroidered ? (
          <ThreadColourSelect value={threadColourCode} onValueChange={setThreadColourCode} threadColours={threadColours} />
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground font-medium">Font colour</label>
            <div className="flex gap-3 items-center">
              <select
                value={matchingPreset ? matchingPreset.hex : ""}
                onChange={(e) => setFontColour(e.target.value)}
                className="flex-1 bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              >
                <option value="">Custom…</option>
                {COMMON_FONT_COLOURS.map((c) => (
                  <option key={c.hex} value={c.hex}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="color"
                value={fontColour}
                onChange={(e) => setFontColour(e.target.value)}
                className="w-11 h-11 border border-border cursor-pointer"
                style={{ borderRadius: "var(--radius)" }}
                aria-label="Custom font colour"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="bg-accent text-accent-foreground py-3.5 text-sm font-medium hover:opacity-90 transition-opacity mt-1"
          style={{ borderRadius: "var(--radius)" }}
        >
          Continue
        </button>
      </form>
      </AuthCard>
    </>
  );
}
