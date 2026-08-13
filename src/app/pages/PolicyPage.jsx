import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { fetchPublicPolicy } from "../lib/api/policies";

// Shared by PrivacyPolicyPage.jsx and CookiePolicyPage.jsx — a full page
// (Header + Footer, same as every other public page) rather than a modal,
// per the requirement that these are real, linkable pages. Every link
// that points here (footer, checkout consent, registration consent)
// deliberately opens it in a new tab, so visiting it never loses whatever
// the visitor was doing on the page they came from.
export default function PolicyPage({ type, title }) {
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchPublicPolicy(type)
      .then((data) => {
        if (!cancelled) setContent(data.policy.content);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load this page. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  const scrollTo = (href) => navigate(`/${href}`);

  return (
    <>
      <Header />
      <section className="min-h-screen bg-background py-28 px-6">
        <div className="max-w-2xl mx-auto">
          <h1
            className="text-3xl text-foreground mb-8"
            style={{ fontFamily: "'Playfair Display', serif", fontWeight: 500 }}
          >
            {title}
          </h1>

          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && !content && (
            <p className="text-sm text-muted-foreground">This page hasn't been published yet.</p>
          )}
          {!loading && content && (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{content}</p>
          )}
        </div>
      </section>
      <Footer scrollTo={scrollTo} />
    </>
  );
}
