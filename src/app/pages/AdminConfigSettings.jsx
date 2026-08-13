import { useEffect, useState } from "react";
import AdminLayout from "../components/admin/AdminLayout";
import AdminConfigTabs from "../components/admin/AdminConfigTabs";
import { listVatRates, createVatRate } from "../lib/api/adminVatRates";
import {
  listShippingRates,
  createShippingRate,
  updateShippingRate,
  deleteShippingRate,
} from "../lib/api/adminShippingRates";
import { fetchHomeStats, updateTurnaroundText } from "../lib/api/homeStats";
import { fetchInvoiceSettings, updateInvoiceSettings } from "../lib/api/adminSettings";
import { ApiError } from "../lib/api/client";

// Everything here is a small, one-off config form (as opposed to
// Products/Categories/Thread Colours, which are full CRUD list pages and
// keep their own tabs) — grouped onto one page so none of it requires
// scrolling past unrelated dashboard content to find, per the admin
// console restructure.
export default function AdminConfigSettings() {
  return (
    <AdminLayout maxWidthClassName="max-w-4xl">
      <AdminConfigTabs />
      <div className="mb-10">
        <p className="text-accent text-xs tracking-widest uppercase mb-3" style={{ fontFamily: "'DM Mono', monospace" }}>
          Configuration
        </p>
        <h1 className="text-2xl text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          Settings
        </h1>
      </div>

      <TurnaroundSetting />
      <InvoiceSettings />
      <VatRatesSection />
      <ShippingRatesSection />
    </AdminLayout>
  );
}

// Deliberately narrow — one editable field, not a full settings page —
// matches the single admin-editable setting (turnaround text) that exists
// right now (§ homepage stats: everything else on the Hero section is
// computed, this is the one thing with no data to compute it from).
function TurnaroundSetting() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchHomeStats()
      .then((data) => {
        if (!cancelled) setValue(data.turnaroundText || "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateTurnaroundText(value);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-card border border-border p-5 mb-8" style={{ borderRadius: "var(--radius)" }}>
      <p className="text-sm text-foreground font-medium mb-3">Site settings</p>
      <form onSubmit={handleSave} className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Homepage "Day turnaround" stat</label>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. 7-10"
            className="bg-input-background border border-border px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-40"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-accent text-accent-foreground px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ borderRadius: "var(--radius)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && !saving && <span className="text-xs text-accent">Saved</span>}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </form>
    </div>
  );
}

// Banking details print on every invoice PDF (see server/src/lib/documentPdf.js);
// the two notes fields just pre-fill AdminFormalQuoteSection's per-quote
// Notes field and the invoice's notes at generation time — both stay
// editable per-document afterward, this only sets the starting point.
function InvoiceSettings() {
  const [bankingDetails, setBankingDetails] = useState("");
  const [defaultQuoteNotes, setDefaultQuoteNotes] = useState("");
  const [defaultInvoiceNotes, setDefaultInvoiceNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchInvoiceSettings()
      .then((data) => {
        if (cancelled) return;
        setBankingDetails(data.bankingDetails || "");
        setDefaultQuoteNotes(data.defaultQuoteNotes || "");
        setDefaultInvoiceNotes(data.defaultInvoiceNotes || "");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updateInvoiceSettings({ bankingDetails, defaultQuoteNotes, defaultInvoiceNotes });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-card border border-border p-5 mb-8" style={{ borderRadius: "var(--radius)" }}>
      <p className="text-sm text-foreground font-medium mb-3">Invoicing settings</p>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">
            Banking details (printed on every invoice PDF)
          </label>
          <textarea
            rows={3}
            value={bankingDetails}
            onChange={(e) => {
              setBankingDetails(e.target.value);
              setSaved(false);
            }}
            placeholder={"e.g. Bank: FNB\nAccount name: Kingdom Thread Co\nAccount number: ...\nBranch code: ..."}
            className="bg-input-background border border-border px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Default quote notes</label>
            <textarea
              rows={2}
              value={defaultQuoteNotes}
              onChange={(e) => {
                setDefaultQuoteNotes(e.target.value);
                setSaved(false);
              }}
              placeholder="Pre-fills new formal quotes' Notes field"
              className="bg-input-background border border-border px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              style={{ borderRadius: "var(--radius)" }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Default invoice notes</label>
            <textarea
              rows={2}
              value={defaultInvoiceNotes}
              onChange={(e) => {
                setDefaultInvoiceNotes(e.target.value);
                setSaved(false);
              }}
              placeholder="Pre-fills new invoices' notes"
              className="bg-input-background border border-border px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              style={{ borderRadius: "var(--radius)" }}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-accent text-accent-foreground px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start"
            style={{ borderRadius: "var(--radius)" }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {saved && !saving && <span className="text-xs text-accent">Saved</span>}
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </form>
    </div>
  );
}

function VatRatesSection() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratePercent, setRatePercent] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = () => listVatRates().then((data) => setRates(data.rates));

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createVatRate({ ratePercent: Number(ratePercent), validFrom, validTo: validTo || null });
      setRatePercent("");
      setValidFrom("");
      setValidTo("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create VAT rate.");
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const current = rates.find((r) => r.validFrom <= today && (!r.validTo || r.validTo >= today));

  return (
    <div className="mb-10">
      <h2 className="text-lg text-foreground mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
        VAT rate
      </h2>

      {!loading && current && (
        <p className="text-sm text-foreground mb-4">
          Current rate: <span className="font-medium">{current.ratePercent.toFixed(2)}%</span> (since{" "}
          {new Date(current.validFrom).toLocaleDateString()})
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border p-5 flex flex-wrap items-end gap-4 mb-4"
        style={{ borderRadius: "var(--radius)" }}
      >
        {error && <p className="text-sm text-destructive w-full">{error}</p>}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Rate (%)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={ratePercent}
            onChange={(e) => setRatePercent(e.target.value)}
            required
            className="bg-input-background border border-border px-4 py-2 text-sm text-foreground w-28 focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Valid from</label>
          <input
            type="date"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            required
            className="bg-input-background border border-border px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Valid to (optional)</label>
          <input
            type="date"
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
            className="bg-input-background border border-border px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ borderRadius: "var(--radius)" }}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent text-accent-foreground px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ borderRadius: "var(--radius)" }}
        >
          {submitting ? "Saving…" : "Add rate"}
        </button>
      </form>

      {!loading && (
        <div className="flex flex-col gap-2">
          {rates.map((r) => (
            <div
              key={r.id}
              className="border border-border px-4 py-2.5 flex items-center justify-between text-sm"
              style={{ borderRadius: "var(--radius)" }}
            >
              <span className="font-medium">{r.ratePercent.toFixed(2)}%</span>
              <span className="text-muted-foreground">
                {new Date(r.validFrom).toLocaleDateString()} –{" "}
                {r.validTo ? new Date(r.validTo).toLocaleDateString() : "ongoing"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const emptyShippingRate = { code: "", description: "", cost: "", isDefault: false };

function ShippingRatesSection() {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => listShippingRates().then((data) => setRates(data.rates));

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

  const handleSubmit = async (id, values) => {
    setSubmitting(true);
    setError("");
    try {
      const input = { code: values.code, description: values.description, cost: Number(values.cost), isDefault: values.isDefault };
      if (id === "new") await createShippingRate(input);
      else await updateShippingRate(id, input);
      await load();
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save shipping rate.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rate) => {
    if (!window.confirm(`Delete "${rate.code} — ${rate.description}"? This can't be undone.`)) return;
    setError("");
    try {
      await deleteShippingRate(rate.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete shipping rate.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>
          Shipping rates
        </h2>
        {editingId === null && (
          <button
            onClick={() => setEditingId("new")}
            className="bg-accent text-accent-foreground px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ borderRadius: "var(--radius)" }}
          >
            Add shipping rate
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {editingId === "new" && (
        <div className="mb-4">
          <ShippingRateForm onSubmit={(values) => handleSubmit("new", values)} onCancel={() => setEditingId(null)} submitting={submitting} />
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-2">
          {rates.map((rate) =>
            editingId === rate.id ? (
              <ShippingRateForm
                key={rate.id}
                rate={rate}
                onSubmit={(values) => handleSubmit(rate.id, values)}
                onCancel={() => setEditingId(null)}
                submitting={submitting}
              />
            ) : (
              <div
                key={rate.id}
                className="bg-card border border-border px-4 py-2.5 flex items-center justify-between gap-4"
                style={{ borderRadius: "var(--radius)" }}
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">
                    <span className="font-medium">{rate.code}</span> — {rate.description}
                    {rate.isDefault && <span className="text-xs text-accent ml-2">Default</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">R{rate.cost.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <button onClick={() => setEditingId(rate.id)} className="text-xs text-accent font-medium">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(rate)} className="text-xs text-destructive font-medium">
                    Delete
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function ShippingRateForm({ rate, onSubmit, onCancel, submitting }) {
  const [values, setValues] = useState(
    rate ? { code: rate.code, description: rate.description, cost: rate.cost, isDefault: rate.isDefault } : emptyShippingRate,
  );

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border p-5 flex flex-col gap-4" style={{ borderRadius: "var(--radius)" }}>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Code" value={values.code} onChange={set("code")} required placeholder="e.g. STD" />
        <Field label="Description" value={values.description} onChange={set("description")} required placeholder="e.g. Standard shipping" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4 items-end">
        <Field label="Cost (R)" type="number" min={0} step="0.01" value={values.cost} onChange={set("cost")} required />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={values.isDefault}
            onChange={(e) => setValues((v) => ({ ...v, isDefault: e.target.checked }))}
          />
          Use as default shipping rate
        </label>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent text-accent-foreground py-2.5 px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start"
          style={{ borderRadius: "var(--radius)" }}
        >
          {submitting ? "Saving…" : rate ? "Save changes" : "Create shipping rate"}
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
