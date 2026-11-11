/** Warm the next viewport without making the entire photo bank eager.
 * Native responsive images retain their srcset, dimensions and static preview.
 */
export function preparePhotos(scope: HTMLElement) {
  const observer = new IntersectionObserver(entries=>{
    for(const entry of entries) {
      if(!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      const image = entry.target as HTMLImageElement;
      image.loading = 'eager';
      void image.decode().catch(()=>{});
    }
  },{rootMargin:`${Math.ceil(innerHeight)}px 0px`});
  scope.querySelectorAll<HTMLImageElement>('[data-site-content] img[loading="lazy"]').forEach(image=>observer.observe(image));
  return () => observer.disconnect();
}
