import { ArrowRight } from "lucide-react";

const SHOWCASE_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=480&fit=crop&auto=format",
    alt: "Custom colourful blanket",
  },
  {
    src: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400&h=480&fit=crop&auto=format",
    alt: "Custom printed duvet cover",
  },
];

export default function DesignCTA({ scrollTo }) {
  return (
    <section className="py-28 bg-foreground text-primary-foreground overflow-hidden relative">
      <div className="absolute inset-0 opacity-5">
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&h=800&fit=crop&auto=format"
          alt=""
          aria-hidden
          className="w-full h-full object-cover"
        />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p
            className="text-accent text-xs tracking-widest uppercase mb-4"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Your design
          </p>
          <h2
            className="text-4xl md:text-5xl mb-6"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500,
            }}
          >
            Bring us your
            <br />
            <em>wildest idea.</em>
          </h2>
          <p className="text-primary-foreground/70 leading-relaxed mb-8 max-w-md">
            There are almost no restrictions on sublimation
            prints. A full-bleed family portrait. Your
            cat&apos;s face. A gradient that shifts from
            sunrise to midnight. Just send it.
          </p>
          <p className="text-primary-foreground/70 text-sm leading-relaxed max-w-md mb-10">
            For embroidered products, we work only with clean,
            minimalist designs — a single initial, a small
            symbol, a simple line illustration. Less is more.
          </p>
          <button
            onClick={() => scrollTo("#contact")}
            className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-8 py-3.5 text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ borderRadius: "var(--radius)" }}
          >
            Start your custom order <ArrowRight size={14} />
          </button>
        </div>
        <div className="hidden md:grid grid-cols-2 gap-4">
          {SHOWCASE_IMAGES.map((img) => (
            <div
              key={img.alt}
              className="h-56 overflow-hidden bg-white/10"
              style={{ borderRadius: "var(--radius)" }}
            >
              <img
                src={img.src}
                alt={img.alt}
                className="w-full h-full object-cover opacity-80"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
