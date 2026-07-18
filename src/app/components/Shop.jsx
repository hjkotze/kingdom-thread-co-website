import { Star } from "lucide-react";

const PRODUCTS = [
  {
    id: 1,
    category: "blanket-budget",
    name: "Custom Photo Blanket",
    subtitle: "Budget · Sublimation",
    price: 45,
    tag: "Any Design",
    rating: 4.8,
    reviews: 124,
    img: "",
    imgFallback: "#C4A882",
    badge: "Most Popular",
    description:
      "Full-colour sublimation print. Upload any photo, pattern or artwork.",
  },
  {
    id: 2,
    category: "blanket-budget",
    name: "Pattern Throw",
    subtitle: "Budget · Sublimation",
    price: 55,
    tag: "Any Design",
    rating: 4.7,
    reviews: 89,
    img: "",
    imgFallback: "#B8956A",
    badge: null,
    description:
      "Vivid all-over pattern printing on a soft, lightweight fleece throw.",
  },
  {
    id: 3,
    category: "blanket-premium",
    name: "Monogram Blanket",
    subtitle: "Premium · Embroidered",
    price: 120,
    tag: "Minimalist",
    rating: 5.0,
    reviews: 42,
    img: "",
    imgFallback: "#D4C4A8",
    badge: "Handcrafted",
    description:
      "Precision thread embroidery of your initials or a simple monogram on a luxury wool-blend.",
  },
  {
    id: 4,
    category: "blanket-premium",
    name: "Minimalist Line Art",
    subtitle: "Premium · Embroidered",
    price: 140,
    tag: "Minimalist",
    rating: 4.9,
    reviews: 31,
    img: "",
    imgFallback: "#C8B89A",
    badge: null,
    description:
      "Single-colour line illustration embroidered cleanly on a neutral ground. Timeless.",
  },
  {
    id: 5,
    category: "socks",
    name: "Custom Ankle Socks",
    subtitle: "Socks · Sublimation",
    price: 18,
    tag: "Any Design",
    rating: 4.8,
    reviews: 211,
    img: "",
    imgFallback: "#9A7B5C",
    badge: "Best Seller",
    description:
      "Full-wrap sublimation on premium cotton-blend. Your design, exactly.",
  },
  {
    id: 6,
    category: "socks",
    name: "Custom Crew Socks",
    subtitle: "Socks · Sublimation",
    price: 22,
    tag: "Any Design",
    rating: 4.9,
    reviews: 178,
    img: "",
    imgFallback: "#8A6B4E",
    badge: null,
    description:
      "Crew-length with edge-to-edge print. Ideal for gifting, teams, or personal expression.",
  },
  {
    id: 7,
    category: "pillow-budget",
    name: "Custom Pillow Case",
    subtitle: "Budget · Sublimation",
    price: 25,
    tag: "Any Design",
    rating: 4.7,
    reviews: 66,
    img: "",
    imgFallback: "#BFA882",
    badge: null,
    description:
      "Sublimation-printed pillow case with vibrant, wash-resistant colour on a smooth polyester cover.",
  },
  {
    id: 8,
    category: "pillow-premium",
    name: "Embroidered Pillow Case",
    subtitle: "Premium · Embroidered",
    price: 85,
    tag: "Minimalist",
    rating: 4.9,
    reviews: 19,
    img: "",
    imgFallback: "#D8CCBA",
    badge: "Handcrafted",
    description:
      "Crisp cotton pillow case with a hand-embroidered monogram or minimal motif. A quiet luxury.",
  },
  {
    id: 9,
    category: "duvet-budget",
    name: "Custom Duvet Cover",
    subtitle: "Budget · Sublimation",
    price: 180,
    tag: "Any Design",
    rating: 4.6,
    reviews: 38,
    img: "",
    imgFallback: "#C4A86E",
    badge: "New",
    description:
      "Full-surface sublimation on a soft microfibre duvet cover. Make your bedroom entirely your own.",
  },
  {
    id: 10,
    category: "duvet-premium",
    name: "Embroidered Duvet Cover",
    subtitle: "Premium · Embroidered",
    price: 350,
    tag: "Minimalist",
    rating: 5.0,
    reviews: 9,
    img: "",
    imgFallback: "#E0D4BC",
    badge: "Luxury",
    description:
      "100% cotton duvet cover with a single refined embroidered motif. Understated, enduring quality.",
  },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All Products" },
  { value: "blanket-budget", label: "Budget Blankets" },
  { value: "blanket-premium", label: "Premium Blankets" },
  { value: "pillow-budget", label: "Budget Pillows" },
  { value: "pillow-premium", label: "Premium Pillows" },
  { value: "duvet-budget", label: "Budget Duvets" },
  { value: "duvet-premium", label: "Premium Duvets" },
  { value: "socks", label: "Socks" },
];

export default function Shop({
  activeFilter,
  setActiveFilter,
  onOrderNow,
}) {
  const filteredProducts =
    activeFilter === "all"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeFilter);

  return (
    <section id="shop" className="py-28 bg-card">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p
              className="text-accent text-xs tracking-widest uppercase mb-3"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Shop
            </p>
            <h2
              className="text-4xl md:text-5xl text-foreground"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 500,
              }}
            >
              Our products.
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className="text-xs px-4 py-2 border transition-colors"
                style={{
                  borderRadius: "var(--radius)",
                  borderColor:
                    activeFilter === f.value
                      ? "var(--accent)"
                      : "var(--border)",
                  background:
                    activeFilter === f.value
                      ? "var(--accent)"
                      : "transparent",
                  color:
                    activeFilter === f.value
                      ? "var(--accent-foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-background border border-border overflow-hidden group hover:border-accent transition-colors flex flex-col"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div
                className="relative h-56 overflow-hidden"
                style={{ background: product.imgFallback }}
              >
                {product.img && (
                  <img
                    src={product.img}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                )}
                {product.badge && (
                  <span
                    className="absolute top-3 left-3 bg-accent text-accent-foreground text-xs px-3 py-1 font-medium"
                    style={{ borderRadius: "var(--radius)" }}
                  >
                    {product.badge}
                  </span>
                )}
                <span
                  className="absolute top-3 right-3 bg-background/90 text-foreground text-xs px-3 py-1"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    borderRadius: "var(--radius)",
                  }}
                >
                  {product.tag}
                </span>
              </div>

              <div className="p-5 flex flex-col flex-1">
                <p
                  className="text-xs text-muted-foreground mb-1 tracking-wider uppercase"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                  }}
                >
                  {product.subtitle}
                </p>
                <h3
                  className="text-lg text-foreground mb-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-1">
                  {product.description}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <Star
                      size={12}
                      className="fill-accent text-accent"
                    />
                    <span className="text-xs text-muted-foreground">
                      {product.rating} ({product.reviews})
                    </span>
                  </div>
                  <p
                    className="text-lg font-medium text-foreground"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                    }}
                  >
                    from R{product.price}
                  </p>
                </div>

                <button
                  onClick={() => onOrderNow(product)}
                  className="w-full bg-foreground text-primary-foreground py-2.5 text-sm font-medium hover:bg-accent transition-colors"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  Order this product
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
