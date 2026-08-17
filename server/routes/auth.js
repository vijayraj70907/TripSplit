const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register / Sign Up
router.post('/register', (req, res) => {
  const { name, email, password, avatar_url } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: 'An account with this email already exists' });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);
  const avatar = avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

  const stmt = db.prepare('INSERT INTO users (name, email, password_hash, avatar_url) VALUES (?, ?, ?, ?)');
  const info = stmt.run(name, email.toLowerCase(), password_hash, avatar);

  const token = jwt.sign({ id: info.lastInsertRowid, email: email.toLowerCase(), name }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    user: { id: info.lastInsertRowid, name, email: email.toLowerCase(), avatar_url: avatar },
    token
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url },
    token
  });
});

// Forgot Password (mock verification)
router.post('/forgot-password', (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email and new password are required' });
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User with this email was not found' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(newPassword, salt);

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(password_hash, user.id);

  res.json({ message: 'Password updated successfully. You can now login with your new password.' });
});

// Get current user profile
router.get('/me', verifyToken, (req, res) => {
  const user = db.prepare('SELECT id, name, email, avatar_url, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// Update Profile
router.put('/profile', verifyToken, (req, res) => {
  const { name, avatar_url } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.prepare('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?').run(name, avatar_url, req.user.id);

  // Also update display_name in trip_members where matching user_id
  db.prepare('UPDATE trip_members SET display_name = ?, avatar_url = ? WHERE user_id = ?').run(name, avatar_url, req.user.id);

  res.json({ message: 'Profile updated successfully', user: { id: req.user.id, name, email: req.user.email, avatar_url } });
});

module.exports = router;
