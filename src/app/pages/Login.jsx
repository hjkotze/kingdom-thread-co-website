import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { resendVerification } from "../lib/api/auth";
import { ApiError } from "../lib/api/client";
import AuthCard from "../components/auth/AuthCard";
import AuthFormField from "../components/auth/AuthFormField";
import Header from "../components/Header";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState("idle"); // idle | sending | sent

  // Falls back to /account (not "/") — same default VerifyEmail.jsx and
  // ResetPassword.jsx already use when there's no in-progress quote draft
  // to resume. A direct login should land on the customer's own
  // quotes/account area, not back on the marketing homepage.
  const resumeTo = location.state?.from || "/account";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setNeedsVerification(false);
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(resumeTo, { replace: true, state: location.state });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
        setError(err.message);
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResendState("sending");
    try {
      await resendVerification(email);
    } finally {
      setResendState("sent");
    }
  };

  return (
    <>
      <Header />
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
        <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground self-center -mt-1">
          Forgot your password?
        </Link>
        {needsVerification && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendState !== "idle"}
            className="text-sm text-accent font-medium disabled:opacity-60"
          >
            {resendState === "idle" && "Resend verification email"}
            {resendState === "sending" && "Sending…"}
            {resendState === "sent" && "Sent — check your inbox"}
          </button>
        )}
      </form>
      </AuthCard>
    </>
  );
}
