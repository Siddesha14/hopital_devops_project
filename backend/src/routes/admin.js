const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { list, findPatientByUserId, findDoctorByUserId } = require('../config/firebaseDb');

const router = express.Router();
router.use(authMiddleware, requireRole('admin'));

router.get('/dashboard', async (req, res) => {
  const patients = (await list('patients')).length;
  const doctors = (await list('doctors')).length;
  const appointmentsRows = await list('appointments');
  const appointments = appointmentsRows.length;
  const pending = appointmentsRows.filter((x) => x.status === 'pending').length;
  const prescriptions = (await list('prescriptions')).length;
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

router.get('/users', async (req, res) => {
  const users = await list('users');
  const rows = await Promise.all(
    users.map(async (u) => {
      const patient = await findPatientByUserId(String(u.id));
      const doctor = await findDoctorByUserId(String(u.id));
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        created_at: u.created_at,
        patient_name: patient ? patient.name : null,
        doctor_name: doctor ? doctor.name : null,
      };
    })
  );
  rows.sort((a, b) => Number(a.id) - Number(b.id));
  res.json(rows);
});

module.exports = router;
