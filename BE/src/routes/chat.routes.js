const express = require('express');
const router = express.Router();
const { chatAI } = require('../controllers/chat.controller');

// POST /api/v1/chat, /api/v1/chat/ai & /api/v1/chat/message
router.post('/', chatAI);
router.post('/ai', chatAI);
router.post('/message', chatAI);

module.exports = router;

