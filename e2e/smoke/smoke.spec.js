const { test, expect } = require('@playwright/test');

test.describe('ContextTrace AI — Smoke & Baseline Health', () => {
  test('should load application with 200 OK, correct title, and zero console errors', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const response = await page.goto('/');
    expect(response?.status()).toBe(200);

    // Verify Title and Semantic Brand Wordmark
    await expect(page).toHaveTitle(/ContextTrace AI/);
    await expect(page.locator('.brand-title')).toHaveText('ContextTrace AI');
    await expect(page.locator('.brand-subtitle')).toContainText('Grounded Knowledge Retrieval');

    // Verify System Health Badge resolves to API Connected
    const statusText = page.locator('#systemStatusBadge .status-text');
    await expect(statusText).toHaveText('API Connected', { timeout: 10000 });
    await expect(page.locator('#systemStatusBadge .status-dot')).toHaveClass(/online/);

    // Verify zero unhandled browser console errors
    expect(consoleErrors).toEqual([]);
  });

  test('should serve CSS and JavaScript static assets with correct headers', async ({ page }) => {
    const cssRes = await page.request.get('/css/style.css');
    expect(cssRes.status()).toBe(200);
    expect(cssRes.headers()['content-type']).toContain('text/css');

    const jsRes = await page.request.get('/js/app.js');
    expect(jsRes.status()).toBe(200);
    expect(jsRes.headers()['content-type']).toMatch(/javascript/);
  });
});
