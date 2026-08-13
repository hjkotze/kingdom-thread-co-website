import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { apiFetch, ApiError } from "../lib/api/client";
import { useQuoteDraft } from "../lib/quote/QuoteDraftContext";
import AuthCard from "../components/auth/AuthCard";
import FormSelect from "../components/quote/FormSelect";
import Header from "../components/Header";

export default function ProductQuoteStart() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { startDraft } = useQuoteDraft();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [size, setSize] = useState("");
  const [colour, setColour] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/products/${productId}`)
      .then((data) => {
        if (!cancelled) setProduct(data.product);
      })
      .catch((err) => {
        if (!cancelled && err instanceof ApiError && err.status === 404) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleContinue = (e) => {
    e.preventDefault();
    if (!size || !colour) {
      setError("Please select a size and colour.");
      return;
    }
    startDraft(productId, { size, colour, quantity: Number(quantity) });
    navigate(product.customisable ? `/quote/${productId}/customise` : "/quote/review");
  };

  if (loading) return null;
  if (notFound || !product) {
    return (
      <>
        <Header />
        <AuthCard eyebrow="Quote request" title="Product not found">
          <p className="text-sm text-muted-foreground">
            This product may no longer be available. Head back to the shop to pick another.
          </p>
        </AuthCard>
      </>
    );
  }

  return (
    <>
      <Header />
      <AuthCard
      eyebrow="Step 1 of 2"
      title={product.name}
      subtitle={`from R${product.price} · ${product.subtitle}`}
      error={error}
    >
      <form className="flex flex-col gap-5" onSubmit={handleContinue}>
        <FormSelect label="Size" value={size} onChange={(e) => setSize(e.target.value)} options={product.sizes} />
        <FormSelect
          label="Colour"
          value={colour}
          onChange={(e) => setColour(e.target.value)}
          options={product.colours}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-foreground font-medium">Quantity</label>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-32"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>

        {product.price !== null && (
          <div className="flex justify-between text-sm border-t border-border pt-4">
            <div className="text-muted-foreground">
              <p>Unit price</p>
              <p className="mt-1">Total</p>
            </div>
            <div className="text-right text-foreground">
              <p>R{Number(product.price).toFixed(2)}</p>
              <p className="mt-1 font-medium">
                R{(Number(product.price) * (Number(quantity) || 0)).toFixed(2)}
              </p>
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
