import { useState } from "react";
import { Link } from "react-router";
import { forgotPassword } from "../lib/api/auth";
import AuthCard from "../components/auth/AuthCard";
import AuthFormField from "../components/auth/AuthFormField";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await forgotPassword(email);
    } finally {
      // Always show the same confirmation regardless of outcome — the API
      // deliberately never reveals whether the email is registered.
      setSubmitting(false);
      setSent(true);
    }
  };

  if (sent) {
    return (
      <AuthCard eyebrow="Check your email" title="Reset link sent">
        <p className="text-sm text-foreground leading-relaxed">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It expires in
          1 hour.
        </p>
        <Link to="/login" className="text-sm text-accent font-medium self-start">
          Back to log in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      eyebrow="Trouble logging in?"
      title="Reset your password"
      subtitle="Enter the email on your account and we'll send you a link to choose a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="text-accent font-medium">
            Log in
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
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent text-accent-foreground py-3.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          style={{ borderRadius: "var(--radius)" }}
        >
          {submitting ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthCard>
  );
}
