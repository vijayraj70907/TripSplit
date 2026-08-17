const express = require('express');
const { randomBytes } = require('crypto');
const db = require('../db');
const { verifyToken, verifyTripMember } = require('../middleware/auth');
const calculationEngine = require('../services/calculationEngine');

const router = express.Router();

function generateJoinCode(name) {
  const prefix = (name || 'TRIP').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'TRP';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${num}`;
}

function generateTripId() {
  return 'trip_' + randomBytes(8).toString('hex');
}

function broadcastTripUpdate(req, tripId, event, data) {
  const io = req.app.get('io');
  if (io) {
    io.to(tripId).emit(event, data);
  }
}

// Create Trip
router.post('/', verifyToken, (req, res) => {
  const { name, description, start_date, end_date, currency, image_url, budget_limit } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Trip name is required' });
  }

  const tripId = generateTripId();
  let code = generateJoinCode(name);

  let existing = db.prepare('SELECT id FROM trips WHERE code = ?').get(code);
  while (existing) {
    code = generateJoinCode(name);
    existing = db.prepare('SELECT id FROM trips WHERE code = ?').get(code);
  }

  const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(req.user.id);
  const tripCurrency = currency || '₹';
  const tripImg = image_url || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
  const bLimit = budget_limit ? parseFloat(budget_limit) : 50000;

  db.prepare(`
    INSERT INTO trips (id, code, name, description, start_date, end_date, currency, image_url, created_by, budget_limit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(tripId, code, name, description || '', start_date || '', end_date || '', tripCurrency, tripImg, req.user.id, bLimit);

  const memberInfo = db.prepare(`
    INSERT INTO trip_members (trip_id, user_id, display_name, avatar_url, role)
    VALUES (?, ?, ?, ?, 'owner')
  `).run(tripId, req.user.id, user.name, user.avatar_url);

  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(
    tripId, user.name, 'created_trip', `Created trip "${name}"`
  );

  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId);

  res.status(201).json({
    trip,
    memberId: memberInfo.lastInsertRowid,
    joinLink: `${req.protocol}://${req.get('host')}/join/${code}`
  });
});

// Update Trip Budget Limit
router.put('/:tripId/budget', verifyToken, verifyTripMember, (req, res) => {
  const { tripId } = req.params;
  const { budget_limit } = req.body;
  if (!budget_limit) {
    return res.status(400).json({ error: 'Budget limit is required' });
  }

  const bLimit = parseFloat(budget_limit);
  db.prepare('UPDATE trips SET budget_limit = ? WHERE id = ?').run(bLimit, tripId);

  broadcastTripUpdate(req, tripId, 'EXPENSE_UPDATED', { action: 'budget_update' });

  res.json({ message: 'Budget limit updated', budget_limit: bLimit });
});

// List user's trips
router.get('/my-trips', verifyToken, (req, res) => {
  const trips = db.prepare(`
    SELECT DISTINCT t.*, tm.role,
      (SELECT COUNT(*) FROM trip_members WHERE trip_id = t.id) as member_count
    FROM trips t
    JOIN trip_members tm ON tm.trip_id = t.id
    WHERE tm.user_id = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id);

  res.json({ trips });
});

// Preview Trip
router.get('/preview/:codeOrId', (req, res) => {
  const param = req.params.codeOrId;
  const trip = db.prepare('SELECT * FROM trips WHERE code = ? OR id = ?').get(param, param);

  if (!trip) {
    return res.status(404).json({ error: 'Trip not found with code or link provided' });
  }

  const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(trip.created_by);
  const members = db.prepare('SELECT id, display_name, avatar_url, role FROM trip_members WHERE trip_id = ?').all(trip.id);

  res.json({
    trip: {
      id: trip.id,
      code: trip.code,
      name: trip.name,
      description: trip.description,
      start_date: trip.start_date,
      end_date: trip.end_date,
      currency: trip.currency,
      image_url: trip.image_url,
      budget_limit: trip.budget_limit || 50000,
      creatorName: creator ? creator.name : 'Trip Admin',
      memberCount: members.length,
      members
    }
  });
});

// Join Trip
router.post('/join', verifyToken, (req, res) => {
  const { code, displayName } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Join code is required' });
  }

  const trip = db.prepare('SELECT * FROM trips WHERE code = ? OR id = ?').get(code, code);
  if (!trip) {
    return res.status(404).json({ error: 'Invalid trip code' });
  }

  const user = db.prepare('SELECT name, avatar_url FROM users WHERE id = ?').get(req.user.id);
  const memberName = displayName || user.name;

  const existingMember = db.prepare('SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?').get(trip.id, req.user.id);
  if (existingMember) {
    return res.json({ message: 'Already a member', tripId: trip.id, memberId: existingMember.id });
  }

  let nameCount = 1;
  let finalName = memberName;
  while (db.prepare('SELECT id FROM trip_members WHERE trip_id = ? AND display_name = ?').get(trip.id, finalName)) {
    nameCount++;
    finalName = `${memberName} ${nameCount}`;
  }

  const info = db.prepare(`
    INSERT INTO trip_members (trip_id, user_id, display_name, avatar_url, role)
    VALUES (?, ?, ?, ?, 'member')
  `).run(trip.id, req.user.id, finalName, user.avatar_url);

  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(
    trip.id, finalName, 'joined_trip', `${finalName} joined the trip`
  );

  broadcastTripUpdate(req, trip.id, 'MEMBER_JOINED', { memberId: info.lastInsertRowid, displayName: finalName });

  res.json({ message: 'Successfully joined trip!', tripId: trip.id, memberId: info.lastInsertRowid });
});

// Summary
router.get('/:tripId/summary', verifyToken, verifyTripMember, (req, res) => {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(req.params.tripId);
  const summary = calculationEngine.getTripSummary(req.params.tripId);
  const activityLogs = db.prepare('SELECT * FROM activity_logs WHERE trip_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.tripId);

  res.json({
    trip,
    currentMember: req.tripMember,
    ...summary,
    activityLogs
  });
});

// Add Guest Member
router.post('/:tripId/add-guest-member', verifyToken, verifyTripMember, (req, res) => {
  const { displayName } = req.body;
  if (!displayName) {
    return res.status(400).json({ error: 'Member name is required' });
  }

  const tripId = req.params.tripId;
  const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;

  const existing = db.prepare('SELECT id FROM trip_members WHERE trip_id = ? AND display_name = ?').get(tripId, displayName);
  if (existing) {
    return res.status(400).json({ error: 'A member with this name already exists' });
  }

  const info = db.prepare(`
    INSERT INTO trip_members (trip_id, user_id, display_name, avatar_url, role)
    VALUES (?, NULL, ?, ?, 'guest')
  `).run(tripId, displayName, avatar);

  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(
    tripId, req.tripMember.display_name, 'added_member', `Added guest member "${displayName}"`
  );

  broadcastTripUpdate(req, tripId, 'MEMBER_ADDED', { memberId: info.lastInsertRowid, displayName });

  res.status(201).json({ message: 'Member added successfully', memberId: info.lastInsertRowid });
});

// Rename Member
router.put('/:tripId/members/:memberId', verifyToken, verifyTripMember, (req, res) => {
  const { tripId, memberId } = req.params;
  const { displayName } = req.body;
  if (!displayName || !displayName.trim()) {
    return res.status(400).json({ error: 'Display name is required' });
  }

  const memberNum = Number(memberId);
  const existing = db.prepare('SELECT id FROM trip_members WHERE trip_id = ? AND display_name = ?').get(tripId, displayName.trim());
  if (existing && existing.id !== memberNum) {
    return res.status(400).json({ error: 'A member with this name already exists' });
  }

  db.prepare('UPDATE trip_members SET display_name = ? WHERE id = ?').run(displayName.trim(), memberNum);

  // Broadcast update
  broadcastTripUpdate(req, tripId, 'EXPENSE_UPDATED', { action: 'rename_member', memberId: memberNum, displayName: displayName.trim() });

  res.json({ message: 'Member renamed successfully' });
});

// Delete Member
router.delete('/:tripId/members/:memberId', verifyToken, verifyTripMember, (req, res) => {
  const { tripId, memberId } = req.params;
  const memberNum = Number(memberId);

  // Fetch member info
  const store = db._getStore();
  const tm = store.trip_members.find(x => x.id === memberNum);
  if (!tm) {
    return res.status(404).json({ error: 'Member not found' });
  }

  // Enforce validation: Owner cannot be deleted
  if (tm.role === 'owner') {
    return res.status(400).json({ error: 'Cannot delete the trip owner/creator' });
  }

  // Enforce validation: Check if member has transactions/expenses recorded
  const hasPayments = store.expense_payers.some(ep => ep.member_id === memberNum);
  const hasParticipation = store.expense_participants.some(ep => ep.member_id === memberNum);
  const hasSettlements = store.settlements.some(s => s.payer_member_id === memberNum || s.payee_member_id === memberNum);

  if (hasPayments || hasParticipation || hasSettlements) {
    return res.status(400).json({ error: 'Cannot delete member with recorded expenses or settlements. Please delete their expenses first.' });
  }

  // Run delete
  db.prepare('DELETE FROM trip_members WHERE id = ?').run(memberNum);

  // Broadcast update
  broadcastTripUpdate(req, tripId, 'EXPENSE_UPDATED', { action: 'delete_member', memberId: memberNum });

  res.json({ message: 'Member deleted successfully' });
});

module.exports = router;
