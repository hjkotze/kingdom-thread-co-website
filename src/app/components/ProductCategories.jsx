import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";

const CATEGORIES = [
  {
    id: "blanket-budget",
    label: "Budget Blankets",
    headline: "Any design. Any photo. Yours.",
    body: "Sublimation printing lets you put literally anything on your blanket — family portraits, pet photos, custom illustrations, gradients, full-colour patterns. No design restrictions, incredibly vibrant results.",
    callout: "From R45 · Any Design",
    img: "",
    alt: "Colourful custom sublimation blanket draped over a couch",
  },
  {
    id: "blanket-premium",
    label: "Premium Blankets",
    headline: "Restraint, elevated to an art.",
    body: "Our premium blankets are hand-embroidered with a single motif — a monogram, a minimal line illustration, a small crest. Nothing more. The luxury is in the material and the precision of the stitch.",
    callout: "From R120 · Minimalist Only",
    img: "",
    alt: "Cream wool blanket with delicate monogram embroidery",
  },
  {
    id: "home-budget",
    label: "Budget Home Textiles",
    headline: "Your bedroom, your canvas.",
    body: "Sublimation-printed pillow cases and duvet covers let you bring any photo or pattern to your living space. Full-colour, wash-resistant, and made to last. Great for personal use and gifting.",
    callout: "Pillows from R25 · Duvets from R180",
    img: "",
    alt: "Colourful custom printed duvet cover on a bed",
  },
  {
    id: "home-premium",
    label: "Premium Home Textiles",
    headline: "The quiet beauty of a single stitch.",
    body: "Embroidered pillow cases and duvet covers in quality cotton. One motif, precisely placed. For those who believe that restraint is the ultimate luxury.",
    callout: "Pillows from R85 · Duvets from R350",
    img: "",
    alt: "Minimal cream duvet with embroidered accent",
  },
  {
    id: "socks",
    label: "Custom Socks",
    headline: "Your artwork, wrapped around every step.",
    body: "Sublimation socks with edge-to-edge colour fidelity. Submit any design — patterns, portraits, logos, memes — and we print it faithfully onto a comfortable cotton-blend base.",
    callout: "From R18 · Any Design",
    img: "",
    alt: "Brightly patterned custom sublimation socks on a wooden surface",
  },
];

export default function ProductCategories({
  setActiveFilter,
  scrollTo,
}) {
  const [expandedCategory, setExpandedCategory] = useState(
    "blanket-budget",
  );

  return (
    <section id="products" className="py-28 bg-card">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p
              className="text-accent text-xs tracking-widest uppercase mb-3"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              What we make
            </p>
            <h2
              className="text-4xl md:text-5xl text-foreground"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 500,
              }}
            >
              Five lines,
              <br />
              infinite possibilities.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
            Budget sublimation or premium embroidery —
            blankets, pillow cases, duvet covers, and socks.
            Find what fits your vision.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="border border-border overflow-hidden"
              style={{ borderRadius: "var(--radius)" }}
            >
              <button
                className="w-full text-left px-8 py-6 flex items-center justify-between bg-background hover:bg-secondary transition-colors"
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === cat.id
                      ? null
                      : cat.id,
                  )
                }
              >
                <div className="flex items-center gap-6">
                  <span
                    className="text-accent text-xs tracking-widest uppercase"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {cat.callout}
                  </span>
                  <h3
                    className="text-xl text-foreground"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    {cat.label}
                  </h3>
                </div>
                <ChevronDown
                  size={18}
                  className="text-muted-foreground transition-transform duration-300"
                  style={{
                    transform:
                      expandedCategory === cat.id
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                  }}
                />
              </button>

              {expandedCategory === cat.id && (
                <div className="grid md:grid-cols-2 gap-0 bg-card">
                  <div className="px-8 py-10 flex flex-col justify-center">
                    <h4
                      className="text-2xl md:text-3xl mb-4 text-foreground"
                      style={{
                        fontFamily:
                          "'Playfair Display', serif",
                        fontStyle: "italic",
                      }}
                    >
                      {cat.headline}
                    </h4>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {cat.body}
                    </p>
                    <button
                      onClick={() => {
                        setActiveFilter(
                          cat.id.replace(
                            "home-",
                            "pillow-",
                          ) === cat.id
                            ? cat.id
                            : "all",
                        );
                        scrollTo("#shop");
                      }}
                      className="self-start flex items-center gap-2 text-accent text-sm font-medium hover:gap-3 transition-all"
                    >
                      View products <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="h-64 md:h-auto bg-muted overflow-hidden">
                    <img
                      src={cat.img}
                      alt={cat.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
