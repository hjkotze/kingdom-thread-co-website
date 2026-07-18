const PRODUCT_LINKS = [
  "Budget Blankets",
  "Premium Blankets",
  "Budget Home Textiles",
  "Premium Home Textiles",
  "Custom Socks",
];

export default function Footer({ scrollTo }) {
  return (
    <footer className="bg-foreground text-primary-foreground py-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <p
              className="text-primary-foreground text-xl mb-3"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}
            >
              WOVEN
            </p>
            <p className="text-primary-foreground/50 text-sm leading-relaxed max-w-xs">
              Custom blankets, pillow cases, duvet covers and
              socks — made with care in South Africa.
            </p>
          </div>

          <div>
            <p
              className="text-xs tracking-widest uppercase text-primary-foreground/40 mb-4"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Products
            </p>
            <ul className="flex flex-col gap-2">
              {PRODUCT_LINKS.map((item) => (
                <li key={item}>
                  <button
                    onClick={() => scrollTo("#products")}
                    className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p
              className="text-xs tracking-widest uppercase text-primary-foreground/40 mb-4"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              Contact
            </p>
            <ul className="flex flex-col gap-2">
              <li>
                <a
                  href="mailto:hello@woven.co.za"
                  className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                >
                  hello@woven.co.za
                </a>
              </li>
              <li className="text-sm text-primary-foreground/60">
                South Africa · Ships nationwide
              </li>
              <li className="text-sm text-primary-foreground/60">
                Turnaround: 7–10 working days
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-primary-foreground/30">
            © 2024 Woven. All rights reserved.
          </p>
          <p
            className="text-xs text-primary-foreground/30"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            Handmade with care · South Africa
          </p>
        </div>
      </div>
    </footer>
  );
}
