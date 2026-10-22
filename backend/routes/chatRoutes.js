const express = require('express');
const router = express.Router();
const Controller = require('../controllers/chatController');

router.post('/ask', Controller.askQuestion);
router.get('/history', Controller.getChatHistory);
router.get('/history/:id', Controller.getChatById);

module.exports = router;
