import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Header from "../components/Header";
import Hero from "../components/Hero";
import ProductCategories from "../components/ProductCategories";
import HowItWorks from "../components/HowItWorks";
import Shop from "../components/Shop";
import DesignCTA from "../components/DesignCTA";
import Footer from "../components/Footer";
import { scrollToSection } from "../lib/scrollToSection";

// Applied to every stacked wrapper except the first (Hero) — pulls it up by
// one viewport so its entrance overlaps the *previous* wrapper's spacer
// (see StackedSection below) instead of leaving an empty gap once that
// section's own content has fully scrolled past. scrollToSection.js's
// staticTopOf() accounts for this same margin when computing offsets, so
// nav jumps/scrollspy stay accurate.
//
// This 1-viewport overlap always eats into the *last* viewport of whatever
// content the previous section was still actively revealing (confirmed by
// measurement, not just theory: the overlap window is defined to end
// exactly where that section's content finishes, so it always lands on the
// tail of the reveal, never purely on "dead" space after it). For Hero/
// Products/HowItWorks that's invisible because each has at most ~150px of
// content taller than one viewport, so the eaten sliver is negligible. Shop
// is different — with a full product grid its content can run to ~2
// viewports, so the same 1-viewport overlap swallowed entire rows of
// products behind DesignCTA. Hence the much smaller DESIGN_CTA_OVERLAP_CLASS
// below, used only for the Shop → DesignCTA handoff.
const STACK_OVERLAP_CLASS = "-mt-[100vh]";

// Same purpose as STACK_OVERLAP_CLASS (avoid a blank gap after Shop's own
// content finishes) but deliberately tiny, so it can only ever eat a few
// stray pixels instead of a whole viewport of not-yet-seen products.
const DESIGN_CTA_OVERLAP_CLASS = "-mt-[24px]";

// Wraps a stacked section together with a same-height-as-viewport spacer
// sibling. The spacer is what actually gives `sticky top-0` room to dwell
// (browsers compute a sticky element's release point from real sibling
// flow content, NOT from padding/margin on the parent — confirmed by
// isolated testing, since a padding-bottom-only parent gives zero dwell).
// That one-viewport dwell is what makes a freshly-reached section snap in
// and hold, covering whatever was behind it, before releasing and
// scrolling normally through the rest of its own height — which in turn
// guarantees a section's full content (however tall, e.g. a large product
// grid) always gets scrolled past before the next section can take over.
function StackedSection({ overlap = false, children }) {
  return (
    <div className={`relative${overlap ? ` ${STACK_OVERLAP_CLASS}` : ""}`}>
      {children}
      <div className="h-screen" aria-hidden="true" />
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("all");

  const scrollTo = (href) => {
    scrollToSection(href);
  };

  // Supports links into this page with a hash (e.g. "/#shop" from the
  // account page's "start a new quote request" button).
  useEffect(() => {
    if (window.location.hash) {
      scrollToSection(window.location.hash);
    }
  }, []);

  const handleOrderNow = (product) => {
    navigate(`/quote/${product.id}`);
  };

  return (
    <>
      <Header />

      <StackedSection>
        <Hero scrollTo={scrollTo} />
      </StackedSection>

      <StackedSection overlap>
        <ProductCategories setActiveFilter={setActiveFilter} scrollTo={scrollTo} />
      </StackedSection>

      <StackedSection overlap>
        <HowItWorks />
      </StackedSection>

      <StackedSection overlap>
        <Shop
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          onOrderNow={handleOrderNow}
        />
      </StackedSection>

      <div className={DESIGN_CTA_OVERLAP_CLASS}>
        <DesignCTA scrollTo={scrollTo} />
      </div>

      <Footer scrollTo={scrollTo} />
    </>
  );
}
