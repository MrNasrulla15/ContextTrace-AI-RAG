const rateLimit = require('express-rate-limit');

/**
 * Rate Limiter for GenAI query endpoint to protect Gemini API quota
 * and prevent Denial-of-Wallet attacks.
 */
const chatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 30,             // max 30 queries per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test', // skip rate limiting during automated test runs
    handler: (req, res) => {
        res.status(429).json({
            error: "Too many chat queries. Please slow down to protect GenAI quota.",
            details: {
                code: "RATE_LIMITED",
                requestId: req.id || 'N/A'
            }
        });
    }
});

module.exports = { chatLimiter };
