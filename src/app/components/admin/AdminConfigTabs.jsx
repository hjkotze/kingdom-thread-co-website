import { Link, useLocation } from "react-router";

const CONFIG_TABS = [
  { to: "/admin/configuration/settings", label: "Settings" },
  { to: "/admin/configuration/privacy-policy", label: "Privacy Policy" },
  { to: "/admin/configuration/cookie-policy", label: "Cookie Policy" },
  { to: "/admin/configuration/categories", label: "Categories" },
  { to: "/admin/configuration/products", label: "Products" },
  { to: "/admin/configuration/thread-colours", label: "Thread Colours" },
];

// Second-level nav, nested one level inside AdminLayout's own top nav —
// same visual pattern, rendered at the top of every Configuration
// sub-page so switching between Products/Categories/Thread Colours/
// Settings/the two policies never requires leaving the section or
// scrolling past unrelated content.
export default function AdminConfigTabs() {
  const location = useLocation();

  return (
    <nav className="flex gap-2 flex-wrap mb-8">
      {CONFIG_TABS.map((tab) => {
        const active = location.pathname.startsWith(tab.to);
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="text-xs px-4 py-2 border transition-colors"
            style={{
              borderRadius: "var(--radius)",
              borderColor: active ? "var(--accent)" : "var(--border)",
              background: active ? "var(--accent)" : "transparent",
              color: active ? "var(--accent-foreground)" : "var(--muted-foreground)",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
