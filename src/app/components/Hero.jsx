import { useEffect, useState } from "react";
import { fetchHomeStats } from "../lib/api/homeStats";

export default function Hero({ scrollTo }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchHomeStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        // leave stats null on failure — same "—" placeholder as loading,
        // rather than fabricating a number when the real one is unknown.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Reserves the same layout while loading rather than showing nothing —
  // "—" rather than a placeholder number, since these are real stats now
  // (§ homepage stats), not decorative figures.
  const displayStats = [
    { value: stats ? `${stats.ordersFulfilled}+` : "—", label: "Orders fulfilled" },
    { value: stats ? `${stats.customDesignPercent}%` : "—", label: "Custom designs" },
    { value: stats?.turnaroundText || "—", label: "Day turnaround" },
  ];

  return (
    <section id="hero" className="sticky top-0 z-10 pt-28 min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-muted">
        <img
          src=""
          alt="Soft textured woven fabric close-up"
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-24 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <p
            className="text-accent text-sm font-medium tracking-widest uppercase mb-6"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Custom-made in South Africa
          </p>
          <h1
            className="text-5xl md:text-6xl lg:text-7xl leading-none mb-8 text-foreground"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            Wrapped in
            <br />
            <em style={{ fontStyle: "italic" }}>something</em>
            <br />
            made for you.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10 max-w-md">
            Custom blankets, pillow cases, duvet covers and
            socks — sublimation-printed with any design you
            bring us, or precision-embroidered for those who
            want something quieter.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => scrollTo("#shop")}
              className="bg-foreground text-primary-foreground px-8 py-3.5 text-sm font-medium hover:bg-accent transition-colors"
              style={{ borderRadius: "var(--radius)" }}
            >
              Browse Products
            </button>
            <button
              onClick={() => scrollTo("#how-it-works")}
              className="border border-border text-foreground px-8 py-3.5 text-sm font-medium hover:bg-card transition-colors"
              style={{ borderRadius: "var(--radius)" }}
            >
              How it works
            </button>
          </div>
          <div className="flex items-center gap-6 mt-12 pt-10 border-t border-border">
            {displayStats.map((stat) => (
              <div key={stat.label}>
                <p
                  className="text-2xl font-semibold text-foreground"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                  }}
                >
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground tracking-wide mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex flex-col gap-4 items-end">
          <div
            className="w-72 h-80 overflow-hidden bg-muted"
            style={{ borderRadius: "var(--radius)" }}
          >
            <img
              src="https://images.unsplash.com/photo-1580301762395-13a9f7a84e59?w=600&h=700&fit=crop&auto=format"
              alt="Colourful custom blanket"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>
          <div
            className="w-56 h-56 overflow-hidden bg-muted self-start"
            style={{ borderRadius: "var(--radius)" }}
          >
            <img
              src="https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=500&h=500&fit=crop&auto=format"
              alt="Custom patterned socks"
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
