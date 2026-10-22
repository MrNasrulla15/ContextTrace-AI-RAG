const { test, expect } = require('@playwright/test');

test.describe('ContextTrace AI — E2E Browser Tests', () => {
  test('should load application in default Light theme and display core UI components', async ({ page }) => {
    await page.goto('/');

    // Verify Title & Brand
    await expect(page).toHaveTitle(/ContextTrace AI/);
    await expect(page.locator('.brand-title')).toHaveText('ContextTrace AI');

    // Verify Default Light Theme
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Verify Interactive Controls
    await expect(page.locator('#questionInput')).toBeVisible();
    await expect(page.locator('#submitQuestionBtn')).toBeVisible();
    await expect(page.locator('#themeToggleBtn')).toBeVisible();
  });

  test('should toggle between Light and Dark themes seamlessly', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const themeBtn = page.locator('#themeToggleBtn');

    // Initial state: Light
    await expect(html).toHaveAttribute('data-theme', 'light');

    // Toggle to Dark
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Toggle back to Light
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('should switch across navigation tabs', async ({ page }) => {
    await page.goto('/');

    // Switch to Knowledge Base tab
    await page.locator('#tabDocsBtn').click();
    await expect(page.locator('#docsView')).toHaveClass(/active/);
    await expect(page.locator('#docsTable')).toBeVisible();

    // Switch to Audit History tab
    await page.locator('#tabHistoryBtn').click();
    await expect(page.locator('#historyView')).toHaveClass(/active/);
    await expect(page.locator('#historyTable')).toBeVisible();

    // Switch back to Ask & Verify tab
    await page.locator('#tabAskBtn').click();
    await expect(page.locator('#askView')).toHaveClass(/active/);
  });
});
