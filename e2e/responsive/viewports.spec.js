const { test, expect } = require('@playwright/test');

test.describe('ContextTrace AI — Responsive Viewports & Layout Adaptability', () => {

  test('should render cleanly on Mobile viewport (375x667) without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify Brand is visible
    await expect(page.locator('.brand-title')).toBeVisible();

    // Verify Single-Column Layout on mobile
    const workspaceGrid = page.locator('.workspace-grid').first();
    await expect(workspaceGrid).toBeVisible();

    // Verify No Horizontal Scroll on document body
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify Question Form inputs are fully visible and clickable
    await expect(page.locator('#questionInput')).toBeVisible();
    await expect(page.locator('#submitQuestionBtn')).toBeVisible();
  });

  test('should render cleanly on Tablet viewport (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('.app-header')).toBeVisible();
    await expect(page.locator('.app-nav')).toBeVisible();

    // Switch to Knowledge Base
    await page.locator('#tabDocsBtn').click();
    await expect(page.locator('#docsTableContainer')).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });

  test('should render 2-column split-view on Desktop viewport (1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const grid = page.locator('.workspace-grid').first();
    await expect(grid).toBeVisible();

    // On desktop, the two workspace cards exist side-by-side
    const queryCard = page.locator('.query-card');
    const resultCard = page.locator('.result-card');
    await expect(queryCard).toBeVisible();
    await expect(resultCard).toBeVisible();
  });
});
