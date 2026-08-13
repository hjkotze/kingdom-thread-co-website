import { useEffect, useRef, useState } from "react";
import { Menu, X, ShoppingBag, ArrowRight, User, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { fetchOrderSummaryCounts } from "../lib/api/orders";
import { scrollToSection, staticTopOf } from "../lib/scrollToSection";
import { STATUSES, SHIPPED_STATUSES } from "../lib/orderStatus";
import logo from "../../assets/kingdom-thread-co-logo.png";

function initialsOf(fullName) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const NAV_LINKS = [
  { label: "Products", href: "#products" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Shop", href: "#shop" },
];

// Rendered on every page, not just the homepage (§ nav availability) — the
// section anchors it links to only exist on "/", so scrollTo navigates
// home first when called from elsewhere and lets HomePage's own
// hash-on-mount effect finish the scroll once it's rendered.
export default function Header() {
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [summaryCounts, setSummaryCounts] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const accountMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Scrollspy for the stacked homepage sections (see HomePage.jsx's
  // StackedSection wrappers and scrollToSection.js's staticTopOf) — each
  // tracked section's true static document offset is computed the same way
  // used for nav-click jumps, since sticky elements' own live geometry
  // (getBoundingClientRect/offsetTop) reports their current pinned
  // position, not their place in normal flow, while they're mid-dwell.
  // Comparing scrollY against those fixed offsets finds the last section
  // we've reached. Recomputed on every scroll tick rather than cached,
  // because ProductCategories/Shop fetch their content asynchronously —
  // a cache built once on mount (before those fetches resolve) would go
  // stale as soon as the real content changes each section's height.
  // No-ops on every other route since none of these ids exist there.
  useEffect(() => {
    if (location.pathname !== "/") {
      setActiveSection(null);
      return;
    }
    const ids = NAV_LINKS.map((l) => l.href.slice(1));
    if (!document.getElementById(ids[0])) return;

    const handleScroll = () => {
      const y = window.scrollY + 1;
      let current = null;
      for (const id of ids) {
        const top = staticTopOf(`#${id}`);
        if (top !== null && top <= y) current = id;
      }
      setActiveSection((prev) => (prev === current ? prev : current));
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!user || user.role !== "customer") {
      setSummaryCounts(null);
      return;
    }
    let cancelled = false;
    fetchOrderSummaryCounts()
      .then((data) => {
        if (!cancelled) setSummaryCounts(data);
      })
      .catch(() => {
        if (!cancelled) setSummaryCounts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const goToAccount = () => navigate("/account");
  const handleLogout = async () => {
    setAccountMenuOpen(false);
    setMenuOpen(false);
    await logout();
    navigate("/");
  };
  // Each badge links to the actual filtered view its count reflects,
  // rather than the unfiltered account page — otherwise the number never
  // visibly correlates with anything the customer lands on.
  const goToAwaitingReply = () => navigate("/account?view=quotes&status=awaiting_customer,finalised");
  const goToEligibleForOrder = () => navigate("/account?view=quotes&status=finalised");
  const unshippedStatuses = STATUSES.filter((s) => !SHIPPED_STATUSES.includes(s)).join(",");
  const goToUnshippedOrders = () => navigate(`/account?view=orders&status=${unshippedStatuses}`);

  const scrollTo = (hash) => {
    if (location.pathname === "/") {
      scrollToSection(hash);
    } else {
      navigate(`/${hash}`);
    }
    setMenuOpen(false);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-[60] bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-28 flex items-center justify-between">
        <Link
          to="/#hero"
          onClick={(e) => {
            e.preventDefault();
            scrollTo("#hero");
          }}
          className="flex items-center shrink-0"
        >
          <img
            src={logo}
            alt="Kingdom Thread Co"
            className="h-20 w-auto object-contain"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => {
            const isActive = activeSection === l.href.slice(1);
            return (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href)}
                className={`text-sm transition-colors tracking-wide ${
                  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <button
            onClick={() => scrollTo("#shop")}
            className="hidden md:inline-flex items-center gap-2 bg-accent text-accent-foreground px-5 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ borderRadius: "var(--radius)" }}
          >
            Order Now <ArrowRight size={14} />
          </button>

          {!loading && (!user || user.role === "customer") && user && (
            <div className="relative hidden md:block" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span
                  className="w-7 h-7 flex items-center justify-center bg-accent text-accent-foreground text-xs font-medium rounded-full"
                >
                  {initialsOf(user.fullName)}
                </span>
                <ChevronDown size={14} />
              </button>
              {accountMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-44 bg-card border border-border py-1.5 shadow-md"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <Link
                    to="/account"
                    onClick={() => setAccountMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    My quotes
                  </Link>
                  <Link
                    to="/account/profile"
                    onClick={() => setAccountMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          )}

          {!loading && (!user || user.role === "customer") && !user && (
            <Link
              to="/login"
              className="hidden md:inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <User size={16} />
              Log in
            </Link>
          )}

          <div className="flex items-center gap-1.5">
            <button
              className="p-1"
              onClick={user && user.role === "customer" ? goToAccount : undefined}
              aria-label="Your account activity"
            >
              <ShoppingBag size={20} className="text-foreground" />
            </button>
            {summaryCounts && (
              <>
                <CountBadge
                  count={summaryCounts.awaitingReplyCount}
                  color="var(--accent)"
                  title={`${summaryCounts.awaitingReplyCount} quote${summaryCounts.awaitingReplyCount === 1 ? "" : "s"} awaiting your reply`}
                  onClick={goToAwaitingReply}
                />
                <CountBadge
                  count={summaryCounts.eligibleForOrderCount}
                  color="#2563eb"
                  title={`${summaryCounts.eligibleForOrderCount} quote${summaryCounts.eligibleForOrderCount === 1 ? "" : "s"} ready to turn into an order`}
                  onClick={goToEligibleForOrder}
                />
                <CountBadge
                  count={summaryCounts.unshippedOrdersCount}
                  color="#16a34a"
                  title={`${summaryCounts.unshippedOrdersCount} order${summaryCounts.unshippedOrdersCount === 1 ? "" : "s"} not yet shipped`}
                  onClick={goToUnshippedOrders}
                />
              </>
            )}
          </div>

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
          {NAV_LINKS.map((l) => {
            const isActive = activeSection === l.href.slice(1);
            return (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href)}
                className={`text-left text-base py-1 ${isActive ? "text-foreground font-medium" : "text-foreground"}`}
              >
                {l.label}
              </button>
            );
          })}
          <button
            onClick={() => scrollTo("#shop")}
            className="mt-2 bg-accent text-accent-foreground px-5 py-3 text-sm font-medium text-left"
            style={{ borderRadius: "var(--radius)" }}
          >
            Order Now →
          </button>

          {!loading && (!user || user.role === "customer") && !user && (
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-1.5 text-base text-foreground py-1"
            >
              <User size={16} />
              Log in
            </Link>
          )}

          {!loading && user && user.role === "customer" && (
            <>
              <Link
                to="/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-1.5 text-base text-foreground py-1"
              >
                <User size={16} />
                {user.fullName.split(" ")[0]}
              </Link>
              <Link
                to="/account/profile"
                onClick={() => setMenuOpen(false)}
                className="text-base text-muted-foreground py-1 pl-6"
              >
                Profile
              </Link>
              <button onClick={handleLogout} className="text-left text-base text-muted-foreground py-1 pl-6">
                Log out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}

// Only rendered when count > 0 — a badge for zero would just be visual
// noise on every page for every customer. Native `title` gives a hover
// tooltip without pulling in a tooltip library for three small numbers.
// A real <button> (not a span) sitting in normal flow next to the bag
// icon, rather than a tiny absolutely-positioned overlay — that overlay
// approach left slivers of the badge hanging outside its parent's
// clickable box, unreliable to click/tap in practice.
function CountBadge({ count, color, title, onClick }) {
  if (!count) return null;
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="min-w-[20px] h-5 px-1 flex items-center justify-center text-xs font-medium text-white rounded-full"
      style={{ background: color }}
    >
      {count}
    </button>
  );
}
