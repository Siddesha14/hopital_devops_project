const { db, createUser, findUserByEmail } = require('../config/firebaseDb');
const bcrypt = require('bcryptjs');

async function ensureSchema() {
  const countersRef = db().ref('meta/counters');
  const countersSnap = await countersRef.once('value');
  if (!countersSnap.val()) {
    await countersRef.set({
      users: 0,
      patients: 0,
      doctors: 0,
      appointments: 0,
      prescriptions: 0,
    });
  }

  const existingAdmin = await findUserByEmail('admin@hms.local');
  if (!existingAdmin) {
    const hash = bcrypt.hashSync('admin123', 10);
    await createUser({
      email: 'admin@hms.local',
      password_hash: hash,
      role: 'admin',
    });
  }
}

module.exports = { ensureSchema };
