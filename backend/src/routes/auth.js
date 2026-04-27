const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');
const { isFirebaseEnabled, verifyIdToken } = require('../config/firebaseAdmin');

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

router.post('/register', (req, res) => {
  const { email, password, role, name, phone, specialization, dateOfBirth } = req.body || {};
  if (!email || !password || !role || !name) {
    return res.status(400).json({ error: 'email, password, role, and name are required' });
  }
  if (!['patient', 'doctor'].includes(role)) {
    return res.status(400).json({ error: 'role must be patient or doctor' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const insertUser = db.transaction(() => {
    const info = db
      .prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)')
      .run(email, hash, role);
    const userId = info.lastInsertRowid;
    if (role === 'patient') {
      db.prepare(
        'INSERT INTO patients (user_id, name, phone, date_of_birth) VALUES (?, ?, ?, ?)'
      ).run(userId, name, phone || null, dateOfBirth || null);
    } else {
      db.prepare(
        'INSERT INTO doctors (user_id, name, phone, specialization) VALUES (?, ?, ?, ?)'
      ).run(userId, name, phone || null, specialization || null);
    }
    return userId;
  });

  try {
    const userId = insertUser();
    const user = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?').get(userId);
    const token = signToken(user);
    return res.status(201).json({ user, token });
  } catch (e) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const publicUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };
  const token = signToken(publicUser);
  res.json({ user: publicUser, token });
});

function placeholderPasswordHash() {
  return bcrypt.hashSync(`firebase:${crypto.randomBytes(24).toString('hex')}`, 10);
}

router.post('/firebase-session', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }
  if (!isFirebaseEnabled()) {
    return res.status(503).json({ error: 'Firebase Auth is not configured on the server' });
  }
  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'Invalid Firebase ID token' });
  }
  const email = decoded.email;
  const uid = decoded.uid;
  if (!email) {
    return res.status(400).json({ error: 'Firebase account must have an email' });
  }

  let user = db.prepare('SELECT * FROM users WHERE firebase_uid = ?').get(uid);
  if (!user) {
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (user && user.firebase_uid == null) {
      db.prepare('UPDATE users SET firebase_uid = ? WHERE id = ?').run(uid, user.id);
      user.firebase_uid = uid;
    }
  }

  if (!user) {
    return res.status(404).json({
      error: 'No HMS account for this Firebase user. Register in the app first.',
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

router.post('/register-firebase', async (req, res) => {
  const { idToken, role, name, phone, specialization, dateOfBirth } = req.body || {};
  if (!idToken || !role || !name) {
    return res.status(400).json({ error: 'idToken, role, and name are required' });
  }
  if (!['patient', 'doctor'].includes(role)) {
    return res.status(400).json({ error: 'role must be patient or doctor' });
  }
  if (!isFirebaseEnabled()) {
    return res.status(503).json({ error: 'Firebase Auth is not configured on the server' });
  }
  let decoded;
  try {
    decoded = await verifyIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'Invalid Firebase ID token' });
  }
  const email = decoded.email;
  const uid = decoded.uid;
  if (!email) {
    return res.status(400).json({ error: 'Firebase account must have an email' });
  }

  const byUid = db.prepare('SELECT id FROM users WHERE firebase_uid = ?').get(uid);
  if (byUid) {
    return res.status(409).json({ error: 'This Firebase account is already registered' });
  }
  const byEmail = db.prepare('SELECT id, firebase_uid FROM users WHERE email = ?').get(email);
  if (byEmail) {
    if (byEmail.firebase_uid === uid) {
      const user = db
        .prepare('SELECT id, email, role, created_at FROM users WHERE id = ?')
        .get(byEmail.id);
      return res.status(200).json({ user, token: signToken(user) });
    }
    if (byEmail.firebase_uid && byEmail.firebase_uid !== uid) {
      return res.status(409).json({ error: 'Email already registered with another account' });
    }
    if (!byEmail.firebase_uid) {
      db.prepare('UPDATE users SET firebase_uid = ? WHERE id = ?').run(uid, byEmail.id);
      const user = db
        .prepare('SELECT id, email, role, created_at FROM users WHERE id = ?')
        .get(byEmail.id);
      return res.status(200).json({ user, token: signToken(user) });
    }
  }

  const hash = placeholderPasswordHash();
  const insertUser = db.transaction(() => {
    const info = db
      .prepare(
        'INSERT INTO users (email, password_hash, role, firebase_uid) VALUES (?, ?, ?, ?)'
      )
      .run(email, hash, role, uid);
    const userId = info.lastInsertRowid;
    if (role === 'patient') {
      db.prepare(
        'INSERT INTO patients (user_id, name, phone, date_of_birth) VALUES (?, ?, ?, ?)'
      ).run(userId, name, phone || null, dateOfBirth || null);
    } else {
      db.prepare(
        'INSERT INTO doctors (user_id, name, phone, specialization) VALUES (?, ?, ?, ?)'
      ).run(userId, name, phone || null, specialization || null);
    }
    return userId;
  });

  try {
    const userId = insertUser();
    const user = db.prepare('SELECT id, email, role, created_at FROM users WHERE id = ?').get(userId);
    const token = signToken(user);
    return res.status(201).json({ user, token });
  } catch (e) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db
    .prepare('SELECT id, email, role, created_at FROM users WHERE id = ?')
    .get(req.user.sub);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  let profile = null;
  if (user.role === 'patient') {
    profile = db.prepare('SELECT * FROM patients WHERE user_id = ?').get(user.id);
  } else if (user.role === 'doctor') {
    profile = db.prepare('SELECT * FROM doctors WHERE user_id = ?').get(user.id);
  }
  res.json({ user, profile });
});

module.exports = router;
