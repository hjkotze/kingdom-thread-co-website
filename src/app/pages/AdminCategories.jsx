import { useEffect, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import AdminConfigTabs from "../components/admin/AdminConfigTabs";
import ImageField from "../components/admin/ImageField";
import { listAdminCategories, createCategory, updateCategory, deleteCategory, uploadCategoryImage } from "../lib/api/adminCategories";
import { ApiError } from "../lib/api/client";

const emptyCategory = { slug: "", label: "", headline: "", body: "", callout: "", alt: "", sortOrder: 0 };

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // category id, or "new", or null
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    listAdminCategories().then((data) => {
      setCategories(data.categories);
      return data.categories;
    });

  useEffect(() => {
    let cancelled = false;
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (id, values, imageFile) => {
    setSubmitting(true);
    setError("");
    try {
      const { category: saved } = id === "new" ? await createCategory(values) : await updateCategory(id, values);
      if (imageFile) {
        try {
          await uploadCategoryImage(saved.id, imageFile);
        } catch (err) {
          // Category details saved fine — only the image failed (wrong
          // format, over the 5MB limit, a NocoDB hiccup, etc.). Previously
          // this was swallowed silently (console.error only) and the form
          // closed with no indication anything went wrong. Keep it open —
          // pointed at the now-real id, so retrying updates rather than
          // creating a duplicate — and surface the error. For a brand-new
          // category this does mean the staged file has to be re-picked
          // (it's a fresh form instance once editingId stops being "new"),
          // which is an acceptable trade-off for never risking a duplicate.
          setError(
            err instanceof ApiError
              ? `Category saved, but the image failed to upload: ${err.message}`
              : "Category saved, but the image failed to upload. Please try again.",
          );
          setEditingId(saved.id);
          await load();
          return;
        }
      }
      await load();
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Delete "${category.label}"? This can't be undone.`)) return;
    setError("");
    try {
      await deleteCategory(category.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete category.");
    }
  };

  return (
    <AdminLayout>
      <AdminConfigTabs />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          Categories
        </h1>
        {editingId === null && (
          <button
            onClick={() => setEditingId("new")}
            className="bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ borderRadius: "var(--radius)" }}
          >
            Add category
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-4" style={{ borderRadius: "var(--radius)" }}>
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

      {editingId === "new" && (
        <div className="mb-4">
          <CategoryForm
            onSubmit={(values, file) => handleSubmit("new", values, file)}
            onCancel={() => setEditingId(null)}
            submitting={submitting}
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {categories.map((category) =>
          editingId === category.id ? (
            <CategoryForm
              key={category.id}
              category={category}
              onSubmit={(values, file) => handleSubmit(category.id, values, file)}
              onCancel={() => setEditingId(null)}
              submitting={submitting}
            />
          ) : (
            <div
              key={category.id}
              className="bg-card border border-border p-4 flex items-center justify-between gap-4"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div
                  className="w-12 h-12 shrink-0 border border-border overflow-hidden bg-secondary"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  {category.imageUrl && <img src={category.imageUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-foreground font-medium mb-1 truncate">{category.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.slug} · {category.productCount} product{category.productCount === 1 ? "" : "s"} · sort {category.sortOrder}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <button onClick={() => setEditingId(category.id)} className="text-xs text-accent font-medium">
                  Edit
                </button>
                <button onClick={() => handleDelete(category)} className="text-xs text-destructive font-medium">
                  Delete
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </AdminLayout>
  );
}

function CategoryForm({ category, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(
    category
      ? {
          slug: category.slug,
          label: category.label,
          headline: category.headline || "",
          body: category.body || "",
          callout: category.callout || "",
          alt: category.alt || "",
          sortOrder: category.sortOrder ?? 0,
        }
      : emptyCategory,
  );
  const [imageFile, setImageFile] = useState(null);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values, imageFile);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border p-5 flex flex-col gap-4" style={{ borderRadius: "var(--radius)" }}>
      <ImageField label="Category image" imageUrl={category?.imageUrl} onFileSelected={setImageFile} />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Slug" value={values.slug} onChange={set("slug")} required placeholder="e.g. blanket-budget" />
        <Field label="Label" value={values.label} onChange={set("label")} required placeholder="e.g. Budget Blankets" />
      </div>
      <Field label="Headline" value={values.headline} onChange={set("headline")} />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-foreground font-medium">Body</label>
        <textarea
          rows={3}
          value={values.body}
          onChange={set("body")}
          className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          style={{ borderRadius: "var(--radius)" }}
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Callout" value={values.callout} onChange={set("callout")} placeholder="e.g. From R45 · Any Design" />
        <Field label="Image alt text" value={values.alt} onChange={set("alt")} />
      </div>
      <Field label="Sort order" type="number" value={values.sortOrder} onChange={set("sortOrder")} className="w-32" />

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent text-accent-foreground py-2.5 px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start"
          style={{ borderRadius: "var(--radius)" }}
        >
          {submitting ? "Saving…" : category ? "Save changes" : "Create category"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, className = "", ...inputProps }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm text-foreground font-medium">{label}</label>
      <input
        {...inputProps}
        className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        style={{ borderRadius: "var(--radius)" }}
      />
    </div>
  );
}
