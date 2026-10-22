/**
 * Environment configuration validator.
 * Validates presence and format of required variables without exposing secret values.
 */

function validateEnv() {
    const requiredVars = ['MONGO_URI', 'GEMINI_API_KEY'];
    const missing = [];

    for (const key of requiredVars) {
        if (!process.env[key] || !process.env[key].trim()) {
            missing.push(key);
        }
    }

    if (missing.length > 0) {
        const errorMsg = `FATAL: Missing required environment variable(s): ${missing.join(', ')}. Please check your .env file.`;
        console.error(errorMsg);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
        throw new Error(errorMsg);
    }

    const port = parseInt(process.env.PORT, 10);
    if (process.env.PORT && (isNaN(port) || port <= 0 || port > 65535)) {
        console.warn(`WARNING: Invalid PORT "${process.env.PORT}" specified. Falling back to default port 5000.`);
    }

    return {
        port: port || 5000,
        mongoUri: process.env.MONGO_URI,
        geminiApiKey: process.env.GEMINI_API_KEY,
        nodeEnv: process.env.NODE_ENV || 'development'
    };
}

module.exports = { validateEnv };
