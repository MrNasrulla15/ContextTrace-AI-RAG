const { test, expect } = require('@playwright/test');

test.describe('ContextTrace AI — Theme Switcher & Persistence Journey', () => {
  test('should default to Light theme and toggle to Dark theme seamlessly', async ({ page }) => {
    await page.goto('/');

    const html = page.locator('html');
    const themeBtn = page.locator('#themeToggleBtn');

    // 1. Initial State: Light Theme
    await expect(html).toHaveAttribute('data-theme', 'light');

    // 2. Toggle to Dark Theme
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // 3. Verify LocalStorage is updated
    const savedTheme = await page.evaluate(() => localStorage.getItem('contexttrace_theme'));
    expect(savedTheme).toBe('dark');

    // 4. Reload page and assert zero-flash persistence of Dark theme
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // 5. Toggle back to Light Theme
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    const resetTheme = await page.evaluate(() => localStorage.getItem('contexttrace_theme'));
    expect(resetTheme).toBe('light');
  });
});
