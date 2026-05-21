const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { list, findUserById, findDoctorByUserId, findDoctorById, updateByPath } = require('../config/firebaseDb');

const router = express.Router();
router.use(authMiddleware);

router.get('/', requireRole('admin', 'patient'), async (req, res) => {
  const doctors = await list('doctors');
  const rows = await Promise.all(
    doctors.map(async (d) => {
      const user = await findUserById(String(d.user_id));
      return { ...d, email: user ? user.email : null };
    })
  );
  rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  res.json(rows);
});

router.get('/me', requireRole('doctor'), async (req, res) => {
  const row = await findDoctorByUserId(String(req.user.sub));
  if (!row) {
    return res.status(404).json({ error: 'Doctor profile not found' });
  }
  res.json(row);
});

router.get('/:id', requireRole('admin', 'patient'), async (req, res) => {
  const base = await findDoctorById(String(req.params.id));
  const user = base ? await findUserById(String(base.user_id)) : null;
  const row = base ? { ...base, email: user ? user.email : null } : null;
  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(row);
});

router.patch('/me', requireRole('doctor'), async (req, res) => {
  const { name, phone, specialization } = req.body || {};
  const doctor = await findDoctorByUserId(String(req.user.sub));
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor profile not found' });
  }
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (phone !== undefined) patch.phone = phone;
  if (specialization !== undefined) patch.specialization = specialization;
  const updated = await updateByPath(`doctors/${doctor.id}`, patch);
  res.json(updated);
});

module.exports = router;
