const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Content = require('../database/models/Content');
const { computeContentHash } = Content;

describe('Document Ingestion, Validation & Versioning', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
    });

    afterAll(async () => {
        // Clean up test documents created during this run
        await Content.deleteMany({ tenantId: 'test-ingestion-tenant' });
        await mongoose.disconnect();
    });

    describe('Validation Boundaries (T2.1)', () => {
        it('should reject title exceeding 250 characters', async () => {
            const longTitle = 'A'.repeat(251);
            const res = await request(app)
                .post('/api/content')
                .send({ title: longTitle, content: 'Some valid body' });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('250 characters');
        });

        it('should reject content exceeding 100,000 characters', async () => {
            const hugeContent = 'X'.repeat(100001);
            const res = await request(app)
                .post('/api/content')
                .send({ title: 'Valid Title', content: hugeContent });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('100,000 characters');
        });

        it('should compute deterministic SHA-256 content hashes', () => {
            const hash1 = computeContentHash('Sample Policy', 'Employees get 20 days off.');
            const hash2 = computeContentHash('Sample Policy', 'Employees get 20 days off.');
            const hash3 = computeContentHash('Sample Policy', 'Employees get 21 days off.');

            expect(hash1).toBe(hash2);
            expect(hash1).not.toBe(hash3);
            expect(hash1).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('Ingestion & Deduplication (T2.1, T2.2)', () => {
        let createdDocId;

        it('should ingest document and initialize version 1 and active status', async () => {
            const res = await request(app)
                .post('/api/content')
                .set('X-Tenant-Id', 'test-ingestion-tenant')
                .send({
                    title: 'Engineering Onboarding Guide',
                    content: 'Step 1: Clone the repository. Step 2: Install dependencies.',
                    category: 'Engineering'
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('_id');
            expect(res.body.version).toBe(1);
            expect(res.body.status).toBe('active');
            expect(res.body.contentHash).toBeDefined();
            expect(res.body.tenantId).toBe('test-ingestion-tenant');

            createdDocId = res.body._id;
        });

        it('should reject duplicate document with identical content in same tenant (409 Conflict)', async () => {
            const res = await request(app)
                .post('/api/content')
                .set('X-Tenant-Id', 'test-ingestion-tenant')
                .send({
                    title: 'Engineering Onboarding Guide',
                    content: 'Step 1: Clone the repository. Step 2: Install dependencies.',
                    category: 'Engineering'
                });

            expect(res.status).toBe(409);
            expect(res.body.error).toContain('Duplicate document detected');
            expect(res.body.existingDocumentId).toBe(createdDocId);
        });

        it('should retrieve individual document by ID (GET /api/content/:id)', async () => {
            const res = await request(app)
                .get(`/api/content/${createdDocId}`)
                .set('X-Tenant-Id', 'test-ingestion-tenant');

            expect(res.status).toBe(200);
            expect(res.body._id).toBe(createdDocId);
            expect(res.body.title).toBe('Engineering Onboarding Guide');
        });

        it('should update document and increment version to 2 (PUT /api/content/:id)', async () => {
            const res = await request(app)
                .put(`/api/content/${createdDocId}`)
                .set('X-Tenant-Id', 'test-ingestion-tenant')
                .send({
                    content: 'Step 1: Clone repo. Step 2: Run npm install. Step 3: Run npm test.'
                });

            expect(res.status).toBe(200);
            expect(res.body.version).toBe(2);
            expect(res.body.content).toContain('Step 3: Run npm test.');
        });

        it('should soft-archive document (DELETE /api/content/:id)', async () => {
            const res = await request(app)
                .delete(`/api/content/${createdDocId}`)
                .set('X-Tenant-Id', 'test-ingestion-tenant');

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('archived');

            // Verify it is no longer returned by GET /:id as active
            const getRes = await request(app)
                .get(`/api/content/${createdDocId}`)
                .set('X-Tenant-Id', 'test-ingestion-tenant');

            expect(getRes.status).toBe(404);
        });
    });
});
