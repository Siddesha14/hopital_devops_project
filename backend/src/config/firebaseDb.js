const { admin, isFirebaseEnabled } = require('./firebaseAdmin');

function ensureEnabled() {
  if (!isFirebaseEnabled()) {
    const err = new Error('Firebase is not configured');
    err.code = 'FIREBASE_DISABLED';
    throw err;
  }
}

function db() {
  ensureEnabled();
  return admin.database();
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, ',');
}

async function nextId(counterName) {
  const counterRef = db().ref(`meta/counters/${counterName}`);
  const result = await counterRef.transaction((value) => (value || 0) + 1);
  return String(result.snapshot.val());
}

async function createUser({ email, password_hash, role, firebase_uid = null }) {
  const id = await nextId('users');
  const created_at = nowIso();
  const user = { id, email, password_hash, role, firebase_uid, created_at };

  await db().ref(`users/${id}`).set(user);
  await db().ref(`indexes/usersByEmail/${sanitizeEmail(email)}`).set(id);
  if (firebase_uid) {
    await db().ref(`indexes/usersByFirebaseUid/${firebase_uid}`).set(id);
  }
  return user;
}

async function updateUser(id, patch) {
  const userRef = db().ref(`users/${id}`);
  const snap = await userRef.once('value');
  const current = snap.val();
  if (!current) return null;

  const next = { ...current, ...patch };
  await userRef.set(next);

  if (patch.email && patch.email !== current.email) {
    await db().ref(`indexes/usersByEmail/${sanitizeEmail(current.email)}`).remove();
    await db().ref(`indexes/usersByEmail/${sanitizeEmail(patch.email)}`).set(id);
  }

  if (patch.firebase_uid && patch.firebase_uid !== current.firebase_uid) {
    if (current.firebase_uid) {
      await db().ref(`indexes/usersByFirebaseUid/${current.firebase_uid}`).remove();
    }
    await db().ref(`indexes/usersByFirebaseUid/${patch.firebase_uid}`).set(id);
  }

  return next;
}

async function findUserById(id) {
  const snap = await db().ref(`users/${id}`).once('value');
  return snap.val();
}

async function findUserByEmail(email) {
  const idx = await db().ref(`indexes/usersByEmail/${sanitizeEmail(email)}`).once('value');
  const id = idx.val();
  if (!id) return null;
  return findUserById(id);
}

async function findUserByFirebaseUid(uid) {
  const idx = await db().ref(`indexes/usersByFirebaseUid/${uid}`).once('value');
  const id = idx.val();
  if (!id) return null;
  return findUserById(id);
}

async function createPatient({ user_id, name, phone = null, date_of_birth = null }) {
  const id = await nextId('patients');
  const patient = { id, user_id: String(user_id), name, phone, date_of_birth };
  await db().ref(`patients/${id}`).set(patient);
  await db().ref(`indexes/patientByUser/${user_id}`).set(id);
  return patient;
}

async function createDoctor({ user_id, name, phone = null, specialization = null }) {
  const id = await nextId('doctors');
  const doctor = { id, user_id: String(user_id), name, phone, specialization };
  await db().ref(`doctors/${id}`).set(doctor);
  await db().ref(`indexes/doctorByUser/${user_id}`).set(id);
  return doctor;
}

async function findPatientByUserId(userId) {
  const idx = await db().ref(`indexes/patientByUser/${userId}`).once('value');
  const id = idx.val();
  if (!id) return null;
  const snap = await db().ref(`patients/${id}`).once('value');
  return snap.val();
}

async function findDoctorByUserId(userId) {
  const idx = await db().ref(`indexes/doctorByUser/${userId}`).once('value');
  const id = idx.val();
  if (!id) return null;
  const snap = await db().ref(`doctors/${id}`).once('value');
  return snap.val();
}

async function findPatientById(id) {
  const snap = await db().ref(`patients/${id}`).once('value');
  return snap.val();
}

async function findDoctorById(id) {
  const snap = await db().ref(`doctors/${id}`).once('value');
  return snap.val();
}

async function findAppointmentById(id) {
  const snap = await db().ref(`appointments/${id}`).once('value');
  return snap.val();
}

async function list(path) {
  const snap = await db().ref(path).once('value');
  const value = snap.val() || {};
  return Object.values(value);
}

async function updateByPath(path, patch) {
  const ref = db().ref(path);
  const snap = await ref.once('value');
  const current = snap.val();
  if (!current) return null;
  const next = { ...current, ...patch };
  await ref.set(next);
  return next;
}

async function createAppointment({ patient_id, doctor_id, scheduled_at, status = 'pending', notes = null }) {
  const id = await nextId('appointments');
  const created_at = nowIso();
  const row = { id, patient_id: String(patient_id), doctor_id: String(doctor_id), scheduled_at, status, notes, created_at };
  await db().ref(`appointments/${id}`).set(row);
  return row;
}

async function createPrescription({ patient_id, doctor_id, medication, dosage = null, instructions = null }) {
  const id = await nextId('prescriptions');
  const created_at = nowIso();
  const row = { id, patient_id: String(patient_id), doctor_id: String(doctor_id), medication, dosage, instructions, created_at };
  await db().ref(`prescriptions/${id}`).set(row);
  return row;
}

module.exports = {
  db,
  nowIso,
  createUser,
  updateUser,
  findUserById,
  findUserByEmail,
  findUserByFirebaseUid,
  createPatient,
  createDoctor,
  findPatientByUserId,
  findDoctorByUserId,
  findPatientById,
  findDoctorById,
  findAppointmentById,
  createAppointment,
  createPrescription,
  list,
  updateByPath,
};
