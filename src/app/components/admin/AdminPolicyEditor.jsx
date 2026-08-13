import { useEffect, useState } from "react";
import { fetchPolicy, updatePolicy } from "../../lib/api/adminPolicies";
import { ApiError } from "../../lib/api/client";

// Shared by the Privacy Policy and Cookie Policy admin pages — same shape
// (fetch, large textarea, save), differing only in which `type` row they
// read/write. Kept as two separate pages/routes rather than one page with
// an internal switch, per the explicit requirement that each is its own
// section, not combined.
export default function AdminPolicyEditor({ type, title, helpText }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchPolicy(type)
      .then((data) => {
        if (cancelled) return;
        setContent(data.policy.content || "");
        setUpdatedAt(data.policy.updatedAt);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const data = await updatePolicy(type, content);
      setUpdatedAt(data.policy.updatedAt);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg text-foreground mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
          {title}
        </h2>
        {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}
      </div>

      {error && (
        <p
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <textarea
            rows={22}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setSaved(false);
            }}
            placeholder={`Paste the full ${title} text here…`}
            className="bg-input-background border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y font-mono leading-relaxed"
            style={{ borderRadius: "var(--radius)" }}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-accent text-accent-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start"
              style={{ borderRadius: "var(--radius)" }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {saved && !saving && <span className="text-xs text-accent">Saved</span>}
            {updatedAt && (
              <span className="text-xs text-muted-foreground">
                Last updated {new Date(updatedAt).toLocaleString()}
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
