import gsap from 'gsap';
import { ImageStackEntrance } from './motion/image-stack';
import { PageEntry } from './motion/page-entry';
import { TeamEntrance } from './motion/team-entry';
import { ScrollAssembly } from './motion/scroll-assembly';
import { preparePhotos } from './motion/photo-loading';
import { prepareServiceCarousel } from './services-carousel';
import { isSectionHash, prepareContactNavigation, settleContactNavigation } from './motion/contact-navigation';

type RouteSwap = Event & {
  from: URL;
  newDocument: Document;
  to: URL;
  navigationType: 'push' | 'replace' | 'traverse';
  viewTransition: ViewTransition;
};
type RoutePreparation = Event & {
  loader: () => Promise<void>;
  newDocument: Document;
  to: URL;
  signal: AbortSignal;
};
type PageSession = {
  body: HTMLElement;
  finish: () => void;
  closeMenu: (restore?: boolean) => void;
  dispose: () => void;
};

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let current: PageSession | undefined;
let incomingTransition: ViewTransition | undefined;
let restoringPosition = false;

/** Same contract as the neighbouring realtor's section-navigation.ts:
 * prepare route first → commit DOM and scroll → release snapshot → reveal content.
 * Astro ClientRouter handles fetch/history/scroll and superseded requests.
 * The header stays still; the destination has its own bounded assembly timeline.
 */
function mountPage() {
  if(current?.body === document.body) return;
  current?.dispose();
  const transition = incomingTransition;
  incomingTransition = undefined;
  current = createPageSession(transition,restoringPosition);
  restoringPosition = false;
}

function createPageSession(routeTransition?: ViewTransition, restoreVisible = false): PageSession {
  const body = document.body;
  const root = document.documentElement;
  const controller = new AbortController();
  const {signal} = controller;
  const cover = body.querySelector<HTMLElement>('[data-image-stack]');
  const stack = cover ? new ImageStackEntrance(cover) : null;
  const entry = new PageEntry(body,!!routeTransition);
  const team = new TeamEntrance(body);
  const assembly = new ScrollAssembly(body);
  const disposeCarousel = prepareServiceCarousel(body);
  const disposePhotos = preparePhotos(body);
  const fullIntro = root.classList.contains('intro-active') && !!stack;
  const assemble = root.classList.contains('page-entering') || fullIntro;
  let disposed = false;
  let settled = false;
  let routeReleased = !routeTransition;
  const releaseRoute = () => {
    routeReleased = true;
    if(settled && !disposed) delete root.dataset.routeTransition;
  };
  void routeTransition?.finished.then(releaseRoute,releaseRoute);
  let menuTween: gsap.core.Tween | undefined;
  const boot = window as Window & {nazSafetyTimer?:number};
  if(boot.nazSafetyTimer) clearTimeout(boot.nazSafetyTimer);
  // Intro cards + soft hero assembly need a longer fail-open than assemble-only.
  const safety = window.setTimeout(finish, fullIntro ? 11000 : 3200);
  if(fullIntro || assemble) {
    // Keep hero frozen under the stack / route snapshot; class may already be set by Layout.
    if(!fullIntro) root.classList.add('page-entering');
    entry.prepare();
  }
  let closeMenu = (_restore = true) => {};

  function revealSections() {
    if(disposed || reduced()) return;
    team.start(routeTransition?.finished,restoreVisible);
    assembly.start(routeTransition?.finished,restoreVisible);
  }

  function finish() {
    if(disposed || settled) return;
    settled = true;
    clearTimeout(safety);
    stack?.hide();
    entry.reset();
    root.dataset.pageEntry = 'complete';
    // Each section keeps its surface; only inner content is prepared for scroll.
    revealSections();
    root.classList.remove('intro-active','intro-revealing','intro-safari-bleed','page-entering');
    if(routeReleased) delete root.dataset.routeTransition;
  }

  function setupMenu() {
    const panel = body.querySelector<HTMLElement>('[data-nav-panel]');
    const backdrop = body.querySelector<HTMLElement>('[data-nav-backdrop]');
    const open = body.querySelector<HTMLButtonElement>('[data-menu-open]');
    const close = body.querySelector<HTMLButtonElement>('[data-menu-close]');
    if(!panel || !open || !close) return;
    const links = panel.querySelectorAll('a');
    const setOpen = (value: boolean,restore = true) => {
      menuTween?.kill();
      gsap.set(links,{clearProps:'opacity,transform'});
      root.classList.toggle('is-menu-open',value);
      panel.hidden = !value;
      panel.classList.toggle('is-open',value);
      if(backdrop) {
        backdrop.hidden = !value;
        backdrop.classList.toggle('is-open',value);
      }
      open.hidden = value;
      close.hidden = !value;
      open.setAttribute('aria-expanded',String(value));
      if(value) {
        close.focus({preventScroll:true});
        if(!reduced()) menuTween = gsap.fromTo(links,{y:12,opacity:0},
          {y:0,opacity:1,duration:.3,stagger:.03,clearProps:'opacity,transform',ease:'power2.out'});
      } else if(restore) open.focus({preventScroll:true});
    };
    closeMenu = (restore = true) => setOpen(false,restore);
    open.addEventListener('click',()=>setOpen(true),{signal});
    close.addEventListener('click',()=>setOpen(false),{signal});
    backdrop?.addEventListener('click',()=>setOpen(false),{signal});
    links.forEach(link=>link.addEventListener('click',()=>setOpen(false,false),{signal}));
    document.addEventListener('keydown',event=>{
      if(panel.hidden) return;
      if(event.key === 'Escape') {event.preventDefault();setOpen(false);}
      if(event.key !== 'Tab') return;
      const items = [close,...panel.querySelectorAll<HTMLAnchorElement>('a')];
      const first = items[0],last = items[items.length-1];
      if(event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
    },{signal});
    matchMedia('(min-width:1024px)').addEventListener('change',event=>{
      if(event.matches) setOpen(false,false);
    },{signal});
  }

  setupMenu();
  body.querySelectorAll<HTMLAnchorElement>('a[data-page-link]').forEach(link=>{
    link.addEventListener('click',event=>{
      if(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
      const target = new URL(link.href,location.href);
      if(target.origin !== location.origin) return;
      if(target.pathname === location.pathname && !target.hash) {
        event.preventDefault();
        // Preserve Astro's history index and saved position.
        history.replaceState(history.state,'',target.pathname+target.search);
        scrollTo({top:0,behavior:reduced()?'instant':'smooth'});
        closeMenu(false);
      }
      // Cross-page links are owned by ClientRouter, including modifier keys and Back.
    },{signal});
  });

  // Skip only the soft assembly itself — not the card intro under the cover.
  const interrupt = () => {if(root.dataset.pageEntry === 'assembling') finish();};
  window.addEventListener('pointerdown',interrupt,{signal,passive:true});
  window.addEventListener('wheel',interrupt,{signal,passive:true});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{
    finish();
    if(reduced()) assembly.finish();
  },{signal});

  async function entrance() {
    try {
      if(reduced() || (!fullIntro && !assemble)) return;
      let contentReady: Promise<unknown> = Promise.resolve();
      if(fullIntro) {
        const hero = body.querySelector<HTMLImageElement>('#hero-image');
        const photos = [...(cover?.querySelectorAll<HTMLImageElement>('img') ?? [])];
        contentReady = Promise.all([document.fonts.ready, hero?.decode().catch(()=>{})]);
        // Decode the actual intro frames; the site's assets load during the card motion.
        photos.forEach(photo=>{photo.loading = 'eager';});
        await Promise.race([
          Promise.all(photos.map(photo=>photo.decode().catch(()=>{}))),
          new Promise(resolve=>setTimeout(resolve,900)),
        ]);
      } else if(routeTransition) {
        // Release the route snapshot before starting the destination assembly.
        await routeTransition.finished.catch(()=>{});
      }
      if(disposed || settled) return;
      // Home first visit: card intro → then soft hero assembly (not a hard cut).
      if(fullIntro) {
        await stack!.play(contentReady);
        // Drop terracotta root + fixed/bleed cover before hero assembly so Safari
        // chrome does not keep the intro tint through the whole page-entry beat.
        stack!.hide();
        root.classList.remove('intro-active','intro-revealing','intro-safari-bleed');
        if(!root.classList.contains('page-entering')) root.classList.add('page-entering');
      }
      if(disposed || settled) return;
      revealSections();
      // A short decode budget; the inline photo preview covers a slow network.
      if(!fullIntro && !routeTransition) await Promise.race([
        body.querySelector<HTMLImageElement>('#hero-image')?.decode().catch(()=>{}),
        new Promise(resolve=>setTimeout(resolve,500)),
      ]);
      if(disposed || settled) return;
      if(fullIntro || assemble) await entry.play();
    } finally {finish();}
  }
  if(!fullIntro) revealSections();
  void entrance().catch(()=>{});

  return {
    body,finish,
    closeMenu:(restore = true)=>closeMenu(restore),
    dispose() {
      if(disposed) return;
      finish();
      disposed = true;
      controller.abort();
      assembly.dispose();
      disposeCarousel();
      disposePhotos();
      team.dispose();
      menuTween?.kill();
    },
  };
}

document.addEventListener('astro:before-preparation',event=>{
  current?.finish();
  current?.closeMenu(false);
  const preparation = event as RoutePreparation;
  const load = preparation.loader;
  preparation.loader = async () => {
    await load();
    if(preparation.signal.aborted || preparation.newDocument === document) return;
    // Section links land below the hero; do not delay them decoding an offscreen photo.
    if(isSectionHash(preparation.to.hash)) return;
    const hero = preparation.newDocument.querySelector<HTMLImageElement>('#hero-image');
    if(!hero) return;
    // Decode the destination photo while the current page is still live,
    // before Astro captures a frame. A slow image never locks that snapshot.
    const image = new Image();
    await new Promise<void>(resolve=>{
      let settled = false;
      const done = () => {
        if(settled) return;
        settled = true;
        clearTimeout(timer);
        preparation.signal.removeEventListener('abort',abort);
        resolve();
      };
      const abort = () => {image.src = '';done();};
      const timer = window.setTimeout(done,350);
      preparation.signal.addEventListener('abort',abort,{once:true});
      image.sizes = hero.sizes;
      image.srcset = hero.getAttribute('srcset') || '';
      image.src = new URL(hero.getAttribute('src')!,preparation.to).href;
      void image.decode().then(done,done);
    });
  };
});
document.addEventListener('astro:before-swap',event=>{
  const route = event as RouteSwap;
  current?.dispose();
  current = undefined;
  incomingTransition = route.viewTransition;
  restoringPosition = route.navigationType === 'traverse';
  void route.viewTransition.ready.catch(()=>{});
  if(reduced()) route.viewTransition.skipTransition();
  const next = route.newDocument.documentElement;
  next.classList.remove('intro-active','intro-revealing','intro-safari-bleed','page-entering','reveal-armed','is-menu-open');
  if(!reduced()) {
    next.dataset.routeTransition = 'running';
  } else delete next.dataset.routeTransition;
  // Back/Forward restores the saved page position without replaying its hero.
  const assemble = !reduced() && route.navigationType !== 'traverse' && !route.to.hash;
  if(assemble) next.classList.add('page-entering');
  next.dataset.pageEntry = assemble ? 'pending' : 'complete';
  prepareContactNavigation(route);
});
document.addEventListener('astro:after-swap',()=>{
  // Astro has committed the new document and hash; settle before reveal setup.
  settleContactNavigation();
  mountPage();
});
document.addEventListener('astro:page-load',mountPage);
window.addEventListener('pageshow',event=>{
  if(!event.persisted) return;
  current?.finish();
  current?.closeMenu(false);
});
mountPage();
