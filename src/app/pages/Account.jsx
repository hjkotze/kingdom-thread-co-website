import { useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";

// Placeholder — the real "new quote vs. existing quotes" screen (§4) and
// quote history list land in Phase 3.
export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <section className="min-h-screen bg-background py-28 px-6">
      <div className="max-w-3xl mx-auto">
        <p
          className="text-accent text-xs tracking-widest uppercase mb-3"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          Your account
        </p>
        <h1
          className="text-4xl text-foreground mb-6"
          style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
        >
          Welcome, {user.fullName.split(" ")[0]}.
        </h1>
        <p className="text-muted-foreground mb-8">
          Quote history and communication threads will appear here (coming in a later phase).
        </p>
        <button
          onClick={handleLogout}
          className="bg-foreground text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          style={{ borderRadius: "var(--radius)" }}
        >
          Log out
        </button>
      </div>
    </section>
  );
}
