import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { resendVerification } from "../lib/api/auth";
import { ApiError } from "../lib/api/client";
import AuthCard from "../components/auth/AuthCard";
import AuthFormField from "../components/auth/AuthFormField";

export default function Register() {
  const { register } = useAuth();
  const location = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cellPhone, setCellPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToPolicies, setAgreedToPolicies] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState(null);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (!agreedToPolicies) {
      setError("Please agree to the Privacy Policy and Cookie Policy to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await register({ email, password, fullName, cellPhone });
      setRegisteredEmail(data.email);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendState("sending");
    try {
      await resendVerification(registeredEmail);
    } finally {
      setResendState("sent");
    }
  };

  if (registeredEmail) {
    return (
      <AuthCard eyebrow="Almost there" title="Check your email">
        <p className="text-sm text-foreground leading-relaxed">
          We've sent a verification link to <strong>{registeredEmail}</strong>. Click it to activate your account —
          you won't be able to log in until then.
        </p>
        <button
          onClick={handleResend}
          disabled={resendState !== "idle"}
          className="text-sm text-accent font-medium self-start disabled:opacity-60"
        >
          {resendState === "idle" && "Didn't get it? Resend the email"}
          {resendState === "sending" && "Sending…"}
          {resendState === "sent" && "Sent — check your inbox"}
        </button>
      </AuthCard>
    );
  }

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
          label="Cell phone (optional)"
          type="tel"
          value={cellPhone}
          onChange={(e) => setCellPhone(e.target.value)}
          placeholder="0821234567"
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
        <label className="flex items-start gap-2.5 text-sm text-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToPolicies}
            onChange={(e) => setAgreedToPolicies(e.target.checked)}
            className="w-4 h-4 mt-0.5 shrink-0"
            required
          />
          <span>
            I agree to the{" "}
            <a href="/privacy-policy" target="_blank" rel="noreferrer" className="text-accent font-medium">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/cookie-policy" target="_blank" rel="noreferrer" className="text-accent font-medium">
              Cookie Policy
            </a>
          </span>
        </label>
        <button
          type="submit"
          disabled={submitting || !agreedToPolicies}
          className="bg-accent text-accent-foreground py-3.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ borderRadius: "var(--radius)" }}
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
