const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Content = require('../database/models/Content');
const Chat = require('../database/models/Chat');

describe('Storage Optimization & Cloud 512MB Quota Defense', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        await Content.deleteMany({ tenantId: 'test-storage-tenant' });
        await Chat.deleteMany({ tenantId: 'test-storage-tenant' });
    });

    afterAll(async () => {
        await Content.deleteMany({ tenantId: 'test-storage-tenant' });
        await Chat.deleteMany({ tenantId: 'test-storage-tenant' });
        await mongoose.disconnect();
    });

    describe('MongoDB TTL Index Registration', () => {
        it('should have a TTL index on Content.expiresAt with expireAfterSeconds: 0', () => {
            const indexes = Content.schema.indexes();
            const ttlIndex = indexes.find(idx => idx[0].expiresAt !== undefined);

            expect(ttlIndex).toBeDefined();
            expect(ttlIndex[0].expiresAt).toBe(1);
            expect(ttlIndex[1].expireAfterSeconds).toBe(0);
        });

        it('should have a TTL index on Chat.expiresAt with expireAfterSeconds: 0', () => {
            const indexes = Chat.schema.indexes();
            const ttlIndex = indexes.find(idx => idx[0].expiresAt !== undefined);

            expect(ttlIndex).toBeDefined();
            expect(ttlIndex[0].expiresAt).toBe(1);
            expect(ttlIndex[1].expireAfterSeconds).toBe(0);
        });
    });

    describe('Ephemeral Ingestion & Automated Lifecycle', () => {
        it('should set expiresAt when ttlHours is specified', async () => {
            const res = await request(app)
                .post('/api/content')
                .set('X-Tenant-Id', 'test-storage-tenant')
                .send({
                    title: 'Temporary Session Notes',
                    content: 'These notes are only needed for the active user session.',
                    category: 'Transient',
                    ttlHours: 24
                });

            expect(res.status).toBe(201);
            expect(res.body.expiresAt).toBeDefined();

            const expiresDate = new Date(res.body.expiresAt);
            const now = Date.now();
            const diffHours = (expiresDate.getTime() - now) / (1000 * 3600);

            // Should be roughly 24 hours in the future
            expect(diffHours).toBeGreaterThan(23.5);
            expect(diffHours).toBeLessThan(24.5);
        });

        it('should leave expiresAt as null for permanent knowledge documents', async () => {
            const res = await request(app)
                .post('/api/content')
                .set('X-Tenant-Id', 'test-storage-tenant')
                .send({
                    title: 'Permanent Corporate Constitution',
                    content: 'Articles of incorporation and governance policies.',
                    category: 'Legal'
                });

            expect(res.status).toBe(201);
            expect(res.body.expiresAt == null).toBe(true);
        });
    });

    describe('SHA-256 Deduplication Defense', () => {
        it('should reject duplicate documents with HTTP 409 Conflict', async () => {
            const docPayload = {
                title: 'Duplicate Prevention Spec',
                content: 'Identical payload to test cryptographic hash deduplication.',
                category: 'Architecture'
            };

            const firstRes = await request(app)
                .post('/api/content')
                .set('X-Tenant-Id', 'test-storage-tenant')
                .send(docPayload);

            expect(firstRes.status).toBe(201);

            // Attempting to re-ingest identical document
            const dupRes = await request(app)
                .post('/api/content')
                .set('X-Tenant-Id', 'test-storage-tenant')
                .send(docPayload);

            expect(dupRes.status).toBe(409);
            expect(dupRes.body.error).toContain('Duplicate document detected');
            expect(dupRes.body.existingDocumentId).toBe(firstRes.body._id);
        });
    });

    describe('Selective Session Purge Endpoint (DELETE /api/content/purge)', () => {
        it('should purge only ephemeral documents when onlyEphemeral=true is set', async () => {
            // Seed 1 ephemeral and 1 permanent document
            await Content.create({
                title: 'Ephemeral Scratchpad',
                content: 'Scratchpad content.',
                contentHash: 'hash-scratchpad-1',
                tenantId: 'test-storage-tenant',
                status: 'active',
                expiresAt: new Date(Date.now() + 3600 * 1000)
            });

            const purgeRes = await request(app)
                .delete('/api/content/purge?onlyEphemeral=true')
                .set('X-Tenant-Id', 'test-storage-tenant');

            expect(purgeRes.status).toBe(200);
            expect(purgeRes.body.deletedCount).toBeGreaterThanOrEqual(1);

            // Permanent document should still exist
            const remainingDocs = await Content.find({
                tenantId: 'test-storage-tenant',
                title: 'Permanent Corporate Constitution'
            });
            expect(remainingDocs.length).toBe(1);
        });
    });

    describe('Storage Quota Guard Circuit Breaker (HTTP 507)', () => {
        const originalLimit = process.env.STORAGE_LIMIT_MB;

        afterEach(() => {
            process.env.STORAGE_LIMIT_MB = originalLimit;
        });

        it('should trip the circuit breaker and return HTTP 507 when storage exceeds configured threshold', async () => {
            // Set limit to 0.000001 MB (1 byte) so current database usage exceeds it
            process.env.STORAGE_LIMIT_MB = '0.000001';

            const res = await request(app)
                .post('/api/content')
                .set('X-Tenant-Id', 'test-storage-tenant')
                .send({
                    title: 'Storage Overflow Document',
                    content: 'This document should be rejected by the circuit breaker.',
                    category: 'Test'
                });

            expect(res.status).toBe(507);
            expect(res.body.error).toContain('Storage quota exceeded');
            expect(res.body.details.code).toBe('STORAGE_QUOTA_EXCEEDED');
            expect(res.body.details.currentUsageMb).toBeGreaterThan(0);
        });
    });
});
