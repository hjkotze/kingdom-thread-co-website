import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import AdminConfigTabs from "../components/admin/AdminConfigTabs";
import {
  listAdminThreadColours,
  createThreadColour,
  updateThreadColour,
  deleteThreadColour,
} from "../lib/api/adminThreadColours";
import { ApiError } from "../lib/api/client";

const emptyColour = { code: "", name: "", pantone: "", hex: "#000000" };

// ~270 rows (seeded from a manufacturer's yarn chart) — too many to browse
// without a filter, so this adds a client-side search over code/name that
// nothing else in the admin UI needs.
export default function AdminThreadColours() {
  const [colours, setColours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => listAdminThreadColours().then((data) => setColours(data.threadColours));

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return colours;
    return colours.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [colours, search]);

  const handleSubmit = async (id, values) => {
    setSubmitting(true);
    setError("");
    try {
      if (id === "new") await createThreadColour(values);
      else await updateThreadColour(id, values);
      await load();
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save thread colour.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (colour) => {
    if (!window.confirm(`Delete "${colour.code} — ${colour.name}"? This can't be undone.`)) return;
    setError("");
    try {
      await deleteThreadColour(colour.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete thread colour.");
    }
  };

  return (
    <AdminLayout maxWidthClassName="max-w-4xl">
      <AdminConfigTabs />
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          Thread Colours
        </h1>
        {editingId === null && (
          <button
            onClick={() => setEditingId("new")}
            className="bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ borderRadius: "var(--radius)" }}
          >
            Add thread colour
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-4" style={{ borderRadius: "var(--radius)" }}>
          {error}
        </p>
      )}

      {editingId === "new" && (
        <div className="mb-4">
          <ThreadColourForm onSubmit={(values) => handleSubmit("new", values)} onCancel={() => setEditingId(null)} submitting={submitting} />
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by code or name…"
        className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4 w-full"
        style={{ borderRadius: "var(--radius)" }}
      />

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && (
        <p className="text-xs text-muted-foreground mb-3">
          {filtered.length} of {colours.length} shown
        </p>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((colour) =>
          editingId === colour.id ? (
            <ThreadColourForm
              key={colour.id}
              colour={colour}
              onSubmit={(values) => handleSubmit(colour.id, values)}
              onCancel={() => setEditingId(null)}
              submitting={submitting}
            />
          ) : (
            <div
              key={colour.id}
              className="bg-card border border-border px-4 py-2.5 flex items-center justify-between gap-4"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-6 h-6 shrink-0 border border-border"
                  style={{ borderRadius: "var(--radius)", background: colour.hex || "transparent" }}
                />
                <span className="text-sm text-foreground truncate">
                  <span className="font-medium">{colour.code}</span> — {colour.name}
                </span>
                {colour.pantone && <span className="text-xs text-muted-foreground shrink-0">{colour.pantone}</span>}
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <button onClick={() => setEditingId(colour.id)} className="text-xs text-accent font-medium">
                  Edit
                </button>
                <button onClick={() => handleDelete(colour)} className="text-xs text-destructive font-medium">
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

function ThreadColourForm({ colour, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(
    colour ? { code: colour.code, name: colour.name, pantone: colour.pantone || "", hex: colour.hex || "#000000" } : emptyColour,
  );

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border p-5 flex flex-col gap-4" style={{ borderRadius: "var(--radius)" }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Code" value={values.code} onChange={set("code")} required placeholder="e.g. C1001" />
        <Field label="Name" value={values.name} onChange={set("name")} required placeholder="e.g. Eggshell" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4 items-end">
        <Field label="Pantone" value={values.pantone} onChange={set("pantone")} placeholder="e.g. P 1-9 C" />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-foreground font-medium">Hex</label>
          <div className="flex gap-3 items-center">
            <input
              type="color"
              value={/^#[0-9A-Fa-f]{6}$/.test(values.hex) ? values.hex : "#000000"}
              onChange={set("hex")}
              className="w-11 h-11 border border-border cursor-pointer"
              style={{ borderRadius: "var(--radius)" }}
            />
            <input
              type="text"
              value={values.hex}
              onChange={set("hex")}
              placeholder="#RRGGBB"
              className="flex-1 bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ borderRadius: "var(--radius)" }}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent text-accent-foreground py-2.5 px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start"
          style={{ borderRadius: "var(--radius)" }}
        >
          {submitting ? "Saving…" : colour ? "Save changes" : "Create thread colour"}
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground">
          Cancel
        </button>
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
