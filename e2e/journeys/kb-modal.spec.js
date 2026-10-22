const { test, expect } = require('@playwright/test');

test.describe('ContextTrace AI — Knowledge Base & Forensic Modal Journeys', () => {

  test('should display active documents and handle duplicate SHA-256 conflict toast', async ({ page }) => {
    // Stub 409 conflict on duplicate document
    await page.route('**/api/content', async (route, request) => {
      if (request.method() === 'POST') {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Duplicate document: Identical SHA-256 content hash already exists'
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Switch to Knowledge Base tab
    await page.locator('#tabDocsBtn').click();
    await expect(page.locator('#docsView')).toHaveClass(/active/);
    await expect(page.locator('#docsTable')).toBeVisible();

    // Fill Ingestion Form and Submit Duplicate
    await page.locator('#docTitle').fill('Duplicate Test Document');
    await page.locator('#docContent').fill('Exact duplicate text content that triggers SHA-256 conflict.');
    await page.locator('#saveDocBtn').click();

    // Verify Conflict Toast
    await expect(page.locator('.toast-error')).toContainText('Conflict: An identical document');
  });

  test('should inspect immutable evidence snapshots in the Forensic Audit Trace modal', async ({ page }) => {
    // Stub trace history detail endpoint
    await page.route('**/api/chat/history/mock-trace-id-101', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          _id: 'mock-trace-id-101',
          requestId: 'trace-uuid-abc-123',
          question: 'What is the employee annual leave allowance?',
          answer: 'Employees receive 25 days of annual leave accrued monthly [1].',
          model: 'gemini-3.1-flash-lite',
          promptTemplateVersion: 'v1.1',
          latencyMs: 340,
          abstained: false,
          sources: [
            {
              title: 'Annual Leave and Vacation Policy',
              version: 1,
              contentHash: 'hash-doc-hr-001',
              score: 3.92,
              excerpt: 'Full-time employees accrue 25 days of paid annual leave per calendar year.'
            }
          ]
        })
      });
    });

    // Stub history list with one item
    await page.route('**/api/chat/history?limit=50', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          history: [
            {
              _id: 'mock-trace-id-101',
              question: 'What is the employee annual leave allowance?',
              model: 'gemini-3.1-flash-lite',
              latencyMs: 340,
              abstained: false,
              createdAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    await page.goto('/');

    // Switch to Audit History Tab
    await page.locator('#tabHistoryBtn').click();
    await expect(page.locator('#historyView')).toHaveClass(/active/);
    await expect(page.locator('#historyTable')).toBeVisible();

    // Click Inspect Trace
    const inspectBtn = page.locator('.inspect-trace-btn').first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();

    // Assert Modal Content
    const modal = page.locator('#traceModal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('#modalTitle')).toHaveText('Forensic Audit Trace');
    await expect(modal.locator('.trace-value').first()).toContainText('annual leave allowance');
    await expect(modal.locator('.code-badge').first()).toContainText('trace-uuid-abc-123');
    await expect(modal.locator('.source-card')).toBeVisible();

    // Close Modal via button
    await page.locator('#closeModalBtn').click();
    await expect(modal).toBeHidden();
  });
});
