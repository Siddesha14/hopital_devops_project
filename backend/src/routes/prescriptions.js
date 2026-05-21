const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  list,
  findPatientByUserId,
  findDoctorByUserId,
  findPatientById,
  findDoctorById,
  createPrescription,
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
  const prescriptions = await list('prescriptions');
  let rows;
  if (role === 'admin') {
    rows = await Promise.all(
      prescriptions.map(async (pr) => {
        const patient = await findPatientById(String(pr.patient_id));
        const doctor = await findDoctorById(String(pr.doctor_id));
        return { ...pr, patient_name: patient ? patient.name : null, doctor_name: doctor ? doctor.name : null };
      })
    );
  } else if (role === 'patient') {
    const pid = await getPatientIdForUser(req.user.sub);
    if (!pid) {
      return res.status(400).json({ error: 'Patient profile missing' });
    }
    rows = await Promise.all(
      prescriptions
        .filter((pr) => String(pr.patient_id) === String(pid))
        .map(async (pr) => {
          const doctor = await findDoctorById(String(pr.doctor_id));
          return { ...pr, doctor_name: doctor ? doctor.name : null };
        })
    );
  } else if (role === 'doctor') {
    const did = await getDoctorIdForUser(req.user.sub);
    if (!did) {
      return res.status(400).json({ error: 'Doctor profile missing' });
    }
    rows = await Promise.all(
      prescriptions
        .filter((pr) => String(pr.doctor_id) === String(did))
        .map(async (pr) => {
          const patient = await findPatientById(String(pr.patient_id));
          return { ...pr, patient_name: patient ? patient.name : null };
        })
    );
  } else {
    return res.status(403).json({ error: 'Forbidden' });
  }
  rows.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  res.json(rows);
});

router.post('/', requireRole('doctor'), async (req, res) => {
  const { patientId, medication, dosage, instructions } = req.body || {};
  if (!patientId || !medication) {
    return res.status(400).json({ error: 'patientId and medication are required' });
  }
  const doctorId = await getDoctorIdForUser(req.user.sub);
  if (!doctorId) {
    return res.status(400).json({ error: 'Doctor profile missing' });
  }
  const patient = await findPatientById(String(patientId));
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  const row = await createPrescription({
    patient_id: patientId,
    doctor_id: doctorId,
    medication,
    dosage: dosage || null,
    instructions: instructions || null,
  });
  res.status(201).json(row);
});

module.exports = router;
