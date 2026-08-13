// The homepage's stacked sections (Hero/ProductCategories/HowItWorks/Shop —
// see HomePage.jsx's STACK_DWELL_CLASS) are each `sticky top-0` with an
// increasing z-index, wrapped in their own dedicated containing block so
// each gets a bounded "focused" dwell before releasing and scrolling
// normally through the rest of its own height. Side effect shared by any
// sticky element: once it's mid-dwell (pinned), getBoundingClientRect()/
// offsetTop report its CURRENT pinned position, not where it sits in normal
// document flow, so `element.scrollIntoView()` computes nothing-to-do and
// silently fails to navigate to it — breaking "scroll back up to an
// earlier section" and the logo/Hero link once you're deep in the page.
// Fix: compute the section's true static document offset by summing
// preceding siblings' heights (skipping fixed/absolutely positioned ones,
// e.g. the header, which don't contribute to normal document flow) and
// scroll there directly, rather than asking the browser to figure it out
// from current (unreliable) geometry.

// Sections are wrapped (see HomePage.jsx) so each sticky child's containing
// block is its own wrapper, not the whole page — this walks up from the
// target element to whichever ancestor is a direct child of `root`, i.e.
// the wrapper div if there is one, or the element itself if not.
function ancestorUnderRoot(el, root) {
  let node = el;
  while (node.parentElement && node.parentElement !== root) {
    node = node.parentElement;
  }
  return node;
}

function findRoot() {
  const header = document.querySelector("header");
  return header ? header.parentElement : null;
}

export function staticTopOf(hash) {
  const el = document.querySelector(hash);
  const root = findRoot();
  if (!el || !root) return null;

  const anchor = ancestorUnderRoot(el, root);
  let cumulative = 0;
  for (const child of root.children) {
    // Some wrappers carry a negative top margin (STACK_OVERLAP_CLASS in
    // HomePage.jsx) so they slide up into the previous wrapper's reserved
    // dwell space instead of leaving a blank gap — that shifts this child's
    // own true position too, so it has to be added even when `child` is
    // the one we're solving for, not just accumulated from earlier ones.
    const marginTop = parseFloat(getComputedStyle(child).marginTop) || 0;
    if (child === anchor) return cumulative + marginTop;
    const position = getComputedStyle(child).position;
    if (position !== "fixed" && position !== "absolute") {
      const marginBottom = parseFloat(getComputedStyle(child).marginBottom) || 0;
      cumulative += child.offsetHeight + marginTop + marginBottom;
    }
  }
  return cumulative;
}

export function scrollToSection(hash) {
  const target = staticTopOf(hash);
  if (target === null) return false;

  // behavior:"smooth" is unreliable here — animating the native scroll
  // through a region of `sticky top-0` sections that are mid-repositioning
  // on every frame causes Chrome to stall the animation partway (sometimes
  // not moving at all), unlike a plain instant jump which always lands
  // correctly. The stacking-cover animation you see from normal wheel/
  // trackpad scrolling is untouched by this — it only affects these
  // programmatic nav/logo jumps.
  window.scrollTo({ top: target, behavior: "instant" });

  // An instant programmatic scrollTo doesn't reliably fire a native
  // "scroll" event in every case — confirmed by testing, even from a real
  // click. Header.jsx's scrollspy listens for "scroll" to know which nav
  // link to highlight, so without this it can be left showing whatever was
  // active before the jump.
  window.dispatchEvent(new Event("scroll"));
  return true;
}
