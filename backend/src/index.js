require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { isFirebaseEnabled } = require('./config/firebaseAdmin');
const { ensureSchema } = require('./services/dbSchema');

const authRoutes = require('./routes/auth');
const patientsRoutes = require('./routes/patients');
const doctorsRoutes = require('./routes/doctors');
const appointmentsRoutes = require('./routes/appointments');
const prescriptionsRoutes = require('./routes/prescriptions');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hms-backend' });
});

app.use('/auth', authRoutes);
app.use('/patients', patientsRoutes);
app.use('/doctors', doctorsRoutes);
app.use('/appointments', appointmentsRoutes);
app.use('/prescriptions', prescriptionsRoutes);
app.use('/ai', aiRoutes);
app.use('/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  if (isFirebaseEnabled()) {
    await ensureSchema();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HMS API listening on port ${PORT}`);
    console.log(
      isFirebaseEnabled()
        ? 'Firebase Admin: enabled (Realtime DB storage active)'
        : 'Firebase Admin: disabled — set FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS'
    );
  });
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
