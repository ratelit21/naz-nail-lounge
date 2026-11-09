/** Scroll state for the existing sticky header; supports Astro ClientRouter. */
const threshold=20;
let pending=0;
function syncHeader() {
  const root = document.documentElement;
  const intro = root.classList.contains('intro-active');
  // Intro on mobile WebKit intentionally scrolls the texture under the iOS
  // status bar. That scroll is not a real user navigation state.
  document.querySelector<HTMLElement>('.site-header')
    ?.classList.toggle('is-scrolled', !intro && window.scrollY > threshold);

  let darkBottom = false;
  if (!intro) {
    const footer = document.querySelector<HTMLElement>('.site-footer');
    // When the document ends above the iPhone toolbar, Safari uses the BODY
    // background-color below it. The fallback must match the dark footer.
    if (footer?.classList.contains('footer-dark') && footer.getBoundingClientRect().top <= window.innerHeight - 24) {
      darkBottom = true;
    } else {
      const underToolbar = document.elementFromPoint(
        Math.max(1, window.innerWidth / 2),
        Math.max(1, window.innerHeight - 6),
      );
      darkBottom = !!underToolbar?.closest(
        '.site-footer:not(.footer-cream),.services-band,.about-bridge,.contacts:not(.contacts-cream),.cream-balance',
      );
    }
  }
  root.classList.toggle('chrome-bottom-dark', darkBottom);
  // theme-color remains useful in Chrome/older Safari; iOS 26 reads the actual
  // body background instead. Avoid permanently tinting the hero dark.
  const theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const expected = intro ? '#bd7950' : darkBottom ? '#08251f' : '#eee1ce';
  if (theme && theme.content !== expected) theme.content = expected;
}
function scheduleHeaderSync() {
  if(pending) return;
  pending=requestAnimationFrame(()=>{
    pending=0;
    syncHeader();
  });
}
window.addEventListener('scroll',scheduleHeaderSync,{passive:true});
window.addEventListener('resize',scheduleHeaderSync,{passive:true});
window.addEventListener('pageshow',scheduleHeaderSync);
/* Apply the destination header state without a second animated flash.
   This class lives only on the incoming document and is cleared once
   the route view transition is finished, including skipped transitions. */
let headerRouteId = 0;
document.addEventListener('astro:before-swap', event => {
  const swap = event as Event & {newDocument: Document; viewTransition: ViewTransition};
  swap.newDocument.documentElement.classList.add('header-route-sync');
  const id = ++headerRouteId;
  const settle = () => requestAnimationFrame(() => {
    if(id !== headerRouteId) return;
    syncHeader();
    document.documentElement.classList.remove('header-route-sync');
  });
  void swap.viewTransition.finished.then(settle, settle);
});
document.addEventListener('astro:after-swap',()=>{
  syncHeader();
  scheduleHeaderSync();
});
document.addEventListener('astro:page-load',scheduleHeaderSync);
syncHeader();
