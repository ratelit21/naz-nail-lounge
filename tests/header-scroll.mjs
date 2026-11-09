import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
const base = 'http://127.0.0.1:4321/naz-nail-lounge/';

try {
  for (const width of [320, 390, 820, 1440]) {
    const context = await browser.newContext({
      viewport: {width, height: 900},
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const suffix of ['', 'atmosfera/']) {
      await page.goto(base + suffix, {waitUntil: 'networkidle'});
      const first = await page.evaluate(() => {
        const header = document.querySelector('.site-header');
        const headerBooking = header.querySelector('.header-cta');
        const hero = document.querySelector('main > .hero, main > .cream-hero');
        const booking = hero.querySelector('.hero-booking');
        const hs = getComputedStyle(header);
        const bs = getComputedStyle(headerBooking);
        const cta = getComputedStyle(booking);
        return {
          headerColor: hs.backgroundColor,
          headerTop: header.getBoundingClientRect().top,
          heroTop: hero.getBoundingClientRect().top,
          headerButtonColor: bs.backgroundColor,
          headerButtonRadius: bs.borderTopLeftRadius,
          headerButtonBorder: parseFloat(bs.borderTopWidth),
          heroButtonColor: cta.backgroundColor,
          heroButtonRadius: cta.borderTopLeftRadius,
          heroButtonBorder: parseFloat(cta.borderTopWidth),
          bookingHref: booking.href,
          docWidth: document.documentElement.scrollWidth,
        };
      });
      assert.equal(first.headerColor, 'rgba(0, 0, 0, 0)', 'Initial header must stay transparent');
      assert.equal(first.headerButtonColor, 'rgba(0, 0, 0, 0)', 'Header CTA must stay unfilled');
      assert.equal(first.headerButtonRadius, '2px', 'Current editorial header CTA is rectangular');
      assert.ok(first.headerButtonBorder >= 1, 'Header CTA outline missing');
      assert.equal(first.heroButtonColor, 'rgba(0, 0, 0, 0)', 'Hero CTA must stay unfilled');
      assert.equal(first.heroButtonRadius, '2px', 'Current editorial hero CTA is rectangular');
      assert.ok(first.heroButtonBorder >= 1, 'Hero CTA outline missing');
      assert.equal(first.bookingHref, 'https://n1824990.yclients.com/');
      assert.ok(Math.abs(first.headerTop) < 2, 'Sticky header misplaced');
      assert.ok(Math.abs(first.heroTop) < 2, 'Hero background does not extend behind the header');
      assert.ok(first.docWidth <= width + 2, 'Horizontal overflow at ' + width);
      await page.evaluate(() => window.scrollTo({top: 500, behavior: 'instant'}));
      await page.waitForFunction(() => {
        const header = document.querySelector('.site-header');
        return header.classList.contains('is-scrolled')
          && getComputedStyle(header).backgroundColor === 'rgb(238, 225, 206)';
      });
      const scrolledFill = await page.locator('.site-header .header-cta').evaluate(
        el => getComputedStyle(el).backgroundColor);
      assert.equal(scrolledFill, 'rgba(0, 0, 0, 0)', 'Scrolled CTA must remain outlined');
      await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
      await page.waitForFunction(() => !document.querySelector('.site-header').classList.contains('is-scrolled'));
      if (width < 1024) {
        await page.locator('[data-menu-open]').click();
        assert.ok(await page.locator('[data-nav-panel]').isVisible(), 'Mobile menu did not open');
        await page.locator('[data-menu-close]').click();
        assert.equal(await page.locator('[data-nav-panel]').isVisible(), false, 'Mobile menu did not close');
      }
    }
    assert.deepEqual(errors, [], 'Page errors at ' + width + ': ' + errors.join('; '));
    await context.close();
    console.log(width + 'px: homepage, atmosphere, header and booking PASS');
  }
} finally {
  await browser.close();
}
