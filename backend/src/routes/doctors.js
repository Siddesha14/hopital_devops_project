const express = require('express');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/', requireRole('admin', 'patient'), (req, res) => {
  const rows = db
    .prepare(
      `SELECT d.*, u.email FROM doctors d
       JOIN users u ON u.id = d.user_id
       ORDER BY d.name`
    )
    .all();
  res.json(rows);
});

router.get('/me', requireRole('doctor'), (req, res) => {
  const row = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(req.user.sub);
  if (!row) {
    return res.status(404).json({ error: 'Doctor profile not found' });
  }
  res.json(row);
});

router.get('/:id', requireRole('admin', 'patient'), (req, res) => {
  const row = db
    .prepare(
      `SELECT d.*, u.email FROM doctors d
       JOIN users u ON u.id = d.user_id WHERE d.id = ?`
    )
    .get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(row);
});

router.patch('/me', requireRole('doctor'), (req, res) => {
  const { name, phone, specialization } = req.body || {};
  const doctor = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(req.user.sub);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor profile not found' });
  }
  db.prepare(
    `UPDATE doctors SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      specialization = COALESCE(?, specialization)
     WHERE user_id = ?`
  ).run(name ?? null, phone ?? null, specialization ?? null, req.user.sub);
  const updated = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(req.user.sub);
  res.json(updated);
});

module.exports = router;
