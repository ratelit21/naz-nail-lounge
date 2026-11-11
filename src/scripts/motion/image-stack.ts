/*! Image Stack Entrance — Codrops / deadrabbbbit (MIT).
 * Source: https://github.com/d3adrabbit/EntranceAnimationForImages/blob/main/js/index.js
 * Blob b1edee491fd99742b2069df2d953f0b5a09838a2; css/base.css blob 676cd7158bbfa8f68e37cae56e8042ac66d2593f.
 * The finite opening retains the original 8-card transforms, stagger and durations.
 * Owner-requested size adaptation: cards 96x144 / 128x192, larger wordmark.
 * Ring radius follows Codrops (radius2 = outer - radius1) with a larger outer
 * budget so the centre hole stays open for the wordmark. Brand/photos replaced.
 * Perpetual idle rotations omitted; the site reveals after the opening.
 * iOS Safari 26: fixed layers never paint under Liquid Glass chrome. On mobile
 * WebKit the cover uses an in-flow bleed stage + scroll pin so the clay texture
 * composites behind the bars (Kelvin Man / Pavel Ionov recipe, Oct–May 2026).
 * Unmodified reference files: studio/motion-reference/. License: /licenses/codrops-image-stack.txt
 */
import gsap from 'gsap';

const HOLD_DURATION = 1.5;
const SAFARI_TOP = 100;
const SAFARI_BOTTOM = 160;

function needsSafariBleed() {
  return matchMedia('(max-width:767px)').matches
    && CSS.supports('-webkit-touch-callout', 'none');
}

export class ImageStackEntrance {
  private timeline?: gsap.core.Timeline;
  private cards: HTMLElement[];
  private settle?: () => void;
  private escape?: (event: KeyboardEvent) => void;
  private deadline?: number;
  private bleed = false;
  private pinFrame = 0;
  private onPinResize?: () => void;

  constructor(private element: HTMLElement) {
    this.cards = [...element.querySelectorAll<HTMLElement>('[data-stack-card]')];
  }

  play(contentReady: Promise<unknown> = Promise.resolve()) {
    this.hide();
    const desktop = matchMedia('(min-width:53em)').matches;
    const group = this.element.querySelector<HTMLElement>('[data-stack-group]')!;
    const headings = this.element.querySelector<HTMLElement>('[data-stack-headings]')!;
    const card = this.cards[0];
    const count = this.cards.length;
    const sliceAngle = 2 * Math.PI / count;
    const root = document.documentElement;
    root.classList.remove('intro-revealing');
    // Layout must be live before reading card size — display:none reports 0 and
    // collapses radius2 into the centre pile from the owner's screenshot.
    gsap.set(this.element, {display:'block', visibility:'hidden', opacity:0});
    this.armSafariBleed();
    void this.element.offsetHeight;
    const cardW = card.clientWidth || (desktop ? 128 : 96);
    const cardH = card.clientHeight || (desktop ? 192 : 144);
    // Same geometry as Codrops index.js; outer budget scaled for 96×144 / 128×192.
    const radius1 = 50 + cardH / 2;
    const outer = desktop ? 300 : 230;
    const radius2 = Math.max(outer - radius1, Math.round(cardW * 1.1));
    gsap.set(this.element, {visibility:'visible', opacity:1});
    gsap.set(group, {clearProps:'all'});
    gsap.set(headings, {clearProps:'all'});
    gsap.set(this.cards, {clearProps:'all'});
    gsap.set(this.cards, {x:0, y:0, xPercent:-50, yPercent:-50, opacity:1});
    const done = new Promise<void>(resolve => {this.settle = resolve;});
    this.escape = event => {if(event.key === 'Escape') this.hide();};
    addEventListener('keydown', this.escape);
    this.deadline = window.setTimeout(() => this.hide(), 6000 + HOLD_DURATION * 1000);
    this.element.dataset.phase = 'assembling';

    // Original finite stages and timing; larger radius keeps the centre hole open.
    this.timeline = gsap.timeline({onComplete:() => this.complete()})
      .from(this.cards, {
        y:innerHeight / 2 + cardH * 1.5,
        rotateX:-180, stagger:.1, duration:.5, opacity:.8, scale:3,
      })
      .set(this.cards, {transformOrigin:`center ${radius1 + cardH / 2}px`})
      .set(group, {transformStyle:'preserve-3d'})
      .call(() => {this.element.dataset.phase = 'spreading';})
      .to(this.cards, {y:-radius1, duration:.5, ease:'power1.out'})
      .to(this.cards, {
        rotation:index => index * 360 / count,
        rotateY:15, duration:1, ease:'power1.out',
      }, '<')
      .call(() => {this.element.dataset.phase = 'composing';})
      // Cards start while fonts/hero load; finish composing only with stable content.
      .addPause('>', () => {
        const timeline = this.timeline;
        void contentReady.then(() => {
          if(this.timeline === timeline && this.element.dataset.phase === 'composing') timeline?.resume();
        }, () => this.hide());
      })
      .to(this.cards, {
        x:index => Math.round(radius2 * Math.cos(sliceAngle * index - Math.PI / 4)),
        y:index => Math.round(radius2 * Math.sin(sliceAngle * index - Math.PI / 4)) - radius1,
        rotation:index => (index + 1) * 360 / count,
        duration:.5,
      })
      .to(this.cards, {rotateY:180, opacity:.8, duration:1}, '<')
      .fromTo(headings, {opacity:0, filter:'blur(60px)'}, {opacity:1, filter:'blur(0px)', duration:1}, '<')
      .call(() => {this.element.dataset.phase = 'holding';})
      .addLabel('intro-idle')
      // Finite Codrops idle: the group keeps turning while separate cards flip.
      .to(group, {rotation:360 * (HOLD_DURATION + .45) / 20, duration:HOLD_DURATION + .45, ease:'none'}, 'intro-idle')
      .to([this.cards[1], this.cards[5]], {rotateY:'+=180', duration:.6, stagger:.45, ease:'power1.inOut'}, 'intro-idle')
      .call(() => {
        this.element.dataset.phase = 'revealing';
        // Snap root off terracotta before the fade so Safari chrome does not linger.
        root.classList.add('intro-revealing');
      }, undefined, 'intro-idle+=' + HOLD_DURATION)
      .to(this.element, {opacity:0, duration:.45, ease:'power2.inOut'}, 'intro-idle+=' + HOLD_DURATION);
    return done;
  }

  private armSafariBleed() {
    this.releaseSafariBleed();
    this.bleed = needsSafariBleed();
    if(!this.bleed) return;
    const root = document.documentElement;
    root.classList.add('intro-safari-bleed');
    root.style.setProperty('--intro-safari-top', `${SAFARI_TOP}px`);
    root.style.setProperty('--intro-safari-bottom', `${SAFARI_BOTTOM}px`);
    const pin = () => {
      cancelAnimationFrame(this.pinFrame);
      this.pinFrame = requestAnimationFrame(() => scrollTo(0, SAFARI_TOP));
    };
    this.onPinResize = pin;
    pin();
    addEventListener('resize', pin);
  }

  private releaseSafariBleed() {
    if(this.onPinResize) removeEventListener('resize', this.onPinResize);
    this.onPinResize = undefined;
    cancelAnimationFrame(this.pinFrame);
    this.pinFrame = 0;
    const root = document.documentElement;
    root.classList.remove('intro-safari-bleed');
    root.style.removeProperty('--intro-safari-top');
    root.style.removeProperty('--intro-safari-bottom');
    if(this.bleed) scrollTo(0, 0);
    this.bleed = false;
  }

  private complete() {
    if(this.escape) removeEventListener('keydown', this.escape);
    this.escape = undefined;
    if(this.deadline) clearTimeout(this.deadline);
    this.deadline = undefined;
    this.settle?.();
    this.settle = undefined;
  }

  hide() {
    this.timeline?.kill();
    this.complete();
    this.releaseSafariBleed();
    this.element.dataset.phase = 'complete';
    // display:none — opacity/visibility alone can still tint Safari 26 chrome.
    gsap.set(this.element, {display:'none', visibility:'hidden', pointerEvents:'none', opacity:0});
  }
}
