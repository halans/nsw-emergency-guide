// Runs the whole browser suite plus the CSP checks against `wrangler dev`, which applies dist/_headers like Cloudflare does.
// (`blume preview` ignores _headers.) The compatibility-date override only matters when the local workerd binary is older than wrangler.json.
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: ['browser/*.spec.mjs', 'headers/*.spec.mjs'], timeout: 30000, fullyParallel: true, workers: 2,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:8788', launchOptions: { args: ['--no-sandbox'] }, trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } }, { name: 'phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: { command: 'WRANGLER_SEND_METRICS=false npx wrangler dev --port 8788 --ip 127.0.0.1 --compatibility-date 2026-10-13', url: 'http://127.0.0.1:8788', reuseExistingServer: true, timeout: 90000 }
});
