const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { list, findUserById, findPatientByUserId, findPatientById, updateByPath } = require('../config/firebaseDb');

const router = express.Router();
router.use(authMiddleware);

router.get('/', requireRole('admin', 'doctor'), async (req, res) => {
  const patients = await list('patients');
  const rows = await Promise.all(
    patients.map(async (p) => {
      const user = await findUserById(String(p.user_id));
      return { ...p, email: user ? user.email : null };
    })
  );
  rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  res.json(rows);
});

router.get('/me', requireRole('patient'), async (req, res) => {
  const row = await findPatientByUserId(String(req.user.sub));
  if (!row) {
    return res.status(404).json({ error: 'Patient profile not found' });
  }
  res.json(row);
});

router.get('/:id', requireRole('admin', 'doctor'), async (req, res) => {
  const base = await findPatientById(String(req.params.id));
  const user = base ? await findUserById(String(base.user_id)) : null;
  const row = base ? { ...base, email: user ? user.email : null } : null;
  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(row);
});

router.patch('/me', requireRole('patient'), async (req, res) => {
  const { name, phone, dateOfBirth } = req.body || {};
  const patient = await findPatientByUserId(String(req.user.sub));
  if (!patient) {
    return res.status(404).json({ error: 'Patient profile not found' });
  }
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (phone !== undefined) patch.phone = phone;
  if (dateOfBirth !== undefined) patch.date_of_birth = dateOfBirth;
  const updated = await updateByPath(`patients/${patient.id}`, patch);
  res.json(updated);
});

module.exports = router;
