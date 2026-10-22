const mongoose = require('mongoose');
const Content = require('../../database/models/Content');
const Chat = require('../../database/models/Chat');
const aiService = require("../services/aiService");
const { buildGroundedPrompt, PROMPT_TEMPLATE_VERSION } = require("../services/promptService");

function getTenantId(req) {
    const headerTenant = req.headers['x-tenant-id'];
    const bodyTenant = req.body?.tenantId;
    const queryTenant = req.query?.tenantId;
    return (headerTenant || bodyTenant || queryTenant || 'default').trim();
}

exports.askQuestion = async (req, res) => {
    const startTime = Date.now();
    try {
        const { question, documentId } = req.body || {};
        const tenantId = getTenantId(req);

        if (!question || typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({
                error: "A valid 'question' string is required in the request body."
            });
        }

        const trimmedQuestion = question.trim();

        // 1. Retrieval: Target specific documentId if provided, else perform lexical text search
        let docs = [];
        if (documentId) {
            if (!mongoose.Types.ObjectId.isValid(documentId)) {
                return res.status(400).json({ error: "Invalid documentId format." });
            }
            const targetedDoc = await Content.findOne({
                _id: documentId,
                tenantId,
                status: 'active'
            });
            if (targetedDoc) {
                docs = [targetedDoc];
            }
        } else {
            docs = await Content.find(
                {
                    $text: { $search: trimmedQuestion },
                    tenantId,
                    status: 'active'
                },
                { score: { $meta: "textScore" } }
            )
            .sort({ score: { $meta: "textScore" } })
            .limit(3);
        }

        // 2. Programmatic abstention when no evidence is found in scope
        if (!docs || docs.length === 0) {
            const abstainedAnswer = documentId
                ? "The specified document could not be found or has expired in your tenant scope."
                : "I could not find any relevant internal documents to answer your question.";
            const latencyMs = Date.now() - startTime;

            const chatRecord = await Chat.create({
                requestId: req.id || 'N/A',
                question: trimmedQuestion,
                answer: abstainedAnswer,
                sourceTitles: [],
                sources: [],
                tenantId,
                latencyMs,
                promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
                abstained: true,
                insufficientEvidence: true,
                verificationOutcome: { schemaValid: true, citationsValid: true }
            });

            return res.json({
                chatId: chatRecord._id,
                requestId: req.id || 'N/A',
                answer: abstainedAnswer,
                sources: [],
                abstained: true,
                insufficientEvidence: true,
                latencyMs,
                promptTemplateVersion: PROMPT_TEMPLATE_VERSION
            });
        }

        // 3. Bounded context construction to enforce token budget & mitigate prompt injection
        let totalChars = 0;
        const boundedDocs = [];
        for (const doc of docs) {
            const contentLen = doc.content?.length || 0;
            if (totalChars + contentLen <= 16000 || boundedDocs.length === 0) {
                boundedDocs.push(doc);
                totalChars += contentLen;
            }
        }

        // 4. Centralized guardrailed prompt construction
        const prompt = buildGroundedPrompt(trimmedQuestion, boundedDocs);

        // 5. Generate structured grounded response from Gemini
        const aiResult = await aiService.getAIResponse(prompt);

        // 6. Explicit abstention if model signals insufficient evidence
        if (aiResult.insufficientEvidence) {
            const abstainedAnswer = aiResult.answer || "The provided internal documentation does not contain enough information to answer this question.";
            const latencyMs = Date.now() - startTime;

            const chatRecord = await Chat.create({
                requestId: req.id || 'N/A',
                question: trimmedQuestion,
                answer: abstainedAnswer,
                sourceTitles: [],
                sources: [],
                tenantId,
                latencyMs,
                promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
                abstained: true,
                insufficientEvidence: true,
                verificationOutcome: { schemaValid: true, citationsValid: true }
            });

            return res.json({
                chatId: chatRecord._id,
                requestId: req.id || 'N/A',
                answer: abstainedAnswer,
                sources: [],
                abstained: true,
                insufficientEvidence: true,
                latencyMs,
                promptTemplateVersion: PROMPT_TEMPLATE_VERSION
            });
        }

        // 7. Citation validation against retrieved evidence set & snapshot creation (T4.2)
        const retrievedDocsMap = new Map();
        for (const d of boundedDocs) {
            retrievedDocsMap.set(d._id.toString(), d);
        }

        let allCitationsValid = true;
        const validSources = [];

        if (Array.isArray(aiResult.citedDocumentIds) && aiResult.citedDocumentIds.length > 0) {
            for (const citedId of aiResult.citedDocumentIds) {
                const matchedDoc = retrievedDocsMap.get(citedId);
                if (matchedDoc) {
                    validSources.push({
                        documentId: matchedDoc._id,
                        title: matchedDoc.title,
                        version: matchedDoc.version || 1,
                        contentHash: matchedDoc.contentHash || '',
                        score: typeof matchedDoc._doc?.score === 'number' ? matchedDoc._doc.score : 1.0,
                        excerpt: matchedDoc.content ? (matchedDoc.content.length > 160 ? matchedDoc.content.substring(0, 160) + "..." : matchedDoc.content) : ""
                    });
                } else {
                    // Model referenced an ID that was not provided in retrieval context
                    allCitationsValid = false;
                }
            }
        }

        // Fallback: if model provided an answer but omitted citedDocumentIds, resolve from retrieved docs
        if (validSources.length === 0 && boundedDocs.length > 0) {
            for (const d of boundedDocs) {
                validSources.push({
                    documentId: d._id,
                    title: d.title,
                    version: d.version || 1,
                    contentHash: d.contentHash || '',
                    score: typeof d._doc?.score === 'number' ? d._doc.score : 1.0,
                    excerpt: d.content ? (d.content.length > 160 ? d.content.substring(0, 160) + "..." : d.content) : ""
                });
            }
        }

        // 8. Persist complete audit trail with verification metadata and latency
        const latencyMs = Date.now() - startTime;
        let chatRecord;
        try {
            chatRecord = await Chat.create({
                requestId: req.id || 'N/A',
                question: trimmedQuestion,
                answer: aiResult.answer,
                sourceTitles: validSources.map(s => s.title),
                sources: validSources,
                tenantId,
                model: aiResult.modelUsed || 'gemini-3.5-flash-lite',
                latencyMs,
                promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
                abstained: false,
                insufficientEvidence: false,
                verificationOutcome: {
                    schemaValid: true,
                    citationsValid: allCitationsValid
                }
            });
        } catch (dbErr) {
            // Explicit audit-write failure semantics (T4.4)
            console.error("FATAL: Failed to persist audit trace in Chat collection:", dbErr.message);
            return res.status(500).json({
                error: "Audit persistence failure: unable to record verifiable trace for generated answer",
                details: dbErr.message
            });
        }

        // 9. Deliver verified response to client
        return res.json({
            chatId: chatRecord._id,
            requestId: req.id || 'N/A',
            answer: aiResult.answer,
            sources: validSources,
            abstained: false,
            insufficientEvidence: false,
            model: aiResult.modelUsed || 'gemini-3.5-flash-lite',
            latencyMs,
            promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
            verificationOutcome: {
                citationsValid: allCitationsValid
            }
        });
    } catch (error) {
        console.error("Error in askQuestion:", error.message);
        return res.status(500).json({
            error: "Failed to process chat query",
            details: error.message
        });
    }
};

// Retrieve chat history for tenant with pagination
exports.getChatHistory = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const history = await Chat.find({ tenantId })
            .sort({ createdAt: -1 })
            .limit(limit);

        return res.json(history);
    } catch (error) {
        console.error("Error in getChatHistory:", error.message);
        return res.status(500).json({
            error: "Failed to retrieve chat history",
            details: error.message
        });
    }
};

// Retrieve an individual audit trace by ID for forensic investigation (T4.5)
exports.getChatById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getTenantId(req);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid chat trace ID format." });
        }

        const chat = await Chat.findOne({
            _id: id,
            tenantId
        });

        if (!chat) {
            return res.status(404).json({ error: "Chat trace not found or access denied." });
        }

        return res.json(chat);
    } catch (error) {
        console.error("Error in getChatById:", error.message);
        return res.status(500).json({
            error: "Failed to retrieve chat trace",
            details: error.message
        });
    }
};
