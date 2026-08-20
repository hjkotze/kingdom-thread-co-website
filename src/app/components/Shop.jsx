import { useEffect, useState } from "react";
import { fetchProducts, fetchCategories } from "../lib/api/products";
import StarRating from "./StarRating";
import Carousel from "./Carousel";

export default function Shop({
  activeFilter,
  setActiveFilter,
  onOrderNow,
}) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([productsData, categoriesData]) => {
        if (cancelled) return;
        setProducts(productsData.products);
        setCategories(categoriesData.categories);
      })
      .catch(() => {
        // Distinct from "there just aren't any products" — a fetch failure
        // (NocoDB down, network issue) shouldn't render identically to a
        // genuinely empty catalogue, which would read as "this store has
        // nothing for sale" rather than "something broke."
        if (!cancelled) {
          setProducts([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filter buttons are built from the live category list rather than a
  // hardcoded set — every product now links to a real Categories record
  // (§ admin catalogue management), so filtering matches on that
  // relationship (categoryId) instead of the old free-text slug.
  const filterOptions = [
    { value: "all", label: "All Products" },
    ...categories.map((c) => ({ value: c.id, label: c.label })),
  ];

  const filteredProducts =
    activeFilter === "all"
      ? products
      : products.filter((p) => p.categoryId === activeFilter);

  return (
    <section id="shop" className="py-28 bg-secondary">
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
            {filterOptions.map((f) => (
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

        {loading && (
          <p className="text-sm text-muted-foreground">Loading products…</p>
        )}
        {!loading && loadError && (
          <p className="text-sm text-destructive">
            Couldn't load products — please try refreshing the page.
          </p>
        )}
        {!loading && !loadError && filteredProducts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No products found.
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-background border border-border overflow-hidden group hover:border-accent transition-colors flex flex-col"
              style={{ borderRadius: "var(--radius)" }}
            >
              <div
                className="relative h-56 overflow-hidden bg-background"
                style={product.images.length > 0 ? undefined : { background: product.imageFallbackColour }}
              >
                <Carousel
                  images={product.images}
                  alt={product.name}
                  imageClassName="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
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
                  <StarRating value={product.rating} count={product.reviews} />
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
