const express = require('express');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function getPatientIdForUser(userId) {
  const p = db.prepare('SELECT id FROM patients WHERE user_id = ?').get(userId);
  return p ? p.id : null;
}

function getDoctorIdForUser(userId) {
  const d = db.prepare('SELECT id FROM doctors WHERE user_id = ?').get(userId);
  return d ? d.id : null;
}

router.get('/', (req, res) => {
  const role = req.user.role;
  let rows;
  if (role === 'admin') {
    rows = db
      .prepare(
        `SELECT a.*,
          p.name AS patient_name, pd.email AS patient_email,
          d.name AS doctor_name, dd.email AS doctor_email
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         JOIN users pd ON pd.id = p.user_id
         JOIN doctors d ON d.id = a.doctor_id
         JOIN users dd ON dd.id = d.user_id
         ORDER BY a.scheduled_at DESC`
      )
      .all();
  } else if (role === 'patient') {
    const pid = getPatientIdForUser(req.user.sub);
    if (!pid) {
      return res.status(400).json({ error: 'Patient profile missing' });
    }
    rows = db
      .prepare(
        `SELECT a.*, d.name AS doctor_name, d.specialization
         FROM appointments a
         JOIN doctors d ON d.id = a.doctor_id
         WHERE a.patient_id = ?
         ORDER BY a.scheduled_at DESC`
      )
      .all(pid);
  } else if (role === 'doctor') {
    const did = getDoctorIdForUser(req.user.sub);
    if (!did) {
      return res.status(400).json({ error: 'Doctor profile missing' });
    }
    rows = db
      .prepare(
        `SELECT a.*, p.name AS patient_name
         FROM appointments a
         JOIN patients p ON p.id = a.patient_id
         WHERE a.doctor_id = ?
         ORDER BY a.scheduled_at DESC`
      )
      .all(did);
  } else {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(rows);
});

router.post('/', requireRole('patient'), (req, res) => {
  const { doctorId, scheduledAt, notes } = req.body || {};
  if (!doctorId || !scheduledAt) {
    return res.status(400).json({ error: 'doctorId and scheduledAt are required' });
  }
  const patientId = getPatientIdForUser(req.user.sub);
  if (!patientId) {
    return res.status(400).json({ error: 'Patient profile missing' });
  }
  const doctor = db.prepare('SELECT id FROM doctors WHERE id = ?').get(doctorId);
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  const info = db
    .prepare(
      `INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, notes)
       VALUES (?, ?, ?, 'pending', ?)`
    )
    .run(patientId, doctorId, scheduledAt, notes || null);
  const row = db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.patch('/:id/status', requireRole('doctor'), (req, res) => {
  const { status } = req.body || {};
  if (!['approved', 'rejected', 'completed', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const doctorId = getDoctorIdForUser(req.user.sub);
  if (!doctorId) {
    return res.status(400).json({ error: 'Doctor profile missing' });
  }
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!appt || appt.doctor_id !== doctorId) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
