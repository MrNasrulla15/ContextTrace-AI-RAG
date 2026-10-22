const request = require('supertest');
const app = require('../app');

describe('GET /api/health', () => {
    it('should return 200 OK with service details and correlation ID', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('service', 'ContextTrace AI');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('requestId');

        // Verify correlation header matches body requestId
        expect(response.headers['x-request-id']).toBeDefined();
        expect(response.headers['x-request-id']).toBe(response.body.requestId);
    });

    it('should propagate incoming X-Request-Id if provided', async () => {
        const customId = 'test-trace-id-12345';
        const response = await request(app)
            .get('/api/health')
            .set('X-Request-Id', customId);

        expect(response.status).toBe(200);
        expect(response.headers['x-request-id']).toBe(customId);
        expect(response.body.requestId).toBe(customId);
    });
});
