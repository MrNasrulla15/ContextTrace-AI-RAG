const request = require('supertest');
const app = require('../app');

describe('UI & Product Usability (Phase 6)', () => {
    describe('Frontend Asset Serving (T6.1, T6.2)', () => {
        it('should serve index.html at root route GET / with correct title and elements', async () => {
            const res = await request(app).get('/');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/html');
            expect(res.text).toContain('ContextTrace AI');
            expect(res.text).toContain('id="askForm"');
            expect(res.text).toContain('id="docsTable"');
            expect(res.text).toContain('id="historyTable"');
            expect(res.text).toContain('id="traceModal"');
        });

        it('should serve CSS styling sheet at GET /css/style.css', async () => {
            const res = await request(app).get('/css/style.css');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toContain('text/css');
            expect(res.text).toContain('--bg-page');
        });

        it('should serve client application script at GET /js/app.js', async () => {
            const res = await request(app).get('/js/app.js');

            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/javascript/);
            expect(res.text).toContain('ContextTrace AI');
            expect(res.text).toContain('apiFetch');
        });

        it('should include appropriate Content-Security-Policy headers for frontend security', async () => {
            const res = await request(app).get('/');

            expect(res.headers['content-security-policy']).toBeDefined();
            expect(res.headers['content-security-policy']).toContain("default-src 'self'");
        });
    });
});
