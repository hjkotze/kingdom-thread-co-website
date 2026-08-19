import { useState } from "react";
import TagListInput from "./TagListInput";
import ImageGalleryField from "./ImageGalleryField";
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
  sizePrices: {},
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
          sizePrices: product.sizePrices || {},
          colours: product.colours || [],
          customisable: Boolean(product.customisable),
          active: product.active !== false,
        }
      : emptyProduct,
  );
  const [images, setImages] = useState(product?.images || []);
  const [pendingFiles, setPendingFiles] = useState([]);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const setChecked = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.checked }));

  // Keeps sizePrices in lockstep with the Sizes tag list — adding a size
  // gives it a blank price to fill in, removing one drops its price so a
  // stale entry never lingers for a size the product no longer has.
  const handleSizesChange = (sizes) => {
    setValues((v) => {
      const sizePrices = {};
      for (const size of sizes) sizePrices[size] = v.sizePrices[size] ?? "";
      return { ...v, sizes, sizePrices };
    });
  };

  const setSizePrice = (size) => (e) =>
    setValues((v) => ({ ...v, sizePrices: { ...v.sizePrices, [size]: e.target.value } }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values, { images, pendingFiles });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border p-5 flex flex-col gap-4" style={{ borderRadius: "var(--radius)" }}>
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5" style={{ borderRadius: "var(--radius)" }}>
          {error}
        </p>
      )}

      <ImageGalleryField
        label="Product images"
        images={images}
        onImagesChange={setImages}
        pendingFiles={pendingFiles}
        onPendingFilesChange={setPendingFiles}
      />

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
        {values.sizes.length === 0 && (
          <Field label="Price (R)" type="number" min={0} step="0.01" value={values.price} onChange={set("price")} />
        )}
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

      <TagListInput label="Sizes" values={values.sizes} onChange={handleSizesChange} placeholder="Type a size, press Enter" />
      {values.sizes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-foreground font-medium">Price per size (R)</label>
          <div className="grid sm:grid-cols-2 gap-4">
            {values.sizes.map((size) => (
              <div key={size} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-28 shrink-0 truncate">{size}</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={values.sizePrices[size] ?? ""}
                  onChange={setSizePrice(size)}
                  className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full"
                  style={{ borderRadius: "var(--radius)" }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
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
