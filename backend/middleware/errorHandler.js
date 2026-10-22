/**
 * Standardized error handling middleware.
 * Formats errors into a consistent structure with request correlation ID
 * and suppresses stack traces in non-development environments.
 */
function errorHandler(err, req, res, next) {
    const statusCode = err.status || err.statusCode || 500;
    const requestId = req.id || 'N/A';

    const errorResponse = {
        error: statusCode === 500 && process.env.NODE_ENV === 'production'
            ? 'An unexpected internal server error occurred'
            : err.message || 'Internal Server Error',
        details: {
            code: err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'BAD_REQUEST' : 'INTERNAL_ERROR'),
            requestId: requestId
        }
    };

    if (process.env.NODE_ENV === 'development' && err.stack) {
        errorResponse.details.stack = err.stack;
    }

    if (statusCode >= 500) {
        console.error(`[${requestId}] ERROR:`, err.message);
    }

    res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
