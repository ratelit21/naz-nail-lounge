import { defineConfig } from 'astro/config';

// GitHub Pages project site: https://ratelit21.github.io/naz-nail-lounge/
export default defineConfig({
  site: 'https://ratelit21.github.io',
  base: '/naz-nail-lounge/',
  build: {
    inlineStylesheets: 'auto',
  },
  devToolbar: {
    enabled: false,
  },
});
