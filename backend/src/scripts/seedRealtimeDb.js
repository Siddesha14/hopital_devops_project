require('dotenv').config();
const bcrypt = require('bcryptjs');
const { isFirebaseEnabled } = require('../config/firebaseAdmin');
const { ensureSchema } = require('../services/dbSchema');
const {
  findUserByEmail,
  createUser,
  createPatient,
  createDoctor,
  findPatientByUserId,
  findDoctorByUserId,
} = require('../config/firebaseDb');

async function ensureDemoUser({ email, role, name, password, phone, specialization, date_of_birth }) {
  let user = await findUserByEmail(email);
  if (!user) {
    user = await createUser({
      email,
      password_hash: bcrypt.hashSync(password, 10),
      role,
    });
  }

  if (role === 'patient') {
    const existing = await findPatientByUserId(String(user.id));
    if (!existing) {
      await createPatient({
        user_id: user.id,
        name,
        phone: phone || null,
        date_of_birth: date_of_birth || null,
      });
    }
  }

  if (role === 'doctor') {
    const existing = await findDoctorByUserId(String(user.id));
    if (!existing) {
      await createDoctor({
        user_id: user.id,
        name,
        phone: phone || null,
        specialization: specialization || null,
      });
    }
  }
}

async function main() {
  if (!isFirebaseEnabled()) {
    throw new Error('Firebase Admin is not configured. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON.');
  }

  await ensureSchema();

  await ensureDemoUser({
    email: 'patient@hms.local',
    role: 'patient',
    name: 'Demo Patient',
    password: 'patient123',
    phone: '+910000000001',
    date_of_birth: '1995-01-01',
  });

  await ensureDemoUser({
    email: 'doctor@hms.local',
    role: 'doctor',
    name: 'Demo Doctor',
    password: 'doctor123',
    phone: '+910000000002',
    specialization: 'General Medicine',
  });

  console.log('Realtime Database seed complete.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
