const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { diagnose } = require('../services/aiDiagnosis');

const router = express.Router();
router.use(authMiddleware);

router.post('/diagnose', (req, res) => {
  const { symptoms } = req.body || {};
  if (symptoms === undefined || symptoms === null) {
    return res.status(400).json({ error: 'symptoms field is required' });
  }
  const result = diagnose(String(symptoms));
  res.json(result);
});

module.exports = router;
