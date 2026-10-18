import { test, expect } from '@playwright/test';
const routes=['/','/urgent-help','/warnings','/bushfire','/bird-flu','/health','/prepare','/accessible-help','/animals','/crisis-support','/recovery','/sources','/about'];
for(const route of routes)test(`readable page and no overflow ${route}`,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(route);expect(response.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('[data-blume-banner] a[href="tel:000"]')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);
});
test('local search returns actual resource details',async({page,baseURL})=>{
  const remote=[];page.on('request',r=>{if(!r.url().startsWith(baseURL)&&!r.url().startsWith('data:'))remote.push(r.url())});
  await page.goto('/');await page.getByRole('button',{name:'Search',exact:true}).click();
  const input=page.getByRole('dialog').locator('input').first();await input.fill('Poisons');
  await expect(page.getByRole('dialog').getByText('Poisons',{exact:false}).first()).toBeVisible();
  await expect(page.getByRole('dialog').locator('a[href*="urgent-help"]').first()).toBeVisible();
  expect(remote).toEqual([]);
});
test('mobile menu opens, navigates, and closes without trapping content',async({page,isMobile})=>{
  test.skip(!isMobile,'phone-only interaction');await page.goto('/');
  await page.getByRole('button',{name:'Toggle navigation',exact:true}).click();
  const drawer=page.locator('aside').first();await expect(drawer.getByRole('link',{name:'Bushfire: prepare early',exact:true})).toBeVisible();
  await drawer.getByRole('link',{name:'Bushfire: prepare early',exact:true}).click();
  await expect(page).toHaveURL(/\/bushfire$/);await expect(page.locator('h1')).toHaveText('Bushfire: prepare early');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('dark mode preserves resource readability',async({page})=>{
  await page.goto('/bird-flu');await page.getByRole('button',{name:'Toggle theme'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await expect(page.locator('.resource-card')).toBeVisible();
  const colours=await page.locator('.phone-link').evaluate(e=>({text:getComputedStyle(e).color,back:getComputedStyle(e.closest('.resource-card')).backgroundColor}));
  expect(colours.text).not.toEqual(colours.back);
});
test('essential content and fallback directory work without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();
  await page.goto('/urgent-help');await expect(page.getByRole('link',{name:'000 — Police, Fire, Ambulance',exact:true})).toBeVisible();
  await page.goto('/about');await expect(page.getByRole('heading',{name:'Page directory'})).toBeVisible();
  await page.getByRole('link',{name:'Bird flu',exact:true}).click();await expect(page.locator('h1')).toHaveText('Bird flu & biosecurity');
  await context.close();
});
test('small phone has no clipping and visible call action',async({page})=>{
  await page.setViewportSize({width:320,height:720});await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(page.locator('.urgent-box a[href="tel:000"]')).toBeVisible();
});
test('print layout keeps headings with their content and source links on one line flow',async({page})=>{
  await page.goto('/urgent-help');await page.emulateMedia({media:'print'});
  const s=await page.evaluate(()=>{
    const cs=sel=>getComputedStyle(document.querySelector(sel));
    return {h2:cs('#blume-content h2').breakAfter,h3:cs('.resource-card h3').breakAfter,link:cs('.source-link').display,card:cs('.resource-card').breakInside};
  });
  expect(s.h2).toBe('avoid');expect(s.h3).toBe('avoid');
  expect(s.link).not.toMatch(/flex/);expect(s.card).toBe('avoid');
});
test('other states section is present',async({page})=>{
  for(const route of ['/health','/bushfire','/urgent-help']){
    await page.goto(route);
    const heading=page.getByRole('heading',{level:2,name:/^Other states and territories#?$/});await expect(heading).toBeVisible();
    const links=heading.locator('xpath=following-sibling::ul[1]').locator('a[href^="https://"]');
    expect(await links.count(),route).toBeGreaterThan(0);await expect(links.first()).toBeVisible();
  }
});
