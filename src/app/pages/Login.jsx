import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { ApiError } from "../lib/api/client";
import AuthCard from "../components/auth/AuthCard";
import AuthFormField from "../components/auth/AuthFormField";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resumeTo = location.state?.from || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(resumeTo, { replace: true, state: location.state });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      eyebrow="Welcome back"
      title="Log in"
      subtitle="Log in to start a quote request or check on an existing one."
      error={error}
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/register" state={location.state} className="text-accent font-medium">
            Register
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthFormField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          autoComplete="email"
          required
        />
        <AuthFormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent text-accent-foreground py-3.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ borderRadius: "var(--radius)" }}
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>
    </AuthCard>
  );
}
