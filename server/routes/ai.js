const express = require('express');
const { verifyToken, verifyTripMember } = require('../middleware/auth');
const aiAssistant = require('../services/aiAssistant');

const router = express.Router();

router.post('/prompt', verifyToken, verifyTripMember, (req, res) => {
  const { tripId, prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const result = aiAssistant.processAIQuery(tripId, prompt, req.tripMember.member_id);
  res.json(result);
});

module.exports = router;
