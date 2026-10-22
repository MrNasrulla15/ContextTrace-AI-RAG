const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Content = require('../database/models/Content');
const Chat = require('../database/models/Chat');
const aiService = require('../backend/services/aiService');

describe('Audit Trace, Forensic Snapshots & Immutability (Phase 4)', () => {
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        await Content.deleteMany({ tenantId: 'test-audit-tenant' });
        await Chat.deleteMany({ tenantId: 'test-audit-tenant' });
    });

    afterAll(async () => {
        await Content.deleteMany({ tenantId: 'test-audit-tenant' });
        await Chat.deleteMany({ tenantId: 'test-audit-tenant' });
        await mongoose.disconnect();
    });

    it('should create immutable audit snapshots with latency, correlation ID, and hashes (T4.1 - T4.3)', async () => {
        // 1. Ingest initial document at Version 1
        const doc = await Content.create({
            title: 'Audit Travel Allowance Policy',
            content: 'Daily travel allowance for domestic conferences is fixed at 120 USD per diem.',
            category: 'Finance',
            version: 1,
            contentHash: 'hash-v1-travel',
            tenantId: 'test-audit-tenant',
            status: 'active'
        });

        // Mock Gemini to return structured answer citing doc
        const spy = jest.spyOn(aiService, 'getAIResponse').mockResolvedValueOnce({
            answer: 'Daily travel allowance is 120 USD per diem.',
            citedDocumentIds: [doc._id.toString()],
            insufficientEvidence: false
        });

        // 2. Query system
        const res = await request(app)
            .post('/api/chat/ask')
            .set('X-Tenant-Id', 'test-audit-tenant')
            .set('X-Request-Id', 'audit-test-request-uuid-001')
            .send({ question: 'What is the domestic conference travel allowance?' });

        expect(res.status).toBe(200);
        expect(res.body.chatId).toBeDefined();
        expect(res.body.requestId).toBe('audit-test-request-uuid-001');

        // 3. Inspect individual audit trace via GET /api/chat/history/:id (T4.5)
        const traceRes = await request(app)
            .get(`/api/chat/history/${res.body.chatId}`)
            .set('X-Tenant-Id', 'test-audit-tenant');

        expect(traceRes.status).toBe(200);
        expect(traceRes.body._id).toBe(res.body.chatId);
        expect(traceRes.body.requestId).toBe('audit-test-request-uuid-001');
        expect(traceRes.body.latencyMs).toBeGreaterThanOrEqual(0);
        expect(traceRes.body.promptTemplateVersion).toBe('v1.1');
        expect(traceRes.body.verificationOutcome.citationsValid).toBe(true);

        const snapshot = traceRes.body.sources[0];
        expect(snapshot.documentId).toBe(doc._id.toString());
        expect(snapshot.version).toBe(1);
        expect(snapshot.contentHash).toBe('hash-v1-travel');
        expect(snapshot.excerpt).toContain('120 USD');

        spy.mockRestore();
    });

    it('should preserve historical evidence when the underlying document is updated or archived (T4.6, T4.7)', async () => {
        // 1. Create initial document v1
        const policyDoc = await Content.create({
            title: 'Health Coverage Guidelines',
            content: 'Standard insurance covers up to 500,000 INR per family annually.',
            category: 'Benefits',
            version: 1,
            contentHash: 'hash-v1-health',
            tenantId: 'test-audit-tenant',
            status: 'active'
        });

        // 2. Ask question while document is v1
        const spy = jest.spyOn(aiService, 'getAIResponse').mockResolvedValueOnce({
            answer: 'Standard insurance coverage is 500,000 INR.',
            citedDocumentIds: [policyDoc._id.toString()],
            insufficientEvidence: false
        });

        const askRes = await request(app)
            .post('/api/chat/ask')
            .set('X-Tenant-Id', 'test-audit-tenant')
            .send({ question: 'How much health insurance is provided?' });

        const historicalChatId = askRes.body.chatId;
        spy.mockRestore();

        // 3. Now mutate the source document to Version 2 via PUT /api/content/:id
        const updateRes = await request(app)
            .put(`/api/content/${policyDoc._id}`)
            .set('X-Tenant-Id', 'test-audit-tenant')
            .send({
                content: 'Standard insurance coverage increased to 750,000 INR per family annually.'
            });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.version).toBe(2);

        // 4. Then soft-archive the document via DELETE /api/content/:id
        const archiveRes = await request(app)
            .delete(`/api/content/${policyDoc._id}`)
            .set('X-Tenant-Id', 'test-audit-tenant');

        expect(archiveRes.status).toBe(200);
        expect(archiveRes.body.status).toBe('archived');

        // 5. FORENSIC VERIFICATION:
        // Inspect the historical chat audit record created when document was Version 1
        const historicalTraceRes = await request(app)
            .get(`/api/chat/history/${historicalChatId}`)
            .set('X-Tenant-Id', 'test-audit-tenant');

        expect(historicalTraceRes.status).toBe(200);
        const auditSource = historicalTraceRes.body.sources[0];

        // The historical snapshot MUST still say Version 1 and retain the original excerpt!
        expect(auditSource.version).toBe(1);
        expect(auditSource.contentHash).toBe('hash-v1-health');
        expect(auditSource.excerpt).toContain('500,000 INR');
        expect(auditSource.excerpt).not.toContain('750,000 INR');
    });

    it('should enforce tenant isolation on individual trace lookups (T4.5)', async () => {
        // Create chat record in test-audit-tenant
        const chat = await Chat.create({
            question: 'Confidential inquiry',
            answer: 'Restricted answer',
            tenantId: 'test-audit-tenant',
            promptTemplateVersion: 'v1.1'
        });

        // Attempt to read from another tenant
        const res = await request(app)
            .get(`/api/chat/history/${chat._id}`)
            .set('X-Tenant-Id', 'unauthorized-other-tenant');

        expect(res.status).toBe(404);
        expect(res.body.error).toContain('not found or access denied');
    });
});
