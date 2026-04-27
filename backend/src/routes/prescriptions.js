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
        `SELECT pr.*, p.name AS patient_name, d.name AS doctor_name
         FROM prescriptions pr
         JOIN patients p ON p.id = pr.patient_id
         JOIN doctors d ON d.id = pr.doctor_id
         ORDER BY pr.created_at DESC`
      )
      .all();
  } else if (role === 'patient') {
    const pid = getPatientIdForUser(req.user.sub);
    if (!pid) {
      return res.status(400).json({ error: 'Patient profile missing' });
    }
    rows = db
      .prepare(
        `SELECT pr.*, d.name AS doctor_name
         FROM prescriptions pr
         JOIN doctors d ON d.id = pr.doctor_id
         WHERE pr.patient_id = ?
         ORDER BY pr.created_at DESC`
      )
      .all(pid);
  } else if (role === 'doctor') {
    const did = getDoctorIdForUser(req.user.sub);
    if (!did) {
      return res.status(400).json({ error: 'Doctor profile missing' });
    }
    rows = db
      .prepare(
        `SELECT pr.*, p.name AS patient_name
         FROM prescriptions pr
         JOIN patients p ON p.id = pr.patient_id
         WHERE pr.doctor_id = ?
         ORDER BY pr.created_at DESC`
      )
      .all(did);
  } else {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(rows);
});

router.post('/', requireRole('doctor'), (req, res) => {
  const { patientId, medication, dosage, instructions } = req.body || {};
  if (!patientId || !medication) {
    return res.status(400).json({ error: 'patientId and medication are required' });
  }
  const doctorId = getDoctorIdForUser(req.user.sub);
  if (!doctorId) {
    return res.status(400).json({ error: 'Doctor profile missing' });
  }
  const patient = db.prepare('SELECT id FROM patients WHERE id = ?').get(patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  const info = db
    .prepare(
      `INSERT INTO prescriptions (patient_id, doctor_id, medication, dosage, instructions)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(patientId, doctorId, medication, dosage || null, instructions || null);
  const row = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(row);
});

module.exports = router;
