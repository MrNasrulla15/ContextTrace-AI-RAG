const request = require('supertest');
const app = require('../app');

describe('API Contract & Validation Boundaries', () => {
    describe('POST /api/content validation', () => {
        it('should reject request when title is missing', async () => {
            const res = await request(app)
                .post('/api/content')
                .send({ content: 'Some valid content without title' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('title');
        });

        it('should reject request when content is missing', async () => {
            const res = await request(app)
                .post('/api/content')
                .send({ title: 'Valid Title' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('content');
        });

        it('should reject request with empty payload', async () => {
            const res = await request(app)
                .post('/api/content')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('GET /api/content/search validation', () => {
        it('should reject search when query parameter "q" is missing', async () => {
            const res = await request(app).get('/api/content/search');

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('Query parameter');
        });
    });

    describe('POST /api/chat/ask validation', () => {
        it('should reject ask query when question is missing', async () => {
            const res = await request(app)
                .post('/api/chat/ask')
                .send({});

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toContain('question');
        });

        it('should reject ask query when question is only whitespace', async () => {
            const res = await request(app)
                .post('/api/chat/ask')
                .send({ question: '   ' });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('Fallback 404 Routing', () => {
        it('should return standardized 404 error envelope for unknown routes', async () => {
            const res = await request(app).get('/api/non-existent-route');

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty('error');
            expect(res.body.details).toHaveProperty('code', 'NOT_FOUND');
            expect(res.body.details).toHaveProperty('requestId');
            expect(res.headers['x-request-id']).toBeDefined();
        });
    });
});
