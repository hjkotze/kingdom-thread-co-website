import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { apiFetch, ApiError } from "../lib/api/client";
import { createQuote } from "../lib/api/quotes";
import { uploadAttachment } from "../lib/api/attachments";
import { useQuoteDraft } from "../lib/quote/QuoteDraftContext";
import AuthCard from "../components/auth/AuthCard";
import Header from "../components/Header";

export default function QuoteReview() {
  const navigate = useNavigate();
  const { draft, files, clearDraft } = useQuoteDraft();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!draft) {
      navigate("/", { replace: true });
      return;
    }
    let cancelled = false;
    apiFetch(`/products/${draft.productId}`)
      .then((data) => {
        if (!cancelled) setProduct(data.product);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const { quote } = await createQuote({
        productId: draft.productId,
        size: draft.size,
        colour: draft.colour,
        quantity: draft.quantity,
        requirements: draft.requirements,
        font: draft.font,
        fontColour: draft.fontColour,
        threadColourCode: draft.threadColourCode,
      });

      // Best-effort: the quote request itself already succeeded above, so a
      // failed upload here shouldn't block the customer from reaching their
      // confirmation — they can retry the upload from the quote detail page.
      // It used to fail *silently* though (console.error only) — the
      // customer would land on the confirmation with no idea their design
      // file never made it, then discover it only if they happened to check
      // back later. Now the failure is passed along so the quote detail
      // page can put a clear "please re-attach" notice right at the upload
      // section instead.
      const failedUploads = [];
      if (files.image) {
        await uploadAttachment(quote.id, "image", files.image).catch(() => failedUploads.push("design image"));
      }
      if (files.text) {
        await uploadAttachment(quote.id, "text", files.text).catch(() => failedUploads.push("design brief"));
      }

      clearDraft();
      navigate(`/account/quotes/${quote.id}`, {
        replace: true,
        state: failedUploads.length > 0 ? { failedUploads } : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading || !product || !draft) return null;

  return (
    <>
      <Header />
      <AuthCard eyebrow="Final step" title="Review your request" error={error}>
      <dl className="flex flex-col gap-4 text-sm">
        <Row label="Product" value={product.name} />
        <Row label="Size" value={draft.size} />
        <Row label="Colour" value={draft.colour} />
        <Row label="Quantity" value={draft.quantity} />
        {draft.requirements && <Row label="Requirements" value={draft.requirements} />}
        {draft.font && <Row label="Font" value={draft.font} />}
        {draft.fontColour && (
          <Row
            label="Font colour"
            value={
              <span className="flex items-center gap-2">
                <span
                  className="w-4 h-4 border border-border inline-block"
                  style={{ borderRadius: "var(--radius)", background: draft.fontColour }}
                />
                {draft.fontColour}
              </span>
            }
          />
        )}
        {draft.threadColourCode && <Row label="Thread colour" value={draft.threadColourCode} />}
        {files.image && <Row label="Image" value={files.image.name} />}
        {files.text && <Row label="Text file" value={files.text.name} />}
      </dl>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-accent text-accent-foreground py-3.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 mt-6 w-full"
        style={{ borderRadius: "var(--radius)" }}
      >
        {submitting ? "Sending…" : "Send request — we'll reply within 1 business day"}
      </button>
      <p className="text-xs text-muted-foreground text-center mt-3">
        No payment is taken until you approve your design proof.
      </p>
      </AuthCard>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-6 border-b border-border pb-3">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-foreground text-right">{value}</dd>
    </div>
  );
}
