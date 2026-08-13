import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { fetchCategories } from "../lib/api/products";

export default function ProductCategories({
  setActiveFilter,
  scrollTo,
}) {
  const [categories, setCategories] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(
    "blanket-budget",
  );

  useEffect(() => {
    let cancelled = false;
    fetchCategories()
      .then((data) => {
        if (!cancelled) setCategories(data.categories);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="products" className="py-28 bg-secondary">
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
          {categories.map((cat) => (
            <div
              key={cat.slug}
              className="border border-border overflow-hidden"
              style={{ borderRadius: "var(--radius)" }}
            >
              <button
                className="w-full text-left px-8 py-6 flex items-center justify-between bg-background hover:bg-muted transition-colors"
                onClick={() =>
                  setExpandedCategory(
                    expandedCategory === cat.slug
                      ? null
                      : cat.slug,
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
                      expandedCategory === cat.slug
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                  }}
                />
              </button>

              {expandedCategory === cat.slug && (
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
                        setActiveFilter(cat.id);
                        scrollTo("#shop");
                      }}
                      className="self-start flex items-center gap-2 text-accent text-sm font-medium hover:gap-3 transition-all"
                    >
                      View products <ArrowRight size={14} />
                    </button>
                  </div>
                  <div className="h-64 bg-muted overflow-hidden">
                    {cat.imageUrl && (
                      <img
                        src={cat.imageUrl}
                        alt={cat.alt}
                        className="w-full h-full object-cover"
                      />
                    )}
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
