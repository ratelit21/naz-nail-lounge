/** Scroll state for the existing sticky header; supports Astro ClientRouter. */
const threshold=20;
let pending=0;
function syncHeader() {
  document.querySelector<HTMLElement>('.site-header')
    ?.classList.toggle('is-scrolled', window.scrollY > threshold);
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
