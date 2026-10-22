/**
 * Authentication Middleware for ContextTrace AI.
 * Validates incoming API keys against process.env.API_KEY if configured.
 * In development/test environments where API_KEY is unset, requests pass through.
 */

function authMiddleware(req, res, next) {
    const configuredKey = process.env.API_KEY;

    // If API_KEY is not configured in environment, permit request in open/dev mode
    if (!configuredKey || !configuredKey.trim()) {
        return next();
    }

    const providedKey = req.headers['x-api-key'] || 
        (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);

    if (!providedKey || providedKey.trim() !== configuredKey.trim()) {
        return res.status(401).json({
            error: "Unauthorized: valid API key required in 'X-API-Key' or 'Authorization: Bearer <key>' header.",
            details: {
                code: "UNAUTHORIZED",
                requestId: req.id || 'N/A'
            }
        });
    }

    next();
}

module.exports = authMiddleware;
