const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  list,
  findPatientByUserId,
  findDoctorByUserId,
  findDoctorById,
  findPatientById,
  findUserById,
  findAppointmentById,
  createAppointment,
  updateByPath,
} = require('../config/firebaseDb');

const router = express.Router();
router.use(authMiddleware);

async function getPatientIdForUser(userId) {
  const p = await findPatientByUserId(String(userId));
  return p ? p.id : null;
}

async function getDoctorIdForUser(userId) {
  const d = await findDoctorByUserId(String(userId));
  return d ? d.id : null;
}

router.get('/', async (req, res) => {
  const role = req.user.role;
  const appointments = await list('appointments');
  let rows;
  if (role === 'admin') {
    rows = await Promise.all(
      appointments.map(async (a) => {
        const patient = await findPatientById(String(a.patient_id));
        const doctor = await findDoctorById(String(a.doctor_id));
        const patientUser = patient ? await findUserById(String(patient.user_id)) : null;
        const doctorUser = doctor ? await findUserById(String(doctor.user_id)) : null;
        return {
          ...a,
          patient_name: patient ? patient.name : null,
          patient_email: patientUser ? patientUser.email : null,
          doctor_name: doctor ? doctor.name : null,
          doctor_email: doctorUser ? doctorUser.email : null,
        };
      })
    );
  } else if (role === 'patient') {
    const pid = await getPatientIdForUser(req.user.sub);
    if (!pid) {
      return res.status(400).json({ error: 'Patient profile missing' });
    }
    rows = await Promise.all(
      appointments
        .filter((a) => String(a.patient_id) === String(pid))
        .map(async (a) => {
          const doctor = await findDoctorById(String(a.doctor_id));
          return {
            ...a,
            doctor_name: doctor ? doctor.name : null,
            specialization: doctor ? doctor.specialization : null,
          };
        })
    );
  } else if (role === 'doctor') {
    const did = await getDoctorIdForUser(req.user.sub);
    if (!did) {
      return res.status(400).json({ error: 'Doctor profile missing' });
    }
    rows = await Promise.all(
      appointments
        .filter((a) => String(a.doctor_id) === String(did))
        .map(async (a) => {
          const patient = await findPatientById(String(a.patient_id));
          return {
            ...a,
            patient_name: patient ? patient.name : null,
          };
        })
    );
  } else {
    return res.status(403).json({ error: 'Forbidden' });
  }
  rows.sort((a, b) => new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0));
  res.json(rows);
});

router.post('/', requireRole('patient'), async (req, res) => {
  const { doctorId, scheduledAt, notes } = req.body || {};
  if (!doctorId || !scheduledAt) {
    return res.status(400).json({ error: 'doctorId and scheduledAt are required' });
  }
  const patientId = await getPatientIdForUser(req.user.sub);
  if (!patientId) {
    return res.status(400).json({ error: 'Patient profile missing' });
  }
  const doctor = await findDoctorById(String(doctorId));
  if (!doctor) {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  const row = await createAppointment({
    patient_id: patientId,
    doctor_id: doctorId,
    scheduled_at: scheduledAt,
    status: 'pending',
    notes: notes || null,
  });
  res.status(201).json(row);
});

router.patch('/:id/status', requireRole('doctor'), async (req, res) => {
  const { status } = req.body || {};
  if (!['approved', 'rejected', 'completed', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const doctorId = await getDoctorIdForUser(req.user.sub);
  if (!doctorId) {
    return res.status(400).json({ error: 'Doctor profile missing' });
  }
  const appt = await findAppointmentById(String(req.params.id));
  if (!appt || String(appt.doctor_id) !== String(doctorId)) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  const updated = await updateByPath(`appointments/${req.params.id}`, { status });
  res.json(updated);
});

module.exports = router;
