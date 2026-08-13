import { useState } from "react";
import TagListInput from "./TagListInput";
import ImageField from "./ImageField";
import StarRating from "../StarRating";
import FormSelect from "../quote/FormSelect";

const PRINTING_METHODS = ["Embroidered", "Sublimation"];

const emptyProduct = {
  name: "",
  subtitle: "",
  categoryId: "",
  price: "",
  tag: "",
  printingMethod: "",
  imageFallbackColour: "",
  badge: "",
  description: "",
  sizes: [],
  colours: [],
  customisable: false,
  active: true,
};

// Shared by AdminProducts.jsx (inline create) and AdminProductEdit.jsx
// (edit route) — FormSelect doesn't support label != value options, so
// Category uses a plain <select>, same as the thread-colour picker in
// ProductQuoteCustomise.jsx.
export default function ProductForm({ product, categories, onSubmit, onCancel, submitting, error }) {
  const [values, setValues] = useState(() =>
    product
      ? {
          name: product.name || "",
          subtitle: product.subtitle || "",
          categoryId: product.categoryId || "",
          price: product.price ?? "",
          tag: product.tag || "",
          printingMethod: product.printingMethod || "",
          imageFallbackColour: product.imageFallbackColour || "",
          badge: product.badge || "",
          description: product.description || "",
          sizes: product.sizes || [],
          colours: product.colours || [],
          customisable: Boolean(product.customisable),
          active: product.active !== false,
        }
      : emptyProduct,
  );
  const [imageFile, setImageFile] = useState(null);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const setChecked = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.checked }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values, imageFile);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border p-5 flex flex-col gap-4" style={{ borderRadius: "var(--radius)" }}>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5" style={{ borderRadius: "var(--radius)" }}>
          {error}
        </p>
      )}

      <ImageField label="Product image" imageUrl={product?.imageUrl} onFileSelected={setImageFile} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Name" value={values.name} onChange={set("name")} required />
        <Field label="Subtitle" value={values.subtitle} onChange={set("subtitle")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-foreground font-medium">Category</label>
        <select
          value={values.categoryId}
          onChange={set("categoryId")}
          required
          className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ borderRadius: "var(--radius)" }}
        >
          <option value="">Select a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <FormSelect
        label="Printing method"
        value={values.printingMethod}
        onChange={set("printingMethod")}
        options={PRINTING_METHODS}
      />
      <p className="text-xs text-muted-foreground -mt-2">
        Determines whether the customise flow asks for a font colour or a thread colour.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 items-end">
        <Field label="Price (R)" type="number" min={0} step="0.01" value={values.price} onChange={set("price")} />
        {product && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground font-medium">Rating</label>
            <div className="py-2.5">
              <StarRating value={product.rating} count={product.reviews} size={14} />
            </div>
          </div>
        )}
      </div>
      {product && (
        <p className="text-xs text-muted-foreground -mt-2">
          Rating comes from real customer ratings and can't be set manually.
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Tag" value={values.tag} onChange={set("tag")} placeholder="e.g. Minimalist" />
        <Field label="Badge (optional)" value={values.badge} onChange={set("badge")} placeholder="e.g. Bestseller" />
      </div>

      <Field label="Image fallback colour" value={values.imageFallbackColour} onChange={set("imageFallbackColour")} placeholder="#E0D4BC" />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-foreground font-medium">Description</label>
        <textarea
          rows={3}
          value={values.description}
          onChange={set("description")}
          className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          style={{ borderRadius: "var(--radius)" }}
        />
      </div>

      <TagListInput label="Sizes" values={values.sizes} onChange={(sizes) => setValues((v) => ({ ...v, sizes }))} placeholder="Type a size, press Enter" />
      <TagListInput label="Colours" values={values.colours} onChange={(colours) => setValues((v) => ({ ...v, colours }))} placeholder="Type a colour, press Enter" />

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={values.customisable} onChange={setChecked("customisable")} />
          Customisable
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={values.active} onChange={setChecked("active")} />
          Active (visible in the shop)
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent text-accent-foreground py-2.5 px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start"
          style={{ borderRadius: "var(--radius)" }}
        >
          {submitting ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function Field({ label, ...inputProps }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm text-foreground font-medium">{label}</label>
      <input
        {...inputProps}
        className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        style={{ borderRadius: "var(--radius)" }}
      />
    </div>
  );
}
