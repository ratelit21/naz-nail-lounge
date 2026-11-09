import {chromium, firefox, webkit} from 'playwright';
import assert from 'node:assert/strict';

const base = 'http://127.0.0.1:4321/naz-nail-lounge/';

for (const [engineName, engine] of Object.entries({chromium, firefox, webkit})) {
  const browser = await engine.launch({
    headless: true,
    ...(engineName === 'chromium' ? {args: ['--no-sandbox']} : {}),
  });
  try {
    for (const width of [320, 390, 820, 1440]) {
      const context = await browser.newContext({
        viewport: {width, height: width <= 390 ? 844 : 900},
        reducedMotion: 'no-preference',
      });
      await context.addInitScript(() => localStorage.setItem('naz-intro-seen', '1'));
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base, {waitUntil: 'domcontentloaded'});
      await page.waitForFunction(() => document.documentElement.dataset.pageEntry === 'complete', null, {timeout: 12000});
      assert.ok(Math.abs(await page.evaluate(() => scrollY)) < 2, 'Home starts mid-page');
      await page.evaluate(() => window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
      await page.waitForFunction(() => document.documentElement.classList.contains('chrome-bottom-dark'));
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
        'rgb(8, 37, 31)', 'Dark home footer must tint bottom Safari chrome dark');
      await page.evaluate(() => window.scrollTo({top:0,behavior:'instant'}));
      await page.waitForFunction(() => !document.documentElement.classList.contains('chrome-bottom-dark'));

      if (width <= 820) {
        await page.locator('[data-menu-open]').click();
        await page.locator('.nav-panel-link[href$="/atmosfera/"]').click();
      } else {
        await page.locator('.nav-desktop a[href$="/atmosfera/"]').click();
      }
      await page.waitForURL(base + 'atmosfera/', {timeout: 15000});
      await page.waitForFunction(() =>
        document.documentElement.dataset.pageEntry === 'complete'
        && !document.documentElement.classList.contains('page-entering'), null, {timeout: 15000});
      const atTop = await page.evaluate(() => scrollY);
      assert.ok(atTop <= 3, 'Atmosphere route retained scroll: ' + atTop);
      await page.waitForFunction(() => {
        const hero = document.querySelector('.cream-hero-art img');
        const materials = [...document.querySelectorAll('.materials-featured img')];
        const interior = document.querySelector('.cream-balance-arch img');
        return hero?.naturalWidth > 0
          && materials.length === 3
          && materials.every(img => img.complete && img.naturalWidth > 0)
          && interior?.complete && interior.naturalWidth > 0;
      }, null, {timeout: 16000});

      const images = await page.evaluate(() => [...document.querySelectorAll(
        '.cream-hero-art img,.materials-featured img,.cream-balance-arch img')].map(img => ({
          alt: img.alt, loaded: img.naturalWidth > 0, width: img.naturalWidth,
          loading: img.loading,
        })));
      assert.equal(images.length, 5, 'Atmosphere image count changed');
      assert.ok(images.every(img => img.loaded), 'Invisible images: ' + JSON.stringify(images));

      const firstMaterial = page.locator('.materials-featured .materials-item').first();
      await firstMaterial.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1100);
      const firstOpacity = await firstMaterial.evaluate(el => getComputedStyle(el).opacity);
      assert.ok(Number(firstOpacity) >= 0.95, 'Material remains hidden: ' + firstOpacity);
      const interior = page.locator('.cream-balance-arch');
      await interior.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1200);
      const interiorOpacity = await interior.evaluate(el => getComputedStyle(el).opacity);
      assert.ok(Number(interiorOpacity) >= 0.95, 'Interior remains hidden: ' + interiorOpacity);
      await page.evaluate(() => window.scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
      await page.waitForFunction(() => !document.documentElement.classList.contains('chrome-bottom-dark'));
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor),
        'rgb(238, 225, 206)', 'Light Atmosphere footer must keep light Safari chrome');
      assert.deepEqual(errors, [], engineName + '/' + width + ' browser errors: ' + errors.join('; '));
      console.log(engineName + '/' + width + ' atmosphere navigation, five images and visibility PASS');
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
