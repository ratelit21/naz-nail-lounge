import gsap from 'gsap';

type Assembly = {
  host: HTMLElement;
  timeline: gsap.core.Timeline;
  state: 'pending' | 'running' | 'complete';
};

/** Local NAZ choreography, not a copied demo.
 * Home: copy rises in sequence, work/photos follow; TeamEntrance owns portraits.
 * Atmosphere: each photograph settles independently, then its caption; balance
 * copy enters horizontally. Only inner content moves; section surfaces stay put.
 * Observe stationary hosts (not a whole tall section or its animated image).
 * GSAP lifecycle: https://gsap.com/docs/v3/GSAP/gsap.context()/
 */
export class ScrollAssembly {
  private units = new Map<Element, Assembly>();
  private observer?: IntersectionObserver;
  private active = false;
  private started = false;
  private ready: Promise<unknown> = Promise.resolve();
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private settle = () => { if(this.motion.matches) this.finish(); };
  private focus = (event: FocusEvent) => {
    for(const unit of this.units.values()) {
      if(event.target instanceof Node && unit.host.contains(event.target)) this.complete(unit);
    }
  };

  constructor(private scope: HTMLElement) {}

  start(ready?: Promise<unknown>, restoreVisible = false) {
    if(this.started || this.motion.matches) return;
    this.started = true;
    this.active = true;
    this.ready = ready?.catch(()=>{}) ?? Promise.resolve();
    const atmosphere = document.documentElement.dataset.page === 'atmosphere';
    const compact = matchMedia('(max-width:767px)').matches;
    const hosts = [...this.scope.querySelectorAll<HTMLElement>(
      '[data-reveal] [data-reveal-item], [data-svc-assembly], [data-team-copy]',
    )];
    // Read layout before applying any animated state.
    const bounds = hosts.map(host=>host.getBoundingClientRect());
    try {
      this.observer = new IntersectionObserver(entries=>{
        for(const entry of entries) {
          if(!entry.isIntersecting) continue;
          const unit = this.units.get(entry.target);
          if(!unit || unit.state !== 'pending') continue;
          this.observer?.unobserve(entry.target);
          unit.state = 'running';
          void this.ready.then(()=>{
            if(!this.active || unit.state === 'complete') return;
            // A fast anchor jump may have already passed this element.
            if(unit.host.getBoundingClientRect().bottom <= 0) this.complete(unit);
            else {
              unit.host.dataset.revealState = 'running';
              unit.timeline.play();
            }
          });
        }
      },{threshold:0,rootMargin:'0px 0px -6% 0px'});

      hosts.forEach((host,index)=>{
        if(bounds[index].bottom <= 0 || (restoreVisible && bounds[index].top < innerHeight)) return;
        // Reveal the stationary carousel viewport once. Its horizontal scrolling
        // has a separate owner, so recycled slides never re-enter hidden states.
        const image = host.matches('[data-svc-assembly]')
          ? host.querySelector<HTMLElement>('[data-svc-strip]')
          : host.querySelector<HTMLImageElement>('img');
        const copy = [...host.children].filter((element): element is HTMLElement =>
          element instanceof HTMLElement && !element.contains(image) && element !== image,
        );
        const unit: Assembly = {
          host,state:'pending',
          timeline:gsap.timeline({paused:true,onComplete:()=>this.complete(unit)}),
        };
        this.units.set(host,unit);
        host.dataset.revealState = 'pending';
        if(image) {
          unit.timeline.fromTo(image,
            {opacity:0,y:atmosphere ? (compact ? 22 : 36) : (compact ? 18 : 28),scale:atmosphere ? 1.065 : 1.035},
            {opacity:1,y:0,scale:1,duration:compact ? .85 : 1.05,ease:'power3.out'},0);
        }
        if(copy.length) {
          unit.timeline.fromTo(copy,
            {opacity:0,x:atmosphere && !image ? (compact ? 14 : 24) : 0,y:atmosphere && !image ? 0 : (compact ? 22 : 32)},
            {opacity:1,x:0,y:0,duration:compact ? .65 : .8,stagger:atmosphere ? .1 : .075,ease:'power3.out'},
            image ? .16 : 0);
        }
        this.observer!.observe(host);
      });
      this.motion.addEventListener('change',this.settle);
      this.scope.addEventListener('focusin',this.focus);
    } catch {this.finish();}
  }

  private complete(unit: Assembly) {
    if(unit.state === 'complete') return;
    unit.state = 'complete';
    this.observer?.unobserve(unit.host);
    // Restore the original inline styles, including crop/preview styles.
    unit.timeline.revert();
    unit.host.dataset.revealState = 'complete';
  }

  finish() {
    this.active = false;
    this.observer?.disconnect();
    for(const unit of this.units.values()) this.complete(unit);
  }

  dispose() {
    this.finish();
    this.motion.removeEventListener('change',this.settle);
    this.scope.removeEventListener('focusin',this.focus);
    for(const unit of this.units.values()) delete unit.host.dataset.revealState;
    this.units.clear();
  }
}
