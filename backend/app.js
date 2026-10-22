require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const { validateEnv } = require('./config/env');
const connectDB = require('../database/connection');
const requestIdMiddleware = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');
const { chatLimiter } = require('./middleware/rateLimiter');

// Validate environment variables on startup
const envConfig = validateEnv();

const app = express();

// Security HTTP headers with CSP configured for UI assets
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:"],
            connectSrc: ["'self'"]
        }
    }
}));

// Serve static frontend assets from frontend/public
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Cross-Origin Resource Sharing
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Tenant-Id', 'X-Request-Id']
}));

// Correlation ID and request tracing
app.use(requestIdMiddleware);

// Middleware to parse JSON bodies with a safe size limit
app.use(express.json({ limit: '1mb' }));

// Connect to MongoDB (only auto-connect when running as main server)
if (process.env.NODE_ENV !== 'test') {
    connectDB();
}

// Health check endpoint (public)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'ContextTrace AI',
        timestamp: new Date().toISOString(),
        requestId: req.id
    });
});

// Protect GenAI query endpoint against excessive quota consumption
app.use('/api/chat/ask', chatLimiter);

// Application Routes with Authentication Guard
app.use('/api/content', authMiddleware, require('./routes/contentRoutes'));
app.use('/api/chat', authMiddleware, require('./routes/chatRoutes'));

// 404 handler for unmatched routes
app.use((req, res, next) => {
    const error = new Error(`Cannot ${req.method} ${req.originalUrl}`);
    error.status = 404;
    error.code = 'NOT_FOUND';
    next(error);
});

// Centralized standardized error handling middleware
app.use(errorHandler);

// Start server if executed directly
if (require.main === module) {
    const PORT = envConfig.port;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;