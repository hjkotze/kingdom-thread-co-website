import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../lib/auth/AuthContext";
import logo from "../../../assets/kingdom-thread-co-logo.png";

function initialsOf(fullName) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

const NAV_LINKS = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/quotes", label: "Quotes" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/configuration", label: "Configuration" },
];

// Same fixed-header shell as the customer-facing Header.jsx (logo, nav,
// account dropdown) so the admin console reads as one product rather than
// a bolted-on back office — just without the shopping bag, which has no
// admin equivalent.
export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleLogout = async () => {
    setAccountMenuOpen(false);
    setMenuOpen(false);
    await logout();
    navigate("/admin/login");
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-28 flex items-center justify-between">
        <Link to="/admin" className="flex items-center shrink-0">
          <img
            src={logo}
            alt="Kingdom Thread Co"
            className="h-20 w-auto object-contain"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) => {
            const active = l.to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className="text-sm tracking-wide transition-colors"
                style={{ color: active ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: active ? 500 : 400 }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          {user && (
            <div className="relative hidden md:block" ref={accountMenuRef}>
              <button
                onClick={() => setAccountMenuOpen((open) => !open)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="w-7 h-7 flex items-center justify-center bg-accent text-accent-foreground text-xs font-medium rounded-full">
                  {initialsOf(user.fullName)}
                </span>
                <ChevronDown size={14} />
              </button>
              {accountMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-40 bg-card border border-border py-1.5 shadow-md"
                  style={{ borderRadius: "var(--radius)" }}
                >
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

          <button className="md:hidden p-1" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-background border-t border-border px-6 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className="text-left text-base text-foreground py-1"
            >
              {l.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="text-left text-base text-muted-foreground py-1">
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
