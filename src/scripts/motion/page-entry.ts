import gsap from 'gsap';

/** Soft hero assembly after intro or client route swap.
 * Motion language (distinct from team cast drop):
 * - photo: soft horizontal clip-path wipe + slight scale settle
 * - copy: left→right clip reveal + opacity (no tall y travel)
 * Not a named Codrops clone; local NAZ choreography after the image-stack cover.
 */
export class PageEntry {
  private timeline?: gsap.core.Timeline;
  private settle?: () => void;
  private timeout?: number;
  private visualHost: HTMLElement | null;
  private visual: HTMLElement | null;
  private parts: HTMLElement[];

  constructor(scope: ParentNode = document, private route = false) {
    this.visualHost = scope.querySelector<HTMLElement>('[data-page-visual]');
    this.visual = this.visualHost?.querySelector<HTMLElement>('img') ?? null;
    this.parts = [...scope.querySelectorAll<HTMLElement>('[data-page-part]')];
  }

  /** Freeze hero in pre-assemble state so intro can reveal the page without a hard cut. */
  prepare() {
    // Internal routes already dissolve between committed, stationary pages.
    // Keep their photo/copy present in the destination snapshot; a full wipe
    // here would expose an empty hero, followed by a second entrance beat.
    if(this.route) {
      if(this.visual) gsap.set(this.visual,{scale:1.015,opacity:.9,transformOrigin:'50% 50%'});
      if(this.parts.length) gsap.set(this.parts,{opacity:.7,y:8});
      return;
    }
    if(this.visualHost) {
      gsap.set(this.visualHost, {clipPath:'inset(0 100% 0 0)', webkitClipPath:'inset(0 100% 0 0)'});
    }
    if(this.visual) gsap.set(this.visual, {scale:1.04, transformOrigin:'50% 50%'});
    if(this.parts.length) {
      gsap.set(this.parts, {opacity:0, clipPath:'inset(0 100% 0 0)', webkitClipPath:'inset(0 100% 0 0)'});
    }
  }

  play() {
    const done = new Promise<void>(resolve => {this.settle = resolve;});
    document.documentElement.dataset.pageEntry = 'assembling';
    document.documentElement.classList.add('page-entering');
    this.prepare();
    this.timeout = window.setTimeout(() => this.finish(), 2600);
    const mobile = matchMedia('(max-width:767px)').matches;
    this.timeline = gsap.timeline({
      defaults:{ease:'power2.out'},
      onComplete:() => this.finish(),
    });

    if(this.route) {
      if(this.visual) this.timeline.to(this.visual,{scale:1,opacity:1,duration:.48},0);
      if(this.parts.length) this.timeline.to(this.parts,{opacity:1,y:0,duration:.38,stagger:.035},0);
      if(!this.visual && !this.parts.length) this.finish();
      return done;
    }

    if(this.visualHost) {
      this.timeline.fromTo(this.visualHost,
        {clipPath:'inset(0 100% 0 0)', webkitClipPath:'inset(0 100% 0 0)'},
        {clipPath:'inset(0 0% 0 0)', webkitClipPath:'inset(0 0% 0 0)', duration:mobile ? .95 : 1.2},
        0);
    }
    if(this.visual) {
      this.timeline.fromTo(this.visual,
        {scale:1.04},
        {scale:1, duration:mobile ? 1.05 : 1.3},
        0);
    }
    if(this.parts.length) {
      this.timeline.fromTo(this.parts,
        {opacity:0, clipPath:'inset(0 100% 0 0)', webkitClipPath:'inset(0 100% 0 0)'},
        {
          opacity:1,
          clipPath:'inset(0 0% 0 0)',
          webkitClipPath:'inset(0 0% 0 0)',
          duration:mobile ? .65 : .82,
          stagger:.1,
        },
        mobile ? .16 : .22);
    }
    if(!this.visualHost && !this.parts.length) this.finish();
    return done;
  }

  private finish() {
    if(this.timeout) clearTimeout(this.timeout);
    this.timeout = undefined;
    this.settle?.();
    this.settle = undefined;
  }

  reset() {
    this.timeline?.kill();
    this.finish();
    if(this.visualHost) gsap.set(this.visualHost, {clearProps:'clipPath,webkitClipPath'});
    if(this.visual) gsap.set(this.visual, {clearProps:'transform,opacity'});
    if(this.parts.length) gsap.set(this.parts, {clearProps:'opacity,clipPath,webkitClipPath,transform'});
    document.documentElement.dataset.pageEntry = 'complete';
  }
}
