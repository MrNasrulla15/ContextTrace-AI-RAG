const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

describe('Security Hardening & Protection Boundaries (Phase 5)', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
    });

    describe('HTTP Security Headers via Helmet (T5.5)', () => {
        it('should include X-Content-Type-Options: nosniff to prevent MIME-sniffing', async () => {
            const res = await request(app).get('/api/health');

            expect(res.status).toBe(200);
            expect(res.headers['x-content-type-options']).toBe('nosniff');
        });

        it('should hide X-Powered-By header to prevent technology fingerprinting', async () => {
            const res = await request(app).get('/api/health');

            expect(res.headers['x-powered-by']).toBeUndefined();
        });
    });

    describe('CORS Configuration (T5.5)', () => {
        it('should return CORS allow headers for cross-origin frontend requests', async () => {
            const res = await request(app)
                .get('/api/health')
                .set('Origin', 'http://localhost:5173');

            expect(res.status).toBe(200);
            expect(res.headers['access-control-allow-origin']).toBeDefined();
        });
    });

    describe('API Authentication Guard (T5.1)', () => {
        const originalApiKey = process.env.API_KEY;

        afterEach(() => {
            process.env.API_KEY = originalApiKey;
        });

        it('should allow requests through when API_KEY is unset in environment (open dev mode)', async () => {
            delete process.env.API_KEY;
            const res = await request(app).get('/api/content');

            // In open mode, it shouldn't be 401
            expect(res.status).not.toBe(401);
        });

        it('should reject requests with 401 Unauthorized when API_KEY is set and header is missing', async () => {
            process.env.API_KEY = 'super-secret-key-123';

            const res = await request(app).get('/api/content');

            expect(res.status).toBe(401);
            expect(res.body.error).toContain('Unauthorized');
            expect(res.body.details.code).toBe('UNAUTHORIZED');
        });

        it('should accept requests when valid X-API-Key is supplied', async () => {
            process.env.API_KEY = 'super-secret-key-123';

            const res = await request(app)
                .get('/api/content')
                .set('X-API-Key', 'super-secret-key-123');

            expect(res.status).not.toBe(401);
        });

        it('should accept requests when valid Authorization Bearer token is supplied', async () => {
            process.env.API_KEY = 'super-secret-key-123';

            const res = await request(app)
                .get('/api/content')
                .set('Authorization', 'Bearer super-secret-key-123');

            expect(res.status).not.toBe(401);
        });
    });
});
