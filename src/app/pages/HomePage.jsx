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
// tail of the reveal, never purely on "dead" space after it). For Hero and
// HowItWorks that's invisible because each has fixed, short content well
// under one viewport, so the eaten sliver is negligible. Products and Shop
// are different — an expanded category accordion (Products) or a full
// product grid (Shop) can push their content well past one viewport, so the
// same 1-viewport overlap swallows whatever hasn't been revealed yet (e.g.
// the last category's expanded panel getting cut off before you can scroll
// to it).
const STACK_OVERLAP_CLASS = "-mt-[100vh]";

// Deliberately tiny, so it can only ever eat a few stray pixels instead of a
// whole viewport of not-yet-seen content. Used for the Shop → DesignCTA
// handoff, where Shop's product grid can run to ~2 viewports — nowhere near
// small enough a safety margin to afford a bigger overlap (see
// PRODUCTS_TO_HOW_OVERLAP_CLASS below for a case where a bigger one *is*
// affordable).
const SMALL_OVERLAP_CLASS = "-mt-[24px]";
const DESIGN_CTA_OVERLAP_CLASS = SMALL_OVERLAP_CLASS;

// Products → HowItWorks handoff. Unlike Shop's grid, an expanded category
// accordion only ever grows ~150-180px past one viewport (measured directly
// via occlusion testing: scrolling through with elementFromPoint checks,
// not just geometry, since a higher z-index sibling can geometrically
// overlap a target while actually painting over it). That leaves enough
// safety margin to afford a much bigger overlap than SMALL_OVERLAP_CLASS —
// -130px tested clean through the tallest/last category ("Custom Socks")
// with room to spare, giving a noticeably stronger "cover" feel than a flat
// -24px everywhere would (a single small overlap across every transition
// was tried once and made the fixed-height handoffs, which don't need any
// safety margin, lose the cover feel entirely). Below `md`, ProductCategories'
// grid (`md:grid-cols-2`) stacks the category image under its text instead
// of beside it, making expanded panels much taller — so mobile keeps the
// same tiny, universally-safe overlap as Shop → DesignCTA instead.
const PRODUCTS_TO_HOW_OVERLAP_CLASS = "-mt-[24px] md:-mt-[130px]";

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
//
// overlap: false (no pull-up), true (full -100vh cover effect), or a
// className string for a custom overlap (see the *_OVERLAP_CLASS constants
// above for the cases that need one).
function StackedSection({ overlap = false, children }) {
  const overlapClass =
    typeof overlap === "string" ? overlap : overlap ? STACK_OVERLAP_CLASS : "";
  return (
    <div className={`relative${overlapClass ? ` ${overlapClass}` : ""}`}>
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

      <StackedSection overlap={PRODUCTS_TO_HOW_OVERLAP_CLASS}>
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
