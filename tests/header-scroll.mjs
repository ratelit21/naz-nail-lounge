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
      const textColors=await page.evaluate(()=>{
        const h=document.querySelector('.site-header');
        return {
          wordmark:getComputedStyle(h.querySelector('.wordmark')).color,
          button:getComputedStyle(h.querySelector('.header-cta')).color,
          toggle:getComputedStyle(h.querySelector('[data-menu-open]')).color,
        };
      });
      const expectedInitial=suffix ? 'rgb(8, 37, 31)' : 'rgb(18, 55, 45)';
      assert.equal(textColors.wordmark,'rgb(18, 55, 45)',width+' '+suffix+' original wordmark color preserved');
      assert.equal(textColors.button,expectedInitial,width+' '+suffix+' initial booking contrast');
      assert.equal(textColors.toggle,expectedInitial,width+' '+suffix+' initial menu contrast');
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
      if(suffix && width>=1024){
        const navColors=await page.locator('.site-header .nav-desktop .nav-link').evaluateAll(nodes=>nodes.map(e=>getComputedStyle(e).color));
        assert.deepEqual(navColors.slice(0,3),Array(3).fill('rgb(18, 55, 45)'),width+' scrolled navigation contrast');
      }
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
