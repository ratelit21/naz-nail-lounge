/** Native horizontal scrolling keeps touch panning, pinch zoom and vertical page
 * scrolling. Only mouse dragging is captured. Autoplay writes scrollLeft, never
 * the transforms owned by ScrollAssembly. All work belongs to the page session.
 */
export function prepareServiceCarousel(scope: HTMLElement) {
  const gallery = scope.querySelector<HTMLElement>('[data-svc-gallery]');
  const strip = gallery?.querySelector<HTMLElement>('[data-svc-strip]');
  if(!gallery || !strip) return () => {};
  const originals = [...strip.querySelectorAll<HTMLElement>('[data-svc-item]')];
  if(originals.length < 2) return () => {};
  const controller = new AbortController();
  const {signal} = controller;
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pause = gallery.querySelector<HTMLButtonElement>('[data-svc-pause]');
  const clones: HTMLElement[] = [];
  // An identical set on either side lets drag/autoplay cross the seam without
  // reversing or jumping through the photographs. Only originals are announced.
  for(const side of ['before','after']) {
    const fragment = document.createDocumentFragment();
    for(const original of originals) {
      const clone = original.cloneNode(true) as HTMLElement;
      clone.removeAttribute('data-svc-item');
      clone.dataset.svcClone = '';
      clone.setAttribute('aria-hidden','true');
      clone.querySelector('img')?.setAttribute('alt','');
      clones.push(clone);
      fragment.append(clone);
    }
    if(side === 'before') strip.prepend(fragment);
    else strip.append(fragment);
  }

  let disposed = false, visible = false, hovered = false, focused = false;
  let userPaused = false, holding = false, autoplaying = false;
  let period = 0, step = 0, position = 0, previousTime = 0, measuredWidth = 0;
  let frame = 0, timer = 0, resumeAt = 0;
  let drag: {id:number;x:number;left:number} | undefined;
  const blocked = () => disposed || !visible || !period || hovered || focused || holding || userPaused || motion.matches
    || document.hidden || root.classList.contains('is-menu-open') || root.classList.contains('intro-active')
    || root.classList.contains('page-entering') || !!root.dataset.routeTransition
    || ['pending','running'].includes(gallery.dataset.revealState || '');

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    autoplaying = false;
    gallery!.dataset.svcAutoplay = 'paused';
  }
  function sync() {
    clearTimeout(timer);
    if(measuredWidth && strip!.clientWidth !== measuredWidth) {measure();return;}
    if(blocked()) {stop();return;}
    const delay = resumeAt - performance.now();
    if(delay > 0) {stop();timer = window.setTimeout(sync,delay + 20);return;}
    if(frame) return;
    position = strip!.scrollLeft;
    autoplaying = true;
    gallery!.dataset.svcAutoplay = 'running';
    frame = requestAnimationFrame(tick);
  }
  function tick(now: number) {
    frame = 0;
    if(blocked() || now < resumeAt) {sync();return;}
    // Keep fractional pixels ourselves: scrollLeft may round on some engines.
    if(previousTime) position += Math.min(now - previousTime,48) * .028;
    previousTime = now;
    if(position >= period * 2) position -= period;
    else if(position < period) position += period;
    strip!.scrollLeft = position;
    frame = requestAnimationFrame(tick);
  }
  function rest(milliseconds = 1400) {
    resumeAt = performance.now() + milliseconds;
    sync();
  }
  function measure() {
    // Layout values exclude the temporary scale applied by ScrollAssembly.
    const nextStep = parseFloat(getComputedStyle(originals[0]).width)
      + parseFloat(getComputedStyle(strip!).columnGap);
    if(!nextStep) return;
    // A narrower viewport can clamp the browser's old scrollLeft before this
    // callback. Preserve our last logical position, not that clamped value.
    const progress = period ? ((position % period) + period) % period / period : 0;
    step = nextStep;
    period = nextStep * originals.length;
    measuredWidth = strip!.clientWidth;
    stop();
    position = period * (1 + progress);
    strip!.scrollTo({left:position,behavior:'instant'});
    sync();
  }
  function move(direction: number) {
    rest();
    // Recenter before smooth manual scrolling so either end has enough runway.
    let left = strip!.scrollLeft;
    if(left < period) left += period;
    else if(left >= period * 2) left -= period;
    strip!.scrollTo({left,behavior:'instant'});
    strip!.scrollTo({left:left + step * direction,behavior:motion.matches ? 'instant' : 'smooth'});
  }

  // Only the inset rectangle in each photograph pauses autoplay; its outer
  // edges remain active. Include duplicate frames at the loop's edges.
  for(const zone of strip.querySelectorAll<HTMLElement>('.svc-hover-zone')) {
    zone.addEventListener('pointerenter',event=>{
      if(event.pointerType === 'mouse' || event.pointerType === 'pen') {hovered = true;sync();}
    },{signal});
    zone.addEventListener('pointerleave',event=>{
      if(event.pointerType === 'mouse' || event.pointerType === 'pen') {hovered = false;sync();}
    },{signal});
  }
  gallery.addEventListener('focusin',event=>{
    focused = event.target instanceof Element && event.target.matches(':focus-visible');
    sync();
  },{signal});
  gallery.addEventListener('focusout',event=>{
    focused = event.relatedTarget instanceof Element && gallery.contains(event.relatedTarget) && event.relatedTarget.matches(':focus-visible');
    sync();
  },{signal});
  strip.addEventListener('pointerdown',event=>{
    if(!event.isPrimary || event.button !== 0) return;
    holding = true;
    sync();
    if(event.pointerType === 'mouse') {
      event.preventDefault();
      drag = {id:event.pointerId,x:event.clientX,left:strip.scrollLeft};
      strip.setPointerCapture(event.pointerId);
      strip.dataset.dragging = '';
    }
  },{signal});
  strip.addEventListener('pointermove',event=>{
    if(!drag || event.pointerId !== drag.id) return;
    strip.scrollLeft = drag.left + drag.x - event.clientX;
  },{signal});
  const release = () => {
    if(!holding && !drag) return;
    holding = false;
    if(drag && strip.hasPointerCapture(drag.id)) strip.releasePointerCapture(drag.id);
    drag = undefined;
    delete strip.dataset.dragging;
    rest();
  };
  window.addEventListener('pointerup',release,{signal,passive:true});
  window.addEventListener('pointercancel',release,{signal,passive:true});
  strip.addEventListener('lostpointercapture',release,{signal});
  strip.addEventListener('wheel',()=>rest(),{signal,passive:true});
  strip.addEventListener('scroll',()=>{
    if(autoplaying) return;
    if(strip.clientWidth === measuredWidth) position = strip.scrollLeft;
    // Wait for native touch inertia / smooth button scrolling to settle.
    rest();
    // Rebase only far into a duplicate set, preserving the exact visible frame.
    const left = strip.scrollLeft;
    if(period && (left < period * .5 || left > period * 2.5)) {
      strip.scrollTo({left:left < period ? left + period : left - period,behavior:'instant'});
    }
  },{signal,passive:true});
  strip.addEventListener('keydown',event=>{
    if(event.altKey || event.ctrlKey || event.metaKey) return;
    if(event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();move(event.key === 'ArrowRight' ? 1 : -1);
    } else if(event.key === 'Home' || event.key === 'End') {
      event.preventDefault();rest();
      strip.scrollTo({left:period + (event.key === 'End' ? step * (originals.length - 1) : 0),behavior:'instant'});
    }
  },{signal});
  gallery.querySelector('[data-svc-prev]')?.addEventListener('click',()=>move(-1),{signal});
  gallery.querySelector('[data-svc-next]')?.addEventListener('click',()=>move(1),{signal});
  pause?.addEventListener('click',()=>{
    userPaused = !userPaused;
    pause.setAttribute('aria-label',userPaused ? 'Запустить автопрокрутку' : 'Приостановить автопрокрутку');
    gallery.querySelector('[data-svc-pause-icon]')?.toggleAttribute('hidden',userPaused);
    gallery.querySelector('[data-svc-play-icon]')?.toggleAttribute('hidden',!userPaused);
    sync();
  },{signal});
  motion.addEventListener('change',sync,{signal});
  document.addEventListener('visibilitychange',sync,{signal});
  window.addEventListener('blur',()=>{holding = false;drag = undefined;delete strip.dataset.dragging;stop();},{signal});
  window.addEventListener('focus',sync,{signal});
  const intersection = new IntersectionObserver(entries=>{
    visible = entries[0].isIntersecting;
    sync();
  },{threshold:0});
  intersection.observe(gallery);
  const resize = new ResizeObserver(measure);
  resize.observe(strip);
  const state = new MutationObserver(sync);
  state.observe(root,{attributes:true,attributeFilter:['class','data-route-transition']});
  state.observe(gallery,{attributes:true,attributeFilter:['data-reveal-state']});
  measure();
  gallery.dataset.svcReady = '';

  return () => {
    disposed = true;
    stop();
    clearTimeout(timer);
    controller.abort();
    intersection.disconnect();
    resize.disconnect();
    state.disconnect();
    clones.forEach(clone=>clone.remove());
  };
}
