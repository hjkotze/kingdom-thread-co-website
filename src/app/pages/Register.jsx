import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { ApiError } from "../lib/api/client";
import AuthCard from "../components/auth/AuthCard";
import AuthFormField from "../components/auth/AuthFormField";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resumeTo = location.state?.from || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await register({ email, password, fullName, phone });
      navigate(resumeTo, { replace: true, state: location.state });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      eyebrow="New here?"
      title="Create an account"
      subtitle="We'll use this to keep your quote requests and communication history in one place."
      error={error}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" state={location.state} className="text-accent font-medium">
            Log in
          </Link>
        </>
      }
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthFormField
          label="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Dlamini"
          autoComplete="name"
          required
        />
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
          label="Phone (optional)"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="082 123 4567"
          autoComplete="tel"
        />
        <AuthFormField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />
        <AuthFormField
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent text-accent-foreground py-3.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ borderRadius: "var(--radius)" }}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
