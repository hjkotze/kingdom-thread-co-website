import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Choose your product",
    body: "Pick from blankets, pillow cases, duvet covers, or custom socks — each available in budget sublimation or premium embroidered options.",
  },
  {
    number: "02",
    title: "Submit your design",
    body: "Upload your artwork, image, or text — or describe your idea. Our team helps you get it print-ready at no extra charge.",
  },
  {
    number: "03",
    title: "Confirm & pay",
    body: "We'll send you a design proof and final quote. Once you approve, payment is collected securely before production begins.",
  },
  {
    number: "04",
    title: "We craft and deliver",
    body: "Your order is printed or embroidered with care and shipped directly to your door within 7–10 working days.",
  },
];

export default function HowItWorks({ scrollTo }) {
  return (
    <section
      id="how-it-works"
      className="py-28 bg-background"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="mb-16">
          <p
            className="text-accent text-xs tracking-widest uppercase mb-3"
            style={{ fontFamily: "'DM Mono', monospace" }}
          >
            The process
          </p>
          <h2
            className="text-4xl md:text-5xl text-foreground"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500,
            }}
          >
            Simple from start
            <br />
            to your door.
          </h2>
        </div>

        <div className="grid md:grid-cols-4 gap-0 md:divide-x divide-border">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="py-10 md:px-8 first:pl-0 last:pr-0 border-t md:border-t-0 border-border first:border-t-0"
            >
              <p
                className="text-5xl text-muted mb-6"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 500,
                }}
              >
                {step.number}
              </p>
              <h3
                className="text-lg text-foreground mb-3"
                style={{
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                {step.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div
          className="mt-16 bg-card border border-border px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          <p className="text-foreground text-sm leading-relaxed max-w-xl">
            <strong>Not sure about your design file?</strong>{" "}
            Send us whatever you have — a rough sketch, a
            photo, a PDF. Our team will advise on what works
            best for each product.
          </p>
          <button
            onClick={() => scrollTo("#contact")}
            className="whitespace-nowrap text-sm text-accent font-medium flex items-center gap-2 hover:gap-3 transition-all"
          >
            Get in touch <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}
