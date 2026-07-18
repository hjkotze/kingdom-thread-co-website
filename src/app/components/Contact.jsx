import { useRef, useState } from "react";
import { Upload, Type, Image, Layers } from "lucide-react";

const PRODUCT_SELECT_OPTIONS = [
  { value: "", label: "Select a product..." },
  {
    value: "budget-blanket",
    label: "Budget Blanket (Sublimation)",
    productId: [1, 2],
  },
  {
    value: "premium-blanket",
    label: "Premium Blanket (Embroidered)",
    productId: [3, 4],
  },
  {
    value: "budget-pillow",
    label: "Budget Pillow Case (Sublimation)",
    productId: [7],
  },
  {
    value: "premium-pillow",
    label: "Premium Pillow Case (Embroidered)",
    productId: [8],
  },
  {
    value: "budget-duvet",
    label: "Budget Duvet Cover (Sublimation)",
    productId: [9],
  },
  {
    value: "premium-duvet",
    label: "Premium Duvet Cover (Embroidered)",
    productId: [10],
  },
  {
    value: "ankle-socks",
    label: "Custom Ankle Socks (Sublimation)",
    productId: [5],
  },
  {
    value: "crew-socks",
    label: "Custom Crew Socks (Sublimation)",
    productId: [6],
  },
  {
    value: "multiple",
    label: "Multiple products",
    productId: [],
  },
];

export default function Contact({
  sectionRef,
  selectedProduct,
  setSelectedProduct,
}) {
  const [designType, setDesignType] = useState("");
  const [designText, setDesignText] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [designNotes, setDesignNotes] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setUploadedFileName(file.name);
  };

  const needsImage =
    designType === "image" || designType === "both";
  const needsText =
    designType === "text" || designType === "both";

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="py-28 bg-background"
    >
      <div className="max-w-3xl mx-auto px-6 lg:px-10">
        <div className="mb-12 text-center">
          <p
            className="text-accent text-xs tracking-widest uppercase mb-3"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Get in touch
          </p>
          <h2
            className="text-4xl md:text-5xl text-foreground mb-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500,
            }}
          >
            Request a quote
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Fill in the form below and we&apos;ll send you a
            design proof and quote within one business day.
          </p>
        </div>

        <form
          className="bg-card border border-border p-8 md:p-10 flex flex-col gap-6"
          style={{ borderRadius: "var(--radius)" }}
          onSubmit={(e) => e.preventDefault()}
        >
          {/* Name + Email */}
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">
                Full name
              </label>
              <input
                type="text"
                placeholder="Jane Dlamini"
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">
                Email address
              </label>
              <input
                type="email"
                placeholder="jane@example.com"
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>
          </div>

          {/* Product selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground font-medium">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) =>
                setSelectedProduct(e.target.value)
              }
              className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ borderRadius: "var(--radius)" }}
            >
              {PRODUCT_SELECT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground font-medium">
              Quantity
            </label>
            <input
              type="number"
              min={1}
              defaultValue={1}
              className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-32"
              style={{ borderRadius: "var(--radius)" }}
            />
          </div>

          {/* Design type */}
          <div className="flex flex-col gap-3">
            <label className="text-sm text-foreground font-medium">
              What does your design include?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  value: "image",
                  label: "Image only",
                  icon: Image,
                },
                {
                  value: "text",
                  label: "Text only",
                  icon: Type,
                },
                {
                  value: "both",
                  label: "Image + Text",
                  icon: Layers,
                },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setDesignType(
                      designType === value ? "" : value,
                    )
                  }
                  className="flex flex-col items-center gap-2 py-4 border transition-colors text-sm"
                  style={{
                    borderRadius: "var(--radius)",
                    borderColor:
                      designType === value
                        ? "var(--accent)"
                        : "var(--border)",
                    background:
                      designType === value
                        ? "var(--accent)"
                        : "var(--input-background)",
                    color:
                      designType === value
                        ? "var(--accent-foreground)"
                        : "var(--muted-foreground)",
                  }}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Image upload */}
          {needsImage && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">
                Upload your image or artwork
              </label>
              <div
                className="border-2 border-dashed border-border bg-input-background px-6 py-8 flex flex-col items-center gap-3 cursor-pointer hover:border-accent transition-colors"
                style={{ borderRadius: "var(--radius)" }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload
                  size={22}
                  className="text-muted-foreground"
                />
                {uploadedFileName ? (
                  <p className="text-sm text-foreground font-medium">
                    {uploadedFileName}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      Click to upload or drag and drop
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      style={{
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      PNG, JPG, PDF, SVG · max 20 MB
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf,.svg,.ai,.psd"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* Text input */}
          {needsText && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">
                Text to include on your design
              </label>
              <input
                type="text"
                value={designText}
                onChange={(e) =>
                  setDesignText(e.target.value)
                }
                placeholder="e.g. 'Smith Family 2024' or a monogram like 'JD'"
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
              <p className="text-xs text-muted-foreground">
                Include any font preference or style notes
                below.
              </p>
            </div>
          )}

          {/* Additional notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-foreground font-medium">
              {designType
                ? "Additional notes or instructions"
                : "Describe your design or idea"}
            </label>
            <textarea
              rows={4}
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
              placeholder={
                designType
                  ? "Preferred colours, placement, size, deadline, or anything else we should know..."
                  : "Describe your design, share a link to reference images, or tell us how many you need and by when..."
              }
              className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              style={{ borderRadius: "var(--radius)" }}
            />
          </div>

          <button
            type="submit"
            className="bg-accent text-accent-foreground py-3.5 text-sm font-medium hover:opacity-90 transition-opacity mt-1"
            style={{ borderRadius: "var(--radius)" }}
          >
            Send enquiry — we&apos;ll reply within 1 business
            day
          </button>

          <p className="text-xs text-muted-foreground text-center -mt-2">
            No payment is taken until you approve your design
            proof.
          </p>
        </form>
      </div>
    </section>
  );
}
