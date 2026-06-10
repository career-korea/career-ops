// motion.ts — decorative scroll-reveal orchestration.
//
// Purely presentational: touches no app state, routing, or API logic.
// Safety model:
//   1. If prefers-reduced-motion is set, this module does nothing —
//      no html class is added, so the CSS hidden state never applies.
//   2. If this script fails to run at all, `html.js-motion` is absent
//      and every .reveal rule is inert: content stays fully visible.
//
// Hash routing remounts page components, so a MutationObserver keeps
// newly mounted elements enrolled and reveals replay per navigation.

const REVEAL_SELECTOR = [
  '.metric-ribbon > div',
  '.topbar',
  '.command-card',
  '.pricing-card',
  '.stat-row > div',
  '.job-item',
  '.command-catalog .section-head',
].join(',');

const STAGGER_MS = 60;
const STAGGER_CAP_MS = 360;

function init(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window) || !('MutationObserver' in window)) return;

  document.documentElement.classList.add('js-motion');

  const enrolled = new WeakSet<Element>();

  const io = new IntersectionObserver(
    (entries) => {
      let batchIndex = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        // Stagger siblings revealed in the same frame, capped so long
        // grids (18 mode cards) don't crawl.
        el.style.transitionDelay = `${Math.min(batchIndex * STAGGER_MS, STAGGER_CAP_MS)}ms`;
        batchIndex += 1;
        el.classList.add('in-view');
        io.unobserve(el);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );

  const enroll = (el: Element): void => {
    if (enrolled.has(el)) return;
    enrolled.add(el);
    el.classList.add('reveal');
    io.observe(el);
  };

  const scan = (root: Element | Document): void => {
    if (root instanceof Element && root.matches(REVEAL_SELECTOR)) enroll(root);
    root.querySelectorAll(REVEAL_SELECTOR).forEach(enroll);
  };

  scan(document);

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) scan(node);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}

init();

export {};
