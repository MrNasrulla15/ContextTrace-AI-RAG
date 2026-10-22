const crypto = require('crypto');

/**
 * Middleware to assign or propagate a unique request correlation ID
 * and track request latency safely.
 */
function requestIdMiddleware(req, res, next) {
    // Propagate incoming X-Request-Id if provided by an upstream proxy, or generate new UUID
    const incomingId = req.headers['x-request-id'];
    const correlationId = (typeof incomingId === 'string' && incomingId.trim()) 
        ? incomingId.trim() 
        : crypto.randomUUID();

    req.id = correlationId;
    res.setHeader('X-Request-Id', correlationId);

    const startHrTime = process.hrtime();

    res.on('finish', () => {
        const elapsedHrTime = process.hrtime(startHrTime);
        const elapsedMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
        
        // Safe, privacy-preserving structured access log (no sensitive payload or prompts)
        if (process.env.NODE_ENV !== 'test') {
            console.log(`[${correlationId}] ${req.method} ${req.originalUrl || req.url} -> ${res.statusCode} (${elapsedMs}ms)`);
        }
    });

    next();
}

module.exports = requestIdMiddleware;
