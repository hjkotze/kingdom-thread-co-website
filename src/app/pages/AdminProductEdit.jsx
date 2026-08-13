import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import AdminLayout from "../components/admin/AdminLayout";
import AdminConfigTabs from "../components/admin/AdminConfigTabs";
import ProductForm from "../components/admin/ProductForm";
import { listAdminCategories } from "../lib/api/adminCategories";
import { getAdminProduct, createProduct, updateProduct, deleteProduct, uploadProductImage } from "../lib/api/adminProducts";
import { listShippingRates, getProductShippingRate, setProductShippingRate } from "../lib/api/adminShippingRates";
import { ApiError } from "../lib/api/client";

export default function AdminProductEdit() {
  const { id } = useParams();
  const isNew = id === "new" || !id;
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAdminCategories(), isNew ? Promise.resolve(null) : getAdminProduct(id)])
      .then(([categoriesData, productData]) => {
        if (cancelled) return;
        setCategories(categoriesData.categories);
        if (productData) setProduct(productData.product);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const handleSubmit = async (values, imageFile) => {
    setSubmitting(true);
    setError("");
    try {
      const { product: saved } = isNew ? await createProduct(values) : await updateProduct(id, values);
      if (imageFile) {
        try {
          await uploadProductImage(saved.id, imageFile);
        } catch (err) {
          // Product details saved fine — only the image failed (wrong
          // format, over the 5MB limit, a NocoDB hiccup, etc.). Previously
          // this was swallowed silently (console.error only) and the admin
          // navigated away none the wiser, leaving the product with no
          // image and no indication anything went wrong. Stay on the page
          // and surface it instead; for a new product, move to its edit
          // route first so retrying "Save" updates it rather than creating
          // a duplicate.
          setError(
            err instanceof ApiError
              ? `Product saved, but the image failed to upload: ${err.message}`
              : "Product saved, but the image failed to upload. Please try again.",
          );
          setSubmitting(false);
          if (isNew) navigate(`/admin/configuration/products/${saved.id}`, { replace: true });
          return;
        }
      }
      navigate("/admin/configuration/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save product.");
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${product.name}"? This can't be undone.`)) return;
    setSubmitting(true);
    setError("");
    try {
      await deleteProduct(id);
      navigate("/admin/configuration/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete product.");
      setSubmitting(false);
    }
  };

  if (loading) return null;
  if (!isNew && !product) {
    return (
      <AdminLayout>
        <AdminConfigTabs />
        <p className="text-sm text-muted-foreground">Product not found.</p>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminConfigTabs />
      <Link to="/admin/configuration/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft size={14} /> Back to products
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          {isNew ? "Add product" : `Edit ${product.name}`}
        </h1>
        {!isNew && (
          <button onClick={handleDelete} disabled={submitting} className="text-sm text-destructive hover:opacity-80 disabled:opacity-60">
            Delete product
          </button>
        )}
      </div>

      <ProductForm product={product} categories={categories} onSubmit={handleSubmit} submitting={submitting} error={error} />

      {!isNew && <ShippingOverride productId={id} />}
    </AdminLayout>
  );
}

// Local-only override (product_shipping_rates) — separate from the rest
// of the product record, which round-trips to Airtable. Only shown once a
// product exists (creation must be saved first, since this is keyed by
// the product's Airtable id).
function ShippingOverride({ productId }) {
  const [rates, setRates] = useState([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listShippingRates(), getProductShippingRate(productId)])
      .then(([ratesData, overrideData]) => {
        if (cancelled) return;
        setRates(ratesData.rates);
        setSelected(overrideData.shippingRate ? String(overrideData.shippingRate.id) : "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const handleChange = async (e) => {
    const value = e.target.value;
    setSelected(value);
    setSaving(true);
    setSaved(false);
    try {
      await setProductShippingRate(productId, value ? Number(value) : null);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-card border border-border p-5 mt-6" style={{ borderRadius: "var(--radius)" }}>
      <p className="text-sm text-foreground font-medium mb-3">Shipping</p>
      <div className="flex items-center gap-3">
        <select
          value={selected}
          onChange={handleChange}
          disabled={saving}
          className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ borderRadius: "var(--radius)" }}
        >
          <option value="">Use default shipping rate</option>
          {rates.map((r) => (
            <option key={r.id} value={r.id}>
              {r.code} — {r.description} (R{r.cost.toFixed(2)})
            </option>
          ))}
        </select>
        {saved && !saving && <span className="text-xs text-accent">Saved</span>}
      </div>
    </div>
  );
}
