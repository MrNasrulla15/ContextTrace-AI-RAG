const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Content = require('../database/models/Content');
const Chat = require('../database/models/Chat');

describe('Authorized Scoped Retrieval (T2.4, T2.5, T2.7)', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }

        // Clean any old test artifacts
        await Content.deleteMany({ tenantId: { $in: ['tenant-alpha', 'tenant-beta'] } });
        await Chat.deleteMany({ tenantId: { $in: ['tenant-alpha', 'tenant-beta'] } });

        // Seed document in tenant-alpha
        await request(app)
            .post('/api/content')
            .set('X-Tenant-Id', 'tenant-alpha')
            .send({
                title: 'Alpha Remote Work Policy',
                content: 'Alpha employees may work remotely up to three days per week.',
                category: 'HR'
            });

        // Seed document in tenant-beta
        await request(app)
            .post('/api/content')
            .set('X-Tenant-Id', 'tenant-beta')
            .send({
                title: 'Beta Security Clearance Protocol',
                content: 'Beta engineers require level 2 security tokens for VPN access.',
                category: 'Security'
            });
    });

    afterAll(async () => {
        await Content.deleteMany({ tenantId: { $in: ['tenant-alpha', 'tenant-beta'] } });
        await Chat.deleteMany({ tenantId: { $in: ['tenant-alpha', 'tenant-beta'] } });
        await mongoose.disconnect();
    });

    it('should retrieve documents strictly within caller tenant scope', async () => {
        // Query tenant-alpha
        const alphaRes = await request(app)
            .get('/api/content')
            .set('X-Tenant-Id', 'tenant-alpha');

        expect(alphaRes.status).toBe(200);
        expect(alphaRes.body.length).toBe(1);
        expect(alphaRes.body[0].title).toBe('Alpha Remote Work Policy');

        // Query tenant-beta
        const betaRes = await request(app)
            .get('/api/content')
            .set('X-Tenant-Id', 'tenant-beta');

        expect(betaRes.status).toBe(200);
        expect(betaRes.body.length).toBe(1);
        expect(betaRes.body[0].title).toBe('Beta Security Clearance Protocol');
    });

    it('should not leak documents across tenants during search', async () => {
        // Search in tenant-alpha for keyword present only in tenant-beta
        const res = await request(app)
            .get('/api/content/search?q=security')
            .set('X-Tenant-Id', 'tenant-alpha');

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(0);
    });

    it('should abstain when question has no matching documents in caller tenant', async () => {
        const res = await request(app)
            .post('/api/chat/ask')
            .set('X-Tenant-Id', 'tenant-alpha')
            .send({ question: 'What security token level do Beta engineers require?' });

        expect(res.status).toBe(200);
        expect(res.body.abstained).toBe(true);
        expect(res.body.sources).toEqual([]);
        expect(res.body.answer).toContain('could not find any relevant internal documents');
    });
});
