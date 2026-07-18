import { Menu, X, ShoppingBag, ArrowRight, User } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";

const NAV_LINKS = [
  { label: "Products", href: "#products" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Shop", href: "#shop" },
  { label: "Contact", href: "#contact" },
];

export default function Header({
  menuOpen,
  setMenuOpen,
  cartCount,
  scrollTo,
}) {
  const { user, loading } = useAuth();

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <a
          href="#"
          className="text-foreground no-underline"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "1.3rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          WOVEN
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.href)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors tracking-wide"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => scrollTo("#contact")}
            className="hidden md:inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ borderRadius: "var(--radius)" }}
          >
            Order Now <ArrowRight size={14} />
          </button>

          {!loading && (!user || user.role === "customer") && (
            <Link
              to={user ? "/account" : "/login"}
              className="hidden md:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <User size={16} />
              {user ? user.fullName.split(" ")[0] : "Log in"}
            </Link>
          )}

          <button className="relative p-1">
            <ShoppingBag
              size={20}
              className="text-foreground"
            />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          <button
            className="md:hidden p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-background border-t border-border px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((l) => (
            <button
              key={l.label}
              onClick={() => scrollTo(l.href)}
              className="text-left text-base text-foreground py-1"
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => scrollTo("#contact")}
            className="mt-2 bg-accent text-accent-foreground px-5 py-3 text-sm font-medium text-left"
            style={{ borderRadius: "var(--radius)" }}
          >
            Order Now →
          </button>
        </div>
      )}
    </header>
  );
}
