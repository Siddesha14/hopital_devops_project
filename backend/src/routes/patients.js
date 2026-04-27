const express = require('express');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', requireRole('admin', 'doctor'), (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, u.email FROM patients p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.name`
    )
    .all();
  res.json(rows);
});

router.get('/me', requireRole('patient'), (req, res) => {
  const row = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(req.user.sub);
  if (!row) {
    return res.status(404).json({ error: 'Patient profile not found' });
  }
  res.json(row);
});

router.get('/:id', requireRole('admin', 'doctor'), (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, u.email FROM patients p
       JOIN users u ON u.id = p.user_id WHERE p.id = ?`
    )
    .get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(row);
});

router.patch('/me', requireRole('patient'), (req, res) => {
  const { name, phone, dateOfBirth } = req.body || {};
  const patient = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(req.user.sub);
  if (!patient) {
    return res.status(404).json({ error: 'Patient profile not found' });
  }
  db.prepare(
    `UPDATE patients SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      date_of_birth = COALESCE(?, date_of_birth)
     WHERE user_id = ?`
  ).run(name ?? null, phone ?? null, dateOfBirth ?? null, req.user.sub);
  const updated = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(req.user.sub);
  res.json(updated);
});

module.exports = router;
