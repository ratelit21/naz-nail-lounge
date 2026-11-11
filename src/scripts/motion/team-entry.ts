import gsap from 'gsap';

/** Reference study: https://kononenkogroup.com/about/, Favorite Team.
 * Live route module: /_nuxt/BIOC-to_.js, SectionAboutTeam.
 * It groups portraits by visual row, starts on that row entering the viewport,
 * and raises the cards from yPercent:50 with ~.062s stagger / ~1.109s duration.
 * NAZ adapts the row width to its five desktop / two mobile columns.
 * Independent implementation; no site-specific source/assets copied.
 */
export class TeamEntrance {
  private section: HTMLElement | null;
  private people: HTMLElement[];
  private targets: HTMLElement[];
  private observer?: IntersectionObserver;
  private tweens: gsap.core.Tween[] = [];
  private rows = new Map<Element, HTMLElement[]>();
  private active = false;
  private started = false;
  private running = 0;
  private motion = matchMedia('(prefers-reduced-motion: reduce)');
  private layout = matchMedia('(max-width:767px)');
  private settle = () => this.finish();

  constructor(scope: ParentNode) {
    this.section = scope.querySelector<HTMLElement>('[data-team]');
    this.people = [...(this.section?.querySelectorAll<HTMLElement>('[data-team-person]') ?? [])];
    this.targets = this.people.map(person=>person.querySelector<HTMLElement>('[data-team-reveal]')!).filter(Boolean);
  }

  start(ready?: Promise<unknown>, restoreVisible = false) {
    if(this.started || !this.section || !this.targets.length || this.motion.matches) return;
    this.started = true;
    this.active = true;
    const columns = this.layout.matches ? 2 : 5;
    try {
      this.observer = new IntersectionObserver(entries=>{
        if(!this.active) return;
        for(const entry of entries) {
          if(!entry.isIntersecting) continue;
          this.observer?.unobserve(entry.target);
          const row = this.rows.get(entry.target);
          if(!row) continue;
          this.rows.delete(entry.target);
          const reveal = () => {
            if(!this.active) return;
            this.running++;
            this.section!.dataset.teamPhase = 'assembling';
            this.tweens.push(gsap.to(row,{
              yPercent:0,duration:1.109,stagger:.062,ease:'power3.out',
              clearProps:'transform,willChange',
              onComplete:()=>{
                this.running--;
                if(!this.rows.size && !this.running && this.active) this.section!.dataset.teamPhase = 'complete';
              },
            }));
          };
          if(ready) void ready.then(reveal,reveal);
          else reveal();
        }
      },{threshold:0,rootMargin:'0px 0px -6% 0px'});
      for(let i=0;i<this.people.length;i+=columns) {
        const people = this.people.slice(i,i+columns);
        const row = this.targets.slice(i,i+columns);
        // A history restore below a completed row must not hide passed content.
        const bounds = people[0].getBoundingClientRect();
        if(bounds.bottom <= 0 || (restoreVisible && bounds.top < innerHeight)) continue;
        gsap.set(row,{yPercent:50,willChange:'transform'});
        this.rows.set(people[0],row);
        // Observe stationary outer cells, not the moving portraits inside them.
        this.observer.observe(people[0]);
      }
      this.section.dataset.teamPhase = this.rows.size ? 'waiting' : 'complete';
      this.motion.addEventListener('change',this.settle);
      this.layout.addEventListener('change',this.settle);
    } catch {this.finish();}
  }

  private finish() {
    this.active = false;
    this.observer?.disconnect();
    this.tweens.forEach(tween=>tween.kill());
    this.rows.clear();
    this.running = 0;
    if(this.targets.length) gsap.set(this.targets,{clearProps:'transform,willChange'});
    if(this.section) this.section.dataset.teamPhase = 'complete';
  }

  dispose() {
    this.finish();
    this.motion.removeEventListener('change',this.settle);
    this.layout.removeEventListener('change',this.settle);
  }
}
