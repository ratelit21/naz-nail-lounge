/** Scroll state for the sticky header; supports Astro ClientRouter. */
const threshold = 20;
let pending = 0;

function syncHeader() {
  document
    .querySelector<HTMLElement>('.site-header')
    ?.classList.toggle('is-scrolled', window.scrollY > threshold);
}

function scheduleHeaderSync() {
  if (pending) return;
  pending = requestAnimationFrame(() => {
    pending = 0;
    syncHeader();
  });
}

window.addEventListener('scroll', scheduleHeaderSync, { passive: true });
window.addEventListener('resize', scheduleHeaderSync, { passive: true });
window.addEventListener('pageshow', scheduleHeaderSync);
document.addEventListener('astro:after-swap', () => {
  syncHeader();
  scheduleHeaderSync();
});
document.addEventListener('astro:page-load', scheduleHeaderSync);
syncHeader();
