require('dotenv').config();
const app = require('./backend/app');
const { validateEnv } = require('./backend/config/env');
// Validate environment variables on startup
const envConfig = validateEnv();

const PORT = envConfig.port || process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`ContextTrace AI Production Server is running on port ${PORT}`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
    });
});

module.exports = server;
