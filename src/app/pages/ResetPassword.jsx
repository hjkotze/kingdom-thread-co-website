import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { useQuoteDraft } from "../lib/quote/QuoteDraftContext";
import { resetPassword } from "../lib/api/auth";
import { ApiError } from "../lib/api/client";
import AuthCard from "../components/auth/AuthCard";
import AuthFormField from "../components/auth/AuthFormField";
import { MIN_PASSWORD_LENGTH } from "../lib/passwordPolicy";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { setAuthenticatedUser } = useAuth();
  const { draft } = useQuoteDraft();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <AuthCard eyebrow="Invalid link" title="Something's missing">
        <p className="text-sm text-muted-foreground">
          This reset link is missing its token. Request a new one from the{" "}
          <Link to="/forgot-password" className="text-accent font-medium">
            forgot password
          </Link>{" "}
          page.
        </p>
      </AuthCard>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await resetPassword(token, password);
      setAuthenticatedUser(data.user);
      // Same same-tab resume heuristic as VerifyEmail.jsx — a draft only
      // survives if this is the same tab that started the quote flow.
      navigate(draft ? "/quote/review" : data.user.role === "admin" ? "/admin" : "/account", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <AuthCard eyebrow="Almost done" title="Choose a new password" error={error}>
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthFormField
          label="New password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoComplete="new-password"
          required
        />
        <AuthFormField
          label="Confirm new password"
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
          {submitting ? "Saving…" : "Reset password"}
        </button>
      </form>
    </AuthCard>
  );
}
