import type { ImageMetadata } from 'astro';
import previews from '../data/image-previews.json';

/** Tiny local preview paints in the reserved image box before its srcset arrives.
 * Generated from the same original; no extra request or client JavaScript.
 */
export function photoPreview(image: ImageMetadata, position = 'center') {
  const name = image.src.split('/').pop()?.split('.')[0] as keyof typeof previews;
  const preview = previews[name];
  return preview ? `background-image:url("${preview}");background-size:cover;background-position:var(--photo-position,${position});` : '';
}
