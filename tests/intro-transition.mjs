import {chromium, firefox, webkit} from 'playwright';
import assert from 'node:assert/strict';

for (const [engineName, engine] of Object.entries({chromium, firefox, webkit})) {
const browser = await engine.launch({headless: true, ...(engineName === 'chromium' ? {args: ['--no-sandbox']} : {})});
const base = 'http://127.0.0.1:4321/naz-nail-lounge/';

try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({
      viewport: {width, height: width < 800 ? 844 : 900},
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, {waitUntil: 'domcontentloaded'});
    const boot = await page.evaluate(() => {
      const root = document.documentElement;
      const backdrop = document.querySelector('.entrance-backdrop');
      return {
        intro: root.classList.contains('intro-active'),
        prepared: root.classList.contains('page-entering'),
        preview: getComputedStyle(backdrop).backgroundImage,
        rootPreview: getComputedStyle(root).backgroundImage,
        lowerOpacity: getComputedStyle(document.querySelector('[data-reveal]')).opacity,
      };
    });
    assert.ok(boot.intro, 'Fresh visitor must see intro');
    if (engineName === 'webkit' && width < 768) {
      const layout = await page.evaluate(() => {
        const el = document.querySelector('[data-image-stack]');
        const style = getComputedStyle(el);
        return {
          supported: CSS.supports('-webkit-touch-callout', 'none'),
          position: style.position,
          height: parseFloat(style.height),
          marginBottom: parseFloat(style.marginBottom),
        };
      });
      if (layout.supported) {
        assert.equal(layout.position, 'relative', 'iOS intro must render in normal document flow');
        assert.ok(layout.height > 844, 'The background must extend past the Safari bottom bar');
        assert.ok(Math.abs(layout.height + layout.marginBottom) <= 1,
          'In-flow intro changed the page height: ' + JSON.stringify(layout));
      }
    }

    assert.ok(boot.prepared, 'Hero must be prepared before intro starts');
    assert.ok(boot.preview.includes('data:image/webp;base64,'), 'No inline intro photo placeholder');
    assert.ok(boot.rootPreview.includes('data:image/webp;base64,'), 'Root still flashes solid orange');
    assert.equal(boot.lowerOpacity, '0', 'Lower sections should remain visually covered during intro');
    await page.waitForFunction(() =>
      document.querySelector('[data-image-stack]')?.dataset.phase === 'revealing',
      null, {timeout: 16000});
    const revealing = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        assembling: root.dataset.pageEntry,
        entering: root.classList.contains('page-entering'),
        contentVisibility: getComputedStyle(document.querySelector('[data-site-content]')).visibility,
        lowerOpacity: getComputedStyle(document.querySelector('[data-reveal]')).opacity,
      };
    });
    assert.equal(revealing.assembling, 'assembling', 'Hero assembly did not overlap intro dissolve');
    assert.ok(revealing.entering, 'Hero preparation was lifted too soon');
    assert.equal(revealing.contentVisibility, 'visible', 'Main page did not reveal during fade');
    assert.equal(revealing.lowerOpacity, '0', 'Lower sections flashed through the cover');
    await page.waitForFunction(() => document.documentElement.dataset.pageEntry === 'complete'
      && !document.documentElement.classList.contains('intro-active')
      && !document.documentElement.classList.contains('page-entering'),
      null, {timeout: 10000});
    assert.equal(await page.locator('[data-image-stack]').evaluate(
      el => getComputedStyle(el).display), 'none', 'Intro overlay did not release');
    const hero = await page.locator('[data-page-visual]').evaluate(el =>
      ({clip: getComputedStyle(el).clipPath, imageLoaded: el.querySelector('img').naturalWidth > 0}));
    assert.ok(hero.clip === 'none' || hero.clip === 'inset(0px)', 'Hero did not fully assemble');
    assert.ok(hero.imageLoaded, 'Hero image failed to load');
    assert.deepEqual(errors, [], 'Page errors: ' + errors.join('; '));
    // Reload must not replay the full image stack.
    await page.reload({waitUntil: 'domcontentloaded'});
    assert.equal(await page.locator('html.intro-active').count(), 0, 'Intro replayed on reload');
    await context.close();
    console.log(engineName + ' / ' + width + 'px: cold first-paint / synchronized reveal / reload PASS');
  }
} finally {
  await browser.close();
}
}
