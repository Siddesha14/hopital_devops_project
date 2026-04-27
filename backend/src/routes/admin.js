const express = require('express');
const db = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware, requireRole('admin'));

router.get('/dashboard', (req, res) => {
  const patients = db.prepare('SELECT COUNT(*) AS c FROM patients').get().c;
  const doctors = db.prepare('SELECT COUNT(*) AS c FROM doctors').get().c;
  const appointments = db.prepare('SELECT COUNT(*) AS c FROM appointments').get().c;
  const pending = db
    .prepare("SELECT COUNT(*) AS c FROM appointments WHERE status = 'pending'")
    .get().c;
  const prescriptions = db.prepare('SELECT COUNT(*) AS c FROM prescriptions').get().c;
  res.json({
    counts: {
      patients,
      doctors,
      appointments,
      pendingAppointments: pending,
      prescriptions,
    },
    generatedAt: new Date().toISOString(),
  });
});

router.get('/users', (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.email, u.role, u.created_at,
        p.name AS patient_name, d.name AS doctor_name
       FROM users u
       LEFT JOIN patients p ON p.user_id = u.id
       LEFT JOIN doctors d ON d.user_id = u.id
       ORDER BY u.id`
    )
    .all();
  res.json(rows);
});

module.exports = router;
