const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    requestId: {
        type: String,
        index: true
    },
    question: {
        type: String,
        required: true,
        trim: true
    },
    answer: {
        type: String,
        required: true
    },
    sourceTitles: [String],
    sources: [
        {
            documentId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Content'
            },
            title: String,
            version: Number,
            contentHash: String,
            score: Number,
            excerpt: String
        }
    ],
    tenantId: {
        type: String,
        default: 'default',
        index: true
    },
    model: {
        type: String,
        default: 'gemini-2.5-flash'
    },
    latencyMs: {
        type: Number
    },
    promptTemplateVersion: {
        type: String,
        default: 'v1.1'
    },
    abstained: {
        type: Boolean,
        default: false
    },
    insufficientEvidence: {
        type: Boolean,
        default: false
    },
    verificationOutcome: {
        schemaValid: {
            type: Boolean,
            default: true
        },
        citationsValid: {
            type: Boolean,
            default: true
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: null // null = persistent audit trail; Date = auto-purged by MongoDB TTL
    }
});

// Time-To-Live (TTL) index for automated audit log lifecycle purging
chatSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Chat', chatSchema);

