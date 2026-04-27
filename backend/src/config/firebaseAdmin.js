const admin = require('firebase-admin');

let initialized = false;

/**
 * Initialize Firebase Admin from JSON in FIREBASE_SERVICE_ACCOUNT_JSON
 * (full service account object as a single-line JSON string), or from
 * GOOGLE_APPLICATION_CREDENTIALS pointing to a key file.
 */
function initFirebaseAdmin() {
  if (initialized) {
    return admin.apps.length > 0;
  }
  if (admin.apps.length > 0) {
    initialized = true;
    return true;
  }

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json && json.trim()) {
    try {
      const credentials = JSON.parse(json);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
      initialized = true;
      return true;
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON parse failed:', e.message);
      return false;
    }
  }

  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    initialized = true;
    return true;
  } catch (e) {
    return false;
  }
}

function isFirebaseEnabled() {
  return initFirebaseAdmin();
}

async function verifyIdToken(idToken) {
  if (!isFirebaseEnabled()) {
    const err = new Error('Firebase Admin is not configured');
    err.code = 'FIREBASE_DISABLED';
    throw err;
  }
  return admin.auth().verifyIdToken(idToken);
}

module.exports = { admin, initFirebaseAdmin, isFirebaseEnabled, verifyIdToken };
