const mongoose = require('mongoose');

// Default safety ceiling: 480 MB (leaving ~32 MB safety buffer before Atlas M0 512 MB hard freeze)
const DEFAULT_LIMIT_MB = 480;

/**
 * Storage Guard Middleware
 * Evaluates MongoDB cluster storage metrics (storageSize + indexSize)
 * and trips a circuit breaker (HTTP 507 Insufficient Storage) if cluster approaches the 512MB free-tier ceiling.
 */
const storageGuard = async (req, res, next) => {
    try {
        const limitMb = parseFloat(process.env.STORAGE_LIMIT_MB) || DEFAULT_LIMIT_MB;
        const maxStorageBytes = limitMb * 1024 * 1024;

        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            const stats = await mongoose.connection.db.stats();
            const storageUsage = (stats.storageSize || 0) + (stats.indexSize || 0);

            if (storageUsage >= maxStorageBytes) {
                const currentUsageMb = (storageUsage / (1024 * 1024)).toFixed(2);
                return res.status(507).json({
                    error: `Storage quota exceeded: Cloud Free-Tier cluster storage usage (${currentUsageMb} MB) has reached the safe limit (${limitMb} MB).`,
                    details: {
                        code: 'STORAGE_QUOTA_EXCEEDED',
                        currentUsageMb: parseFloat(currentUsageMb),
                        limitMb,
                        requestId: req.id || 'N/A'
                    }
                });
            }
        }
        next();
    } catch (err) {
        // Fail-open: do not block legitimate requests if stats command is unsupported or temporarily fails
        console.warn('StorageGuard warning: unable to evaluate db.stats():', err.message);
        next();
    }
};

module.exports = storageGuard;
