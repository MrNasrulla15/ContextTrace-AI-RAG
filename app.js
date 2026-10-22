/**
 * ContextTrace AI — Root Application Proxy
 * Re-exports the modular Express application from backend/app.js
 * Ensures 100% backward compatibility for tests and tooling.
 */
module.exports = require('./backend/app');