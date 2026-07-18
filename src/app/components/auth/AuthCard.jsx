export default function AuthCard({ eyebrow, title, subtitle, error, children, footer }) {
  return (
    <section className="min-h-screen bg-background flex items-center justify-center py-28 px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          {eyebrow && (
            <p
              className="text-accent text-xs tracking-widest uppercase mb-3"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className="text-4xl text-foreground mb-3"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
          >
            {title}
          </h1>
          {subtitle && <p className="text-muted-foreground leading-relaxed">{subtitle}</p>}
        </div>

        <div
          className="bg-card border border-border p-8 flex flex-col gap-5"
          style={{ borderRadius: "var(--radius)" }}
        >
          {error && (
            <p
              className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5"
              style={{ borderRadius: "var(--radius)" }}
            >
              {error}
            </p>
          )}
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </section>
  );
}
