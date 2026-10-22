const fs = require('fs');
const path = require('path');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const Content = require('../database/models/Content');
const Chat = require('../database/models/Chat');
const aiService = require('../backend/services/aiService');

describe('Document Upload & Targeted Grounded Q&A', () => {
    const testTenant = 'test-upload-tenant';
    let uploadedTxtDoc = null;

    // Use guaranteed valid PDF fixture
    const samplePdfBuffer = fs.readFileSync(path.join(__dirname, '../node_modules/pdf-parse/test/data/01-valid.pdf'));

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI);
        }
        await Content.deleteMany({ tenantId: testTenant });
        await Chat.deleteMany({ tenantId: testTenant });
    });

    afterAll(async () => {
        await Content.deleteMany({ tenantId: testTenant });
        await Chat.deleteMany({ tenantId: testTenant });
        await mongoose.disconnect();
    });

    describe('Multipart Document Upload Endpoint (POST /api/content/upload)', () => {
        it('should return 400 when no file is uploaded', async () => {
            const res = await request(app)
                .post('/api/content/upload')
                .set('X-Tenant-Id', testTenant);

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('No file uploaded');
        });

        it('should successfully upload and extract a .txt document with 24h default TTL', async () => {
            const textContent = 'ContextTrace AI security policy: All employees must use hardware MFA keys for production access.';
            const res = await request(app)
                .post('/api/content/upload')
                .set('X-Tenant-Id', testTenant)
                .attach('file', Buffer.from(textContent), 'security_mfa_policy.txt');

            expect(res.status).toBe(201);
            expect(res.body.title).toBe('security_mfa_policy');
            expect(res.body.content).toBe(textContent);
            expect(res.body.tenantId).toBe(testTenant);
            expect(res.body.version).toBe(1);
            expect(res.body.contentHash).toBeDefined();
            expect(res.body.expiresAt).toBeDefined(); // Ephemeral 24h by default

            uploadedTxtDoc = res.body;
        });

        it('should detect duplicate uploads and return existing document gracefully (status 200)', async () => {
            const textContent = 'ContextTrace AI security policy: All employees must use hardware MFA keys for production access.';
            const res = await request(app)
                .post('/api/content/upload')
                .set('X-Tenant-Id', testTenant)
                .attach('file', Buffer.from(textContent), 'security_mfa_policy.txt');

            expect(res.status).toBe(200);
            expect(res.body._id).toBe(uploadedTxtDoc._id);
            expect(res.body.alreadyExists).toBe(true);
        });

        it('should successfully parse and extract text from a .pdf document', async () => {
            const res = await request(app)
                .post('/api/content/upload')
                .set('X-Tenant-Id', testTenant)
                .attach('file', samplePdfBuffer, 'architecture_overview.pdf');

            expect(res.status).toBe(201);
            expect(res.body.title).toBe('architecture_overview');
            expect(res.body.content.length).toBeGreaterThan(100);
            expect(res.body.contentHash).toBeDefined();
        });
    });

    describe('Targeted Document-Scoped Q&A (POST /api/chat/ask with documentId)', () => {
        it('should return 400 when documentId has an invalid ObjectId format', async () => {
            const res = await request(app)
                .post('/api/chat/ask')
                .set('X-Tenant-Id', testTenant)
                .send({
                    question: 'What type of MFA is mandatory?',
                    documentId: 'invalid-id-format'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('Invalid documentId format');
        });

        it('should explicitly abstain when documentId is not found in the tenant scope', async () => {
            const randomId = new mongoose.Types.ObjectId();
            const res = await request(app)
                .post('/api/chat/ask')
                .set('X-Tenant-Id', testTenant)
                .send({
                    question: 'What type of MFA is mandatory?',
                    documentId: randomId.toString()
                });

            expect(res.status).toBe(200);
            expect(res.body.abstained).toBe(true);
            expect(res.body.sources.length).toBe(0);
            expect(res.body.answer).toContain('The specified document could not be found');
        });

        it('should ground synthesis directly in the uploaded document and cite it', async () => {
            expect(uploadedTxtDoc).toBeDefined();

            const mockAnswer = 'Employees must use hardware MFA keys for production access.';
            const spy = jest.spyOn(aiService, 'getAIResponse').mockResolvedValueOnce({
                answer: mockAnswer,
                citedDocumentIds: [uploadedTxtDoc._id.toString()],
                insufficientEvidence: false
            });

            const res = await request(app)
                .post('/api/chat/ask')
                .set('X-Tenant-Id', testTenant)
                .send({
                    question: 'What is required for production access?',
                    documentId: uploadedTxtDoc._id.toString()
                });

            expect(res.status).toBe(200);
            expect(res.body.abstained).toBe(false);
            expect(res.body.answer).toBe(mockAnswer);
            expect(res.body.sources.length).toBe(1);
            expect(res.body.sources[0].title).toBe('security_mfa_policy');
            expect(res.body.sources[0].excerpt).toContain('hardware MFA keys');
            expect(res.body.verificationOutcome.citationsValid).toBe(true);

            spy.mockRestore();
        });
    });
});
