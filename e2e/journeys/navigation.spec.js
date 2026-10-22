const { test, expect } = require('@playwright/test');

test.describe('ContextTrace AI — Primary Navigation & Tab Switching Journeys', () => {
  test('should switch seamlessly across Knowledge Base, Audit History, and Ask views', async ({ page }) => {
    await page.goto('/');

    // Initially active view: Ask & Verify (#askView)
    await expect(page.locator('#askView')).toHaveClass(/active/);
    await expect(page.locator('#tabAskBtn')).toHaveClass(/active/);

    // Switch to Knowledge Base tab
    await page.locator('#tabDocsBtn').click();
    await expect(page.locator('#docsView')).toHaveClass(/active/);
    await expect(page.locator('#tabDocsBtn')).toHaveClass(/active/);
    await expect(page.locator('#docsTable')).toBeVisible();

    // Switch to Audit History tab
    await page.locator('#tabHistoryBtn').click();
    await expect(page.locator('#historyView')).toHaveClass(/active/);
    await expect(page.locator('#tabHistoryBtn')).toHaveClass(/active/);
    await expect(page.locator('#historyTable')).toBeVisible();

    // Switch back to Ask & Verify tab
    await page.locator('#tabAskBtn').click();
    await expect(page.locator('#askView')).toHaveClass(/active/);
    await expect(page.locator('#tabAskBtn')).toHaveClass(/active/);
    await expect(page.locator('#askForm')).toBeVisible();
  });
});
