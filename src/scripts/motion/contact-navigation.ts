type ContactRoute = {
  from: URL;
  to: URL;
  navigationType: string;
  newDocument: Document;
  viewTransition: ViewTransition;
};

let sequence = 0;
let pending: {
  id: string;
  targetId: string;
  destination: URL;
  routeUrl: URL;
  transition: ViewTransition;
} | undefined;
const destinations = new Map([
  ['#booking','booking'],
  ['#team','team'],
  ['#services','services'],
]);

export function isSectionHash(hash: string) {
  return destinations.has(hash);
}

/** Astro 7 moveToLocation assigns location.href for cross-page fragments.
 * Give this route ONE scroll owner: suppress that native fragment navigation,
 * then restore the URL without navigating and align the destination after swap.
 * The same URL object is restored because Astro retains it as originalLocation.
 * Same-page links and history restoration retain their existing behaviour.
 */
export function prepareContactNavigation(route: ContactRoute) {
  pending = undefined;
  const targetId = destinations.get(route.to.hash);
  if(route.navigationType === 'traverse'
    || route.from.pathname === route.to.pathname
    || !targetId
    || !route.newDocument.getElementById(targetId)) return;
  const id = String(++sequence);
  const destination = new URL(route.to.href);
  route.newDocument.documentElement.dataset.contactNavigation = id;
  pending = {id,targetId,destination,routeUrl:route.to,transition:route.viewTransition};
  route.to.hash = '';
}

export function settleContactNavigation() {
  const navigation = pending;
  pending = undefined;
  if(!navigation) return;
  navigation.routeUrl.hash = navigation.destination.hash;
  const root = document.documentElement;
  if(root.dataset.contactNavigation !== navigation.id) return;
  history.replaceState(history.state,'',navigation.destination.href);
  document.getElementById(navigation.targetId)?.scrollIntoView({block:'start',behavior:'instant'});
  // Save the actual landing for Back/Forward without dropping Astro's index/state.
  if(history.state) history.replaceState({...history.state,scrollX,scrollY},'');
  const release = () => {
    clearTimeout(safety);
    if(root.dataset.contactNavigation === navigation.id) delete root.dataset.contactNavigation;
  };
  // This timeout restores ordinary scrolling only; it never hides or blocks UI.
  const safety = window.setTimeout(release,1500);
  const afterSnapshot = () => requestAnimationFrame(()=>requestAnimationFrame(release));
  void navigation.transition.finished.then(afterSnapshot,afterSnapshot);
}
