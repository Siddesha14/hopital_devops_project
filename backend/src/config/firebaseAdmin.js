const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let initialized = false;
let inferredDatabaseUrl = '';

function buildDatabaseUrl(credentials) {
  if (process.env.FIREBASE_DATABASE_URL && process.env.FIREBASE_DATABASE_URL.trim()) {
    return process.env.FIREBASE_DATABASE_URL.trim();
  }
  if (credentials && credentials.project_id) {
    return `https://${credentials.project_id}-default-rtdb.firebaseio.com`;
  }
  return '';
}

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
      inferredDatabaseUrl = buildDatabaseUrl(credentials);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        databaseURL: inferredDatabaseUrl || undefined,
      });
      initialized = true;
      return true;
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT_JSON parse failed:', e.message);
      return false;
    }
  }

  try {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const fallbackPath = path.join(__dirname, '..', '..', 'firebase.json');
    const chosenPath = credPath && fs.existsSync(credPath) ? credPath : (fs.existsSync(fallbackPath) ? fallbackPath : '');
    if (chosenPath) {
      const raw = fs.readFileSync(chosenPath, 'utf8');
      const credentials = JSON.parse(raw);
      inferredDatabaseUrl = buildDatabaseUrl(credentials);
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        databaseURL: inferredDatabaseUrl || undefined,
      });
      initialized = true;
      return true;
    }

    inferredDatabaseUrl = process.env.FIREBASE_DATABASE_URL || '';
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: inferredDatabaseUrl || undefined,
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
