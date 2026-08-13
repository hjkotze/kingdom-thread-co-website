// Homepage sections are plain normal-flow blocks (see HomePage.jsx), so a
// target's document position is just its own bounding rect plus the current
// scroll offset — no special-casing needed.
export function staticTopOf(hash) {
  const el = document.querySelector(hash);
  if (!el) return null;
  return el.getBoundingClientRect().top + window.scrollY;
}

export function scrollToSection(hash) {
  const target = staticTopOf(hash);
  if (target === null) return false;

  // behavior:"smooth" is unreliable for a programmatic jump like this —
  // confirmed independently of any sticky/stacked layout, so an instant
  // jump is used instead.
  window.scrollTo({ top: target, behavior: "instant" });

  // An instant programmatic scrollTo doesn't reliably fire a native
  // "scroll" event in every case — confirmed by testing, even from a real
  // click. Header.jsx's scrollspy listens for "scroll" to know which nav
  // link to highlight, so without this it can be left showing whatever was
  // active before the jump.
  window.dispatchEvent(new Event("scroll"));
  return true;
}
