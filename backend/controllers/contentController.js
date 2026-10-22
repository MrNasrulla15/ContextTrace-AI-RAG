const path = require('path');
const mongoose = require('mongoose');
const Content = require('../../database/models/Content');
const { computeContentHash } = Content;

function getTenantId(req) {
    const headerTenant = req.headers['x-tenant-id'];
    const bodyTenant = req.body?.tenantId;
    const queryTenant = req.query?.tenantId;
    return (headerTenant || bodyTenant || queryTenant || 'default').trim();
}

// Insert content into the database with validation, hashing, and duplicate detection
exports.addContent = async (req, res) => {
    try {
        const { title, content, category, tags, ttlHours, isEphemeral } = req.body || {};
        const tenantId = getTenantId(req);

        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: "A valid 'title' string is required." });
        }

        if (title.trim().length > 250) {
            return res.status(400).json({ error: "Title exceeds maximum allowed length of 250 characters." });
        }

        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ error: "A valid 'content' string is required." });
        }

        if (content.trim().length > 100000) {
            return res.status(400).json({ error: "Content exceeds maximum allowed size of 100,000 characters." });
        }

        const trimmedTitle = title.trim();
        const trimmedContent = content.trim();
        const contentHash = computeContentHash(trimmedTitle, trimmedContent);

        // Deduplication check within the caller's tenant scope
        const existing = await Content.findOne({
            tenantId,
            contentHash,
            status: 'active'
        });

        if (existing) {
            return res.status(409).json({
                error: "Duplicate document detected: an active document with identical content already exists.",
                existingDocumentId: existing._id,
                version: existing.version
            });
        }

        // Calculate expiresAt if ttlHours or isEphemeral flag is provided (Cloud 512MB constraint optimization)
        let expiresAt = null;
        if (ttlHours && Number(ttlHours) > 0) {
            expiresAt = new Date(Date.now() + Number(ttlHours) * 3600 * 1000);
        } else if (isEphemeral) {
            expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours default for ephemeral session uploads
        }

        const data = await Content.create({
            title: trimmedTitle,
            content: trimmedContent,
            category: typeof category === 'string' && category.trim() ? category.trim() : 'General',
            tags: Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [],
            version: 1,
            contentHash,
            tenantId,
            status: 'active',
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return res.status(201).json(data);
    } catch (error) {
        console.error("Error in addContent:", error.message);
        return res.status(500).json({
            error: "Failed to save content",
            details: error.message
        });
    }
};

// Retrieve a single document by ID within tenant scope
exports.getContentById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getTenantId(req);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid document ID format." });
        }

        const doc = await Content.findOne({
            _id: id,
            tenantId,
            status: 'active'
        });

        if (!doc) {
            return res.status(404).json({ error: "Document not found or access denied." });
        }

        return res.json(doc);
    } catch (error) {
        console.error("Error in getContentById:", error.message);
        return res.status(500).json({
            error: "Failed to retrieve document",
            details: error.message
        });
    }
};

// Update an existing document and increment its version
exports.updateContent = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getTenantId(req);
        const { title, content, category, tags } = req.body || {};

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid document ID format." });
        }

        const doc = await Content.findOne({
            _id: id,
            tenantId,
            status: 'active'
        });

        if (!doc) {
            return res.status(404).json({ error: "Document not found or access denied." });
        }

        if (title !== undefined) {
            if (typeof title !== 'string' || !title.trim() || title.trim().length > 250) {
                return res.status(400).json({ error: "Valid title under 250 characters is required." });
            }
            doc.title = title.trim();
        }

        if (content !== undefined) {
            if (typeof content !== 'string' || !content.trim() || content.trim().length > 100000) {
                return res.status(400).json({ error: "Valid content under 100,000 characters is required." });
            }
            doc.content = content.trim();
        }

        if (category !== undefined) {
            doc.category = typeof category === 'string' && category.trim() ? category.trim() : 'General';
        }

        if (Array.isArray(tags)) {
            doc.tags = tags.map(t => String(t).trim()).filter(Boolean);
        }

        // Recompute hash, increment version, and stamp update timestamp
        doc.contentHash = computeContentHash(doc.title, doc.content);
        doc.version = (doc.version || 1) + 1;
        doc.updatedAt = new Date();

        await doc.save();
        return res.json(doc);
    } catch (error) {
        console.error("Error in updateContent:", error.message);
        return res.status(500).json({
            error: "Failed to update content",
            details: error.message
        });
    }
};

// Soft-archive a document to preserve historical audit citations
exports.archiveContent = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getTenantId(req);

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid document ID format." });
        }

        const doc = await Content.findOne({
            _id: id,
            tenantId,
            status: 'active'
        });

        if (!doc) {
            return res.status(404).json({ error: "Document not found or already archived." });
        }

        doc.status = 'archived';
        doc.updatedAt = new Date();
        await doc.save();

        return res.json({
            message: "Document successfully archived",
            id: doc._id,
            status: doc.status
        });
    } catch (error) {
        console.error("Error in archiveContent:", error.message);
        return res.status(500).json({
            error: "Failed to archive document",
            details: error.message
        });
    }
};

// Show active content with pagination within tenant scope
exports.getAllContent = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const data = await Content.find({
            tenantId,
            status: 'active'
        })
        .sort({ updatedAt: -1 })
        .limit(limit);

        return res.json(data);
    } catch (error) {
        console.error("Error in getAllContent:", error.message);
        return res.status(500).json({
            error: "Failed to retrieve content",
            details: error.message
        });
    }
};

// Search active content within tenant scope with relevance scoring
exports.searchContent = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const q = req.query.q ? String(req.query.q).trim() : "";
        if (!q) {
            return res.status(400).json({ error: "Query parameter 'q' is required for search." });
        }

        const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

        const results = await Content.find(
            {
                $text: { $search: q },
                tenantId,
                status: 'active'
            },
            { score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(limit);

        return res.json(results);
    } catch (error) {
        console.error("Error in searchContent:", error.message);
        return res.status(500).json({
            error: "Failed to execute search",
            details: error.message
        });
    }
};

// Purge expired or ephemeral documents immediately within tenant scope (Session Cleanup)
exports.purgeContent = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { onlyEphemeral } = req.query || {};

        const filter = { tenantId };
        if (onlyEphemeral === 'true' || onlyEphemeral === true) {
            filter.expiresAt = { $ne: null };
        }

        const result = await Content.deleteMany(filter);
        return res.json({
            message: "Purged documents successfully",
            tenantId,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Error in purgeContent:", error.message);
        return res.status(500).json({
            error: "Failed to purge content",
            details: error.message
        });
    }
};

// Handle multipart file upload (.txt, .md, .json, .csv, .pdf)
exports.uploadContentFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded. Please provide a file in the 'file' multipart field." });
        }

        const tenantId = getTenantId(req);
        const { originalname, buffer, mimetype } = req.file;
        const ext = path.extname(originalname || '').toLowerCase();

        let extractedText = '';

        if (mimetype === 'application/pdf' || ext === '.pdf') {
            try {
                const pdfModule = require('pdf-parse');
                if (typeof pdfModule === 'function') {
                    const data = await pdfModule(buffer);
                    extractedText = data.text || '';
                } else if (pdfModule.PDFParse) {
                    const parser = new pdfModule.PDFParse({ data: buffer });
                    const resData = await parser.getText();
                    extractedText = resData?.text || '';
                } else {
                    return res.status(500).json({ error: "PDF parser library initialization failed." });
                }
            } catch (pdfErr) {
                return res.status(400).json({
                    error: "Failed to parse PDF file. Ensure the PDF is not password-protected or corrupted.",
                    details: pdfErr.message
                });
            }
        } else {
            // Text-based files: .txt, .md, .json, .csv, .log, etc.
            extractedText = buffer.toString('utf-8');
        }

        const trimmedContent = (extractedText || '').trim();
        if (!trimmedContent) {
            return res.status(400).json({ error: "Uploaded file does not contain readable text content." });
        }

        // Bounded size protection: cap at 100,000 characters
        const finalContent = trimmedContent.length > 100000 ? trimmedContent.substring(0, 100000) : trimmedContent;

        // Determine title
        const rawTitle = (req.body?.title && typeof req.body.title === 'string' && req.body.title.trim())
            ? req.body.title.trim()
            : path.basename(originalname, ext) || originalname;
        const title = rawTitle.substring(0, 250);

        const contentHash = computeContentHash(title, finalContent);

        // Deduplication check within tenant
        const existing = await Content.findOne({
            tenantId,
            contentHash,
            status: 'active'
        });

        if (existing) {
            return res.status(200).json({
                ...existing.toObject(),
                alreadyExists: true,
                message: "An identical active document already exists in this tenant. Re-using existing document."
            });
        }

        // Retention lifecycle (Default to 24h ephemeral for uploaded files to respect 512MB free-tier Atlas)
        let expiresAt = null;
        const { ttlHours, isPermanent } = req.body || {};
        if (isPermanent === 'true' || isPermanent === true) {
            expiresAt = null;
        } else if (ttlHours && Number(ttlHours) > 0) {
            expiresAt = new Date(Date.now() + Number(ttlHours) * 3600 * 1000);
        } else {
            expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours default for uploads
        }

        const category = (req.body?.category && typeof req.body.category === 'string' && req.body.category.trim())
            ? req.body.category.trim()
            : 'Uploaded';

        const tags = ['upload'];
        if (ext) tags.push(ext.replace('.', ''));
        if (req.body?.tags) {
            if (Array.isArray(req.body.tags)) {
                tags.push(...req.body.tags);
            } else if (typeof req.body.tags === 'string') {
                tags.push(...req.body.tags.split(',').map(t => t.trim()).filter(Boolean));
            }
        }

        const doc = await Content.create({
            title,
            content: finalContent,
            category,
            tags: [...new Set(tags)],
            version: 1,
            contentHash,
            tenantId,
            status: 'active',
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return res.status(201).json(doc);
    } catch (error) {
        console.error("Error in uploadContentFile:", error.message);
        return res.status(500).json({
            error: "Failed to upload and process file",
            details: error.message
        });
    }
};

