require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/checkins', require('./src/routes/checkins'));
app.use('/api/quarterly', require('./src/routes/quarterly'));
app.use('/api/export', require('./src/routes/export'));

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

initDB()
  .then(() => app.listen(PORT, () => console.log(`Amón running on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
