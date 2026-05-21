// backend/src/routes/auth.js

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { isFirebaseEnabled, verifyIdToken } = require('../config/firebaseAdmin');
const {
  createUser,
  updateUser,
  findUserById,
  findUserByEmail,
  findUserByFirebaseUid,
  createPatient,
  createDoctor,
  findPatientByUserId,
  findDoctorByUserId,
} = require('../config/firebaseDb');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ================= NORMAL REGISTER =================
router.post('/register', async (req, res) => {
  const { email, password, role, name, phone, specialization, dateOfBirth } = req.body || {};

  if (!email || !password || !role || !name) {
    return res.status(400).json({ error: 'email, password, role, and name are required' });
  }

  if (!['patient', 'doctor'].includes(role)) {
    return res.status(400).json({ error: 'role must be patient or doctor' });
  }

  const existing = await findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);

  try {
    const user = await createUser({ email, password_hash: hash, role });
    if (role === 'patient') {
      await createPatient({
        user_id: user.id,
        name: name.trim(),
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
      });
    } else {
      await createDoctor({
        user_id: user.id,
        name: name.trim(),
        phone: phone || null,
        specialization: specialization || null,
      });
    }

    const publicUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    };

    return res.status(201).json({ user: publicUser, token: signToken(publicUser) });
  } catch {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ================= NORMAL LOGIN =================
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }

  const user = await findUserByEmail(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const publicUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };

  res.json({ user: publicUser, token: signToken(publicUser) });
});

router.get('/me', authMiddleware, async (req, res) => {
  const userRaw = await findUserById(String(req.user.sub));

  if (!userRaw) {
    return res.status(404).json({ error: 'User not found' });
  }
  const user = {
    id: userRaw.id,
    email: userRaw.email,
    role: userRaw.role,
    created_at: userRaw.created_at,
  };

  let profile = null;

  if (user.role === 'patient') {
    profile = (await findPatientByUserId(user.id)) || null;
  } else if (user.role === 'doctor') {
    profile = (await findDoctorByUserId(user.id)) || null;
  }

  return res.json({ user, profile });
});

// ================= FIREBASE LOGIN =================
router.post('/firebase-session', async (req, res) => {
  const { idToken } = req.body || {};

  if (!idToken) return res.status(400).json({ error: 'idToken is required' });
  if (!isFirebaseEnabled()) return res.status(503).json({ error: 'Firebase not configured' });

  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'Invalid Firebase ID token' });
  }

  const { email, uid } = decoded;

  let user = await findUserByFirebaseUid(uid);

  if (!user) {
    user = await findUserByEmail(email);

    if (user && user.firebase_uid == null) {
      user = await updateUser(user.id, { firebase_uid: uid });
    }
  }

  if (!user) {
    return res.status(404).json({
      error: 'No HMS account for this Firebase user',
      code: 'NEEDS_REGISTRATION',
    });
  }

  const publicUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };

  res.json({ user: publicUser, token: signToken(publicUser) });
});

// ================= FIREBASE REGISTER =================
router.post('/register-firebase', async (req, res) => {
  const { idToken, role, name, phone, specialization, dateOfBirth } = req.body || {};

  if (!idToken || !role || !name) {
    return res.status(400).json({ error: 'idToken, role, and name required' });
  }

  if (!['patient', 'doctor'].includes(role)) {
    return res.status(400).json({ error: 'role must be patient or doctor' });
  }

  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'Invalid Firebase ID token' });
  }

  const { email, uid } = decoded;
  const existingByUid = await findUserByFirebaseUid(uid);
  if (existingByUid) {
    return res.status(409).json({ error: 'Firebase account already linked' });
  }

  const existingByEmail = await findUserByEmail(email);
  if (existingByEmail) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(`firebase:${crypto.randomBytes(24)}`, 10);

  try {
    const user = await createUser({
      email,
      password_hash: hash,
      role,
      firebase_uid: uid,
    });

    if (role === 'patient') {
      await createPatient({
        user_id: user.id,
        name: name.trim(),
        phone: phone || null,
        date_of_birth: dateOfBirth || null,
      });
    } else {
      await createDoctor({
        user_id: user.id,
        name: name.trim(),
        phone: phone || null,
        specialization: specialization || null,
      });
    }

    const publicUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    };

    return res.status(201).json({ user: publicUser, token: signToken(publicUser) });
  } catch {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;