require('dotenv').config();
const express = require('express');
const cors = require('cors');

const db = require('./db');
const { getPoolStats } = require('./pools');
const { hashPassword, verifyPassword, issueToken, authMiddleware } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---- Health ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---- Pool stats (public, no auth — matches the "honest live data" public site) ----
// GET /api/stats/ckpool/:address
// GET /api/stats/2miners/:coin/:address
// GET /api/stats/molepool/:address   -> currently returns unverified_api status
// GET /api/stats/mysolopool/:address -> currently returns unverified_api status
app.get('/api/stats/2miners/:coin/:address', async (req, res) => {
  const result = await getPoolStats(db, '2miners', req.params.address, req.params.coin);
  res.json(result);
});

app.get('/api/stats/:pool/:address', async (req, res) => {
  const { pool, address } = req.params;
  const result = await getPoolStats(db, pool, address);
  res.json(result);
});

// ---- Auth ----
app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'Email and password (min 8 chars) required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Account already exists' });

  const password_hash = hashPassword(password);
  const info = db
    .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(email, password_hash);

  const user = { id: info.lastInsertRowid, email };
  res.status(201).json({ token: issueToken(user), user: { id: user.id, email: user.email } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: issueToken(user), user: { id: user.id, email: user.email } });
});

app.get('/api/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, payout_address, created_at FROM users WHERE id = ?').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

app.put('/api/me/payout-address', authMiddleware, (req, res) => {
  const { payout_address } = req.body || {};
  if (!payout_address) return res.status(400).json({ error: 'payout_address required' });
  db.prepare('UPDATE users SET payout_address = ? WHERE id = ?').run(payout_address, req.user.sub);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`BeeHash backend listening on :${PORT}`);
});
