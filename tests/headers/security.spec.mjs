import { test, expect } from '@playwright/test';
const routes = ['/', '/urgent-help', '/warnings', '/bushfire', '/bird-flu', '/health', '/prepare', '/accessible-help', '/animals', '/crisis-support', '/recovery', '/sources', '/about', '/does-not-exist'];
const track = async page => {
  const messages = [];
  page.on('console', m => { if (/content security policy|refused to/i.test(m.text())) messages.push(m.text()); });
  await page.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); });
  return { messages, violations: () => page.evaluate(() => window.__csp) };
};
for (const path of ['/', '/health', '/llms.txt', '/health.md']) test(`security headers on ${path}`, async ({ request }) => {
  const h = (await request.get(path)).headers();
  expect(h['content-security-policy']).toMatch(/default-src 'self'/);
  expect(h['content-security-policy']).toMatch(/frame-ancestors 'none'/);
  expect(h['content-security-policy']).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBe('DENY');
  expect(h['referrer-policy']).toBe('no-referrer');
  expect(h['permissions-policy']).toMatch(/geolocation=\(\)/);
  expect(h['strict-transport-security']).toMatch(/max-age=\d+/);
  expect(h['x-powered-by']).toBeUndefined();
});
test('the policy is really enforced: an injected inline script is blocked', async ({ page }) => {
  const t = await track(page); await page.goto('/');
  const ran = await page.evaluate(() => { window.__ran = false; const s = document.createElement('script'); s.textContent = 'window.__ran = true'; document.head.append(s); return window.__ran; });
  expect(ran).toBe(false);
  expect((await t.violations()).some(v => v.startsWith('script-src'))).toBe(true);
});
for (const route of routes) test(`no CSP violations on ${route}`, async ({ page }) => {
  const t = await track(page); await page.goto(route);
  await expect(page.locator('h1')).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await t.violations()).toEqual([]); expect(t.messages).toEqual([]);
});
test('search, theme toggle and client-side navigation work under the CSP', async ({ page, isMobile }) => {
  const t = await track(page); await page.goto('/');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.locator('input').first().fill('Poisons');
  await expect(dialog.getByText('Poisons', { exact: false }).first()).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  if (isMobile) { await page.getByRole('button', { name: 'Toggle navigation', exact: true }).click(); await page.locator('aside').first().getByRole('link', { name: 'Health, flu & outbreaks', exact: true }).click(); }
  else await page.locator('a[href="/health"]').first().click();
  await expect(page).toHaveURL(/\/health$/); await expect(page.locator('h1')).toHaveText('Health, flu & outbreaks');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await t.violations()).toEqual([]); expect(t.messages).toEqual([]);
});
test('pages cannot be framed', async ({ page }) => {
  await page.goto('/about');
  const blocked = await page.evaluate(() => new Promise(resolve => { const f = document.createElement('iframe'); f.onload = () => { try { resolve(f.contentDocument === null || f.contentDocument.body.innerHTML === ''); } catch { resolve(true); } }; f.src = '/health'; document.body.append(f); setTimeout(() => resolve(true), 3000); }));
  expect(blocked).toBe(true);
});
