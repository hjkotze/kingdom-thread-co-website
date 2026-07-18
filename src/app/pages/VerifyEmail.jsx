import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../lib/auth/AuthContext";
import { useQuoteDraft } from "../lib/quote/QuoteDraftContext";
import { verifyEmail } from "../lib/api/auth";
import { ApiError } from "../lib/api/client";
import AuthCard from "../components/auth/AuthCard";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { setAuthenticatedUser } = useAuth();
  const { draft } = useQuoteDraft();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying | error
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }
    verifyEmail(token)
      .then((data) => {
        setAuthenticatedUser(data.user);
        // If this is the same tab that started a quote request before being
        // sent off to verify, the sessionStorage-backed draft is still
        // here — resume it. A different tab (the common case, opening the
        // link from a mail client) won't have it, and just lands on
        // /account instead.
        navigate(draft ? "/quote/review" : "/account", { replace: true });
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (status === "verifying") {
    return (
      <AuthCard eyebrow="One moment" title="Verifying your email…">
        <p className="text-sm text-muted-foreground">This will just take a second.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Verification failed" title="Couldn't verify your email" error={error}>
      <p className="text-sm text-muted-foreground">
        Try registering again, or use the resend link if you still have your original confirmation screen open.
      </p>
    </AuthCard>
  );
}
