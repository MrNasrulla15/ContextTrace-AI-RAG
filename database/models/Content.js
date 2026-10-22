const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Computes a deterministic SHA-256 hash for document content and title.
 */
function computeContentHash(title, content) {
    return crypto.createHash('sha256')
        .update(`${String(title).trim()}|${String(content).trim()}`)
        .digest('hex');
}

const ContentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 250
    },
    category: {
        type: String,
        default: 'General',
        trim: true,
        maxlength: 100
    },
    tags: [String],
    content: {
        type: String,
        required: true,
        maxlength: 100000 // ~25,000 tokens limit for input defense
    },
    version: {
        type: Number,
        default: 1
    },
    contentHash: {
        type: String,
        required: true
    },
    tenantId: {
        type: String,
        default: 'default',
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: null // null = permanent enterprise doc; Date = auto-purged by MongoDB TTL
    }
});

// Text index for search
ContentSchema.index({ title: 'text', content: 'text' });

// Scoped lookup indexes for tenant isolation, deduplication, and active status
ContentSchema.index({ tenantId: 1, status: 1 });
ContentSchema.index({ tenantId: 1, contentHash: 1 });

// Time-To-Live (TTL) index for automated session/transient data purging (512MB free tier constraint)
ContentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Content = mongoose.model('Content', ContentSchema);

module.exports = Content;
module.exports.computeContentHash = computeContentHash;