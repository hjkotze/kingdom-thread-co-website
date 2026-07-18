import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { ApiError } from "../lib/api/client";
import AuthCard from "../components/auth/AuthCard";
import AuthFormField from "../components/auth/AuthFormField";

// Intentionally not linked from anywhere in the customer-facing UI (§1) —
// only reachable by navigating to /admin/login directly.
export default function AdminLogin() {
  const { loginAsAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await loginAsAdmin({ email, password });
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard eyebrow="Company access" title="Admin login" error={error}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthFormField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <AuthFormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-foreground text-primary-foreground py-3.5 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-60"
          style={{ borderRadius: "var(--radius)" }}
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
        <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground self-center -mt-1">
          Forgot your password?
        </Link>
      </form>
    </AuthCard>
  );
}
