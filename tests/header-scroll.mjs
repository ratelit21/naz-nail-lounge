import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const base='http://127.0.0.1:4321/naz-nail-lounge/';
try {
  for(const width of [320,360,390,430,768,820,1024,1440,1920]){
    const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    for(const suffix of ['', 'atmosfera/']){
      await page.goto(base+suffix,{waitUntil:'networkidle',timeout:45000});
      const initial=await page.evaluate(()=>{
        const h=document.querySelector('.site-header');
        const b=h.querySelector('.header-cta');
        const hero=document.querySelector('main > .hero, main > .cream-hero');
        return {header:getComputedStyle(h).backgroundColor,button:getComputedStyle(b).backgroundColor,
          border:getComputedStyle(b).borderTopWidth,headerTop:h.getBoundingClientRect().top,
          heroTop:hero.getBoundingClientRect().top,html:document.documentElement.scrollWidth,body:document.body.scrollWidth};
      });
      assert.equal(initial.header,'rgba(0, 0, 0, 0)',width+' '+suffix+' initial header');
      assert.equal(initial.button,'rgba(0, 0, 0, 0)',width+' '+suffix+' initial button');
      assert.ok(parseFloat(initial.border)>=1,width+' '+suffix+' outlined button');
      // A hover must NOT add green (or any other fill) over a transparent header.
      await page.locator('.site-header .header-cta').hover();
      const transparentHover=await page.locator('.site-header .header-cta').evaluate(el=>({
        background:getComputedStyle(el).backgroundColor,
        color:getComputedStyle(el).color,
        opacity:getComputedStyle(el).opacity,
        glow:getComputedStyle(el).boxShadow,
      }));
      assert.equal(transparentHover.background,'rgba(0, 0, 0, 0)',
        width+' '+suffix+' transparent-header booking hover must stay transparent');
      assert.equal(transparentHover.opacity,'1',width+' '+suffix+' hover must not dim text');
      assert.notEqual(transparentHover.glow,'none',width+' '+suffix+' outline glow missing');
      const textColors=await page.evaluate(()=>{
        const h=document.querySelector('.site-header');
        return {
          wordmark:getComputedStyle(h.querySelector('.wordmark')).color,
          button:getComputedStyle(h.querySelector('.header-cta')).color,
          toggle:getComputedStyle(h.querySelector('[data-menu-open]')).color,
        };
      });
      const expectedInitial='rgb(18, 55, 45)';
      assert.equal(textColors.wordmark,'rgb(18, 55, 45)',width+' '+suffix+' original wordmark color preserved');
      assert.equal(textColors.button,expectedInitial,width+' '+suffix+' initial booking contrast');
      assert.equal(textColors.toggle,'rgb(18, 55, 45)',width+' '+suffix+' initial menu contrast');
      if(suffix && width>=1024){
        const contact=page.locator('.nav-desktop .nav-link').last();
        assert.equal(await contact.evaluate(e=>getComputedStyle(e).color),'rgb(18, 55, 45)',
          width+' atmosphere contacts match homepage palette');
        assert.notEqual(await contact.evaluate(e=>getComputedStyle(e).textShadow),'none',
          width+' atmosphere contacts need contrast shadow');
        assert.notEqual(await page.locator('.site-header .header-cta').evaluate(e=>getComputedStyle(e).textShadow),
          'none',width+' atmosphere booking needs contrast shadow');
        const active=page.locator('.nav-desktop .nav-link[aria-current="page"]');
        assert.equal(await active.evaluate(e=>getComputedStyle(e,'::after').transform),
          'matrix(0, 0, 0, 1, 0, 0)',width+' active atmosphere should not remain underlined');
        await active.hover();
        assert.equal(await active.evaluate(e=>getComputedStyle(e,'::after').transform),
          'matrix(1, 0, 0, 1, 0, 0)',width+' atmosphere hover underline should work');
        await page.locator('.site-header .header-cta').hover();
      }
      // Every header navigation label and the booking text use a dark legibility shadow.
      const introShadows=await page.locator('.site-header .nav-desktop .nav-link, .site-header .header-cta')
        .evaluateAll(els=>els.map(el=>getComputedStyle(el).textShadow));
      assert.ok(introShadows.every(shadow=>shadow!=='none' && shadow.includes('rgba(25, 9, 6')),
        width+' '+suffix+' missing consistent dark header shadow: '+JSON.stringify(introShadows));
      assert.ok(introShadows.every(shadow=>!shadow.includes('7px')),
        width+' '+suffix+' old excessive text glow still present');
      if(suffix){
        const artBounds=await page.locator('.cream-hero-art').evaluate(e=>{
          const rect=e.getBoundingClientRect();
          const nav=document.querySelector('.site-header').getBoundingClientRect();
          return {artTop:rect.top,headerBottom:nav.bottom,viewport:window.innerWidth};
        });
        assert.ok(artBounds.artTop>=artBounds.headerBottom-2,
          width+' flower must sit below header: '+JSON.stringify(artBounds));
        if(width>=1024) assert.ok(artBounds.artTop>=artBounds.headerBottom+30,
          width+' desktop photo must clear the links: '+JSON.stringify(artBounds));
      }
      assert.ok(Math.abs(initial.headerTop)<=2 && Math.abs(initial.heroTop)<=2,width+' '+suffix+' hero overlap: '+JSON.stringify(initial));
      assert.ok(initial.html<=width+2 && initial.body<=width+2,width+' '+suffix+' overflow: '+JSON.stringify(initial));
      await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));
      await page.waitForFunction(()=>{
        const h=document.querySelector('.site-header');
        return h.classList.contains('is-scrolled') &&
          getComputedStyle(h).backgroundColor==='rgb(238, 225, 206)' &&
          getComputedStyle(h.querySelector('.header-cta')).backgroundColor==='rgb(238, 225, 206)';
      },null,{timeout:6000});
      assert.equal(await page.locator('.site-header .header-cta').evaluate(e=>getComputedStyle(e).color),
        'rgb(18, 55, 45)',width+' '+suffix+' scrolled button text');
      assert.equal(await page.locator('.site-header .header-cta').evaluate(e=>getComputedStyle(e).borderTopColor),
        'rgb(8, 37, 31)',width+' '+suffix+' scrolled button outline');
      // Hover on a filled header changes only the frame, never text or fill.
      const beforeHover=await page.locator('.site-header .header-cta').evaluate(el=>({
        background:getComputedStyle(el).backgroundColor,
        color:getComputedStyle(el).color,
      }));
      await page.locator('.site-header .header-cta').hover();
      const afterHover=await page.locator('.site-header .header-cta').evaluate(el=>({
        background:getComputedStyle(el).backgroundColor,
        color:getComputedStyle(el).color,
        opacity:getComputedStyle(el).opacity,
        glow:getComputedStyle(el).boxShadow,
      }));
      assert.equal(afterHover.background,beforeHover.background,width+' '+suffix+' hover changed button fill');
      assert.equal(afterHover.color,beforeHover.color,width+' '+suffix+' hover changed text');
      assert.equal(afterHover.opacity,'1',width+' '+suffix+' text faded on filled header');
      assert.notEqual(afterHover.glow,'none',width+' '+suffix+' scrolled frame glow missing');
      if(suffix && width>=1024){
        const navColors=await page.locator('.site-header .nav-desktop .nav-link').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).color));
        assert.deepEqual(navColors.slice(0,3),Array(3).fill('rgb(18, 55, 45)'),width+' scrolled navigation contrast');
      }
      const afterScrollShadows=await page.locator('.site-header .nav-desktop .nav-link, .site-header .header-cta')
        .evaluateAll(els=>els.map(el=>getComputedStyle(el).textShadow));
      assert.ok(afterScrollShadows.every(shadow=>shadow!=='none' && shadow.includes('rgba(25, 9, 6')),
        width+' '+suffix+' scrolled dark header shadow missing: '+JSON.stringify(afterScrollShadows));
      const scrolledLogoColor=await page.locator('.site-header .wordmark').evaluate(e=>getComputedStyle(e).color);
      assert.equal(scrolledLogoColor,'rgb(18, 55, 45)',width+' '+suffix+' scrolled logo contrast');
      assert.ok(Math.abs(await page.locator('.site-header').evaluate(e=>e.getBoundingClientRect().top))<=2,'Sticky header '+width);
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
      await page.waitForFunction(()=>{
        const h=document.querySelector('.site-header');
        return !h.classList.contains('is-scrolled') &&
          getComputedStyle(h).backgroundColor==='rgba(0, 0, 0, 0)' &&
          getComputedStyle(h.querySelector('.header-cta')).backgroundColor==='rgba(0, 0, 0, 0)';
      },null,{timeout:6000});
      if(width<1024){
        await page.locator('[data-menu-open]').click();
        assert.equal(await page.locator('[data-nav-panel]').isVisible(),true,'Menu open '+width);
        await page.waitForFunction(()=>getComputedStyle(document.querySelector('.site-header')).backgroundColor==='rgb(238, 225, 206)');
        assert.equal(await page.locator('.site-header .wordmark').evaluate(e=>getComputedStyle(e).color),
          'rgb(18, 55, 45)',width+' '+suffix+' menu-open contrast');
        await page.locator('[data-menu-close]').click();
        assert.equal(await page.locator('[data-nav-panel]').isVisible(),false,'Menu close '+width);
      }
      assert.deepEqual(errors,[],'Page JS errors '+width);
    }
    await ctx.close();
    console.log(width+'px both pages PASS');
  }
  const ctx=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page=await ctx.newPage();
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.nav-desktop a[href$="/atmosfera/"]').click();
  await page.waitForURL(base+'atmosfera/');
  await page.evaluate(()=>window.scrollTo({top:500,behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelector('.site-header')?.classList.contains('is-scrolled'));
  await page.goBack({waitUntil:'networkidle'});
  await page.waitForURL(base);
  await page.waitForFunction(()=>!document.querySelector('.site-header')?.classList.contains('is-scrolled'));
  console.log('Astro navigation PASS');
  await ctx.close();
} finally {await browser.close();}
