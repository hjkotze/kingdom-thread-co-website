import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../lib/auth/AuthContext";
import { ApiError } from "../lib/api/client";
import Header from "../components/Header";

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

export default function AccountProfile() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user.fullName || "");
  const [addressLine1, setAddressLine1] = useState(user.addressLine1 || "");
  const [addressComplex, setAddressComplex] = useState(user.addressComplex || "");
  const [addressSuburb, setAddressSuburb] = useState(user.addressSuburb || "");
  const [addressPostalCode, setAddressPostalCode] = useState(user.addressPostalCode || "");
  const [addressProvince, setAddressProvince] = useState(user.addressProvince || "");
  const [cellPhone, setCellPhone] = useState(user.cellPhone || "");
  const [landlineAreaCode, setLandlineAreaCode] = useState(user.landlineAreaCode || "");
  const [landlineNumber, setLandlineNumber] = useState(user.landlineNumber || "");
  const [notifyOrderStatusChanges, setNotifyOrderStatusChanges] = useState(Boolean(user.notifyOrderStatusChanges));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSubmitting(true);
    try {
      await updateProfile({
        fullName,
        addressLine1,
        addressComplex,
        addressSuburb,
        addressPostalCode,
        addressProvince,
        cellPhone,
        landlineAreaCode,
        landlineNumber,
        notifyOrderStatusChanges,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <section className="min-h-screen bg-background py-28 px-6">
        <div className="max-w-xl mx-auto">
          <Link
            to="/account"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft size={14} /> Back to your account
          </Link>

          <p
            className="text-accent text-xs tracking-widest uppercase mb-3"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Your account
          </p>
          <h1
            className="text-4xl text-foreground mb-10"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
          >
            Profile
          </h1>

          <form
            className="bg-card border border-border p-6 flex flex-col gap-5"
            style={{ borderRadius: "var(--radius)" }}
            onSubmit={handleSubmit}
          >
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-4 py-2.5" style={{ borderRadius: "var(--radius)" }}>
                {error}
              </p>
            )}
            {saved && (
              <p className="text-sm text-accent bg-accent/10 px-4 py-2.5" style={{ borderRadius: "var(--radius)" }}>
                Profile updated.{" "}
                <Link to="/account" className="underline">
                  Back to your account
                </Link>
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">Email</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="bg-secondary border border-border px-4 py-2.5 text-sm text-muted-foreground"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-foreground font-medium mb-1">Delivery address</p>
                <p className="text-xs text-muted-foreground">
                  Needed before you can accept a quote — we'll ask again at that point if it's missing.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground font-medium">Street name and number</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="12 Weaver Street"
                  className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderRadius: "var(--radius)" }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground font-medium">Apartment / Complex / Estate (optional)</label>
                <input
                  type="text"
                  value={addressComplex}
                  onChange={(e) => setAddressComplex(e.target.value)}
                  placeholder="e.g. Unit 4, Featherbrook Estate"
                  className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderRadius: "var(--radius)" }}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-foreground font-medium">Suburb</label>
                  <input
                    type="text"
                    value={addressSuburb}
                    onChange={(e) => setAddressSuburb(e.target.value)}
                    className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ borderRadius: "var(--radius)" }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-foreground font-medium">Postal code</label>
                  <input
                    type="text"
                    value={addressPostalCode}
                    onChange={(e) => setAddressPostalCode(e.target.value)}
                    className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ borderRadius: "var(--radius)" }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-foreground font-medium">Province</label>
                <select
                  value={addressProvince}
                  onChange={(e) => setAddressProvince(e.target.value)}
                  className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <option value="">Select a province</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">Cell phone</label>
              <input
                type="tel"
                value={cellPhone}
                onChange={(e) => setCellPhone(e.target.value)}
                placeholder="0821234567"
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">Landline</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={landlineAreaCode}
                  onChange={(e) => setLandlineAreaCode(e.target.value)}
                  placeholder="Area code"
                  className="w-28 bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderRadius: "var(--radius)" }}
                />
                <input
                  type="tel"
                  value={landlineNumber}
                  onChange={(e) => setLandlineNumber(e.target.value)}
                  placeholder="Number"
                  className="flex-1 bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ borderRadius: "var(--radius)" }}
                />
              </div>
              <p className="text-xs text-muted-foreground">3-digit area code, then 7-digit number.</p>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOrderStatusChanges}
                onChange={(e) => setNotifyOrderStatusChanges(e.target.checked)}
                className="w-4 h-4"
              />
              Email me when my order status changes
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="bg-accent text-accent-foreground py-3.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ borderRadius: "var(--radius)" }}
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
