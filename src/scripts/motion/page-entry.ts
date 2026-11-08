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

  constructor(scope: ParentNode = document) {
    this.visualHost = scope.querySelector<HTMLElement>('[data-page-visual]');
    this.visual = this.visualHost?.querySelector<HTMLElement>('img') ?? null;
    this.parts = [...scope.querySelectorAll<HTMLElement>('[data-page-part]')];
  }

  /** Freeze hero in pre-assemble state so intro can reveal the page without a hard cut. */
  prepare() {
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
