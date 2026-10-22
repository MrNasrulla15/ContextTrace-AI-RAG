const { test, expect } = require('@playwright/test');

test.describe('ContextTrace AI — Grounded RAG & Evidence Verification Journeys', () => {

  test('should synthesize grounded answer, link interactive citations, and copy to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions for copy test
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Stub deterministic RAG response to avoid burning free-tier Gemini API quota during test loops
    await page.route('**/api/chat/ask', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          chatId: 'mock-chat-12345',
          requestId: 'mock-req-trace-6789',
          answer: 'Production deployments require a passing automated test suite with at least 80% code coverage [1]. Production deployments are frozen between 18:00 UTC Friday and 06:00 UTC Monday [1].',
          sources: [
            {
              documentId: 'doc-mock-001',
              title: 'Production Deployment Safety Gates',
              version: 1,
              contentHash: 'c006249725047c9c1c00b1e929ed29be',
              score: 3.85,
              excerpt: 'Deployments to production require a passing automated test suite with at least 80% code coverage and peer review approvals from at least two senior engineers.'
            }
          ],
          abstained: false,
          insufficientEvidence: false,
          model: 'gemini-3.1-flash-lite',
          latencyMs: 412,
          promptTemplateVersion: 'v1.1',
          verificationOutcome: { citationsValid: true }
        })
      });
    });

    await page.goto('/');

    // 1. Fill Question and Submit
    await page.locator('#questionInput').fill('What are the production deployment requirements?');
    await page.locator('#submitQuestionBtn').click();

    // 2. Verify Grounded Answer Display
    await expect(page.locator('#answerDisplay')).toBeVisible();
    await expect(page.locator('#verifiedStatusBadge')).toHaveText('Grounded & Verified');
    await expect(page.locator('#answerModelTag')).toHaveText('gemini-3.1-flash-lite');
    await expect(page.locator('#answerLatencyTag')).toContainText('ms');

    // 3. Verify Interactive Citation [1]
    const citationLink = page.locator('.citation-ref').first();
    await expect(citationLink).toBeVisible();
    await expect(citationLink).toHaveText('[1]');

    // 4. Click Citation and Assert Highlighting
    const sourceCard = page.locator('#source-1');
    await expect(sourceCard).toBeVisible();
    await citationLink.click();
    await expect(sourceCard).toHaveClass(/highlighted-source/);

    // 5. Verify Copy Answer Action
    const copyBtn = page.locator('#copyAnswerBtn');
    await copyBtn.click();
    await expect(page.locator('.toast-info')).toContainText('Answer copied to clipboard');
  });

  test('should display Explicit Abstention banner when evidence is insufficient (Zero-Hallucination Protocol)', async ({ page }) => {
    // Stub out-of-scope response
    await page.route('**/api/chat/ask', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          chatId: 'mock-abstain-999',
          requestId: 'mock-req-abstain',
          answer: 'I cannot find any factual reference to quantum teleportation policy in the authorized documents.',
          sources: [],
          abstained: true,
          insufficientEvidence: true,
          model: 'gemini-3.1-flash-lite',
          latencyMs: 180,
          promptTemplateVersion: 'v1.1',
          verificationOutcome: { citationsValid: false }
        })
      });
    });

    await page.goto('/');
    await page.locator('#questionInput').fill('What is the company policy on quantum teleportation?');
    await page.locator('#submitQuestionBtn').click();

    // Assert Abstention Banner
    await expect(page.locator('#abstentionBanner')).toBeVisible();
    await expect(page.locator('#abstentionReason')).toContainText('quantum teleportation');
    await expect(page.locator('#verifiedStatusBadge')).toHaveText('Abstained (Unverifiable)');
    await expect(page.locator('#sourceCountBadge')).toHaveText('0');
  });

  test('should support keyboard shortcut Ctrl+Enter to submit question', async ({ page }) => {
    let requested = false;
    await page.route('**/api/chat/ask', async route => {
      requested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          answer: 'Keyboard synthesis response test.',
          sources: [],
          abstained: false,
          model: 'gemini-3.1-flash-lite',
          latencyMs: 95
        })
      });
    });

    await page.goto('/');
    const textarea = page.locator('#questionInput');
    await textarea.fill('Short question test');
    await textarea.press('Control+Enter');

    await expect.poll(() => requested).toBe(true);
    await expect(page.locator('#answerDisplay')).toBeVisible();
  });

  test('should attach and detach target document for scoped Q&A', async ({ page }) => {
    // Stub file upload response
    await page.route('**/api/content/upload', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          _id: 'doc-upload-uuid-123',
          title: 'Q3_Security_Audit_Report.pdf',
          version: 1,
          contentHash: 'f4e2a1b9c8d7e6',
          status: 'active'
        })
      });
    });

    await page.goto('/');

    // Set file via hidden input
    const fileInput = page.locator('#askFileInput');
    await fileInput.setInputFiles({
      name: 'Q3_Security_Audit_Report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('Mock PDF Content for Scoped QA')
    });

    // Assert document pill appears
    const pill = page.locator('#attachedDocPill');
    await expect(pill).toBeVisible();
    await expect(page.locator('#attachedDocTitle')).toHaveText('Q3_Security_Audit_Report.pdf');
    await expect(page.locator('#askUploadDropzone')).toBeHidden();

    // Detach document
    await page.locator('#detachDocBtn').click();
    await expect(pill).toBeHidden();
    await expect(page.locator('#askUploadDropzone')).toBeVisible();
    await expect(page.locator('.toast-info').last()).toContainText('Document detached');
  });
});
