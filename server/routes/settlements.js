const express = require('express');
const db = require('../db');
const { verifyToken, verifyTripMember } = require('../middleware/auth');

const router = express.Router();

function broadcastTripUpdate(req, tripId, event, data) {
  const io = req.app.get('io');
  if (io) {
    io.to(tripId).emit(event, data);
  }
}

// 1. Mark Settlement as Paid
router.post('/mark-paid', verifyToken, verifyTripMember, (req, res) => {
  const { tripId, payerMemberId, payeeMemberId, amount, date, notes } = req.body;

  if (!payerMemberId || !payeeMemberId || !amount) {
    return res.status(400).json({ error: 'Payer, payee, and amount are required' });
  }

  // Security check: Only the person who is paying (payerMemberId) can record the settlement payment
  if (req.tripMember.member_id !== Number(payerMemberId)) {
    return res.status(403).json({ error: 'Only the member who owes the money (the payer) can record this payment.' });
  }

  const numAmount = parseFloat(amount);
  const settlementDate = date || new Date().toISOString().split('T')[0];

  const stmt = db.prepare(`
    INSERT INTO settlements (trip_id, payer_member_id, payee_member_id, amount, date, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, 'completed')
  `).run(tripId, payerMemberId, payeeMemberId, numAmount, settlementDate, notes || 'Settlement payment');

  const payer = db.prepare('SELECT display_name FROM trip_members WHERE id = ?').get(payerMemberId);
  const payee = db.prepare('SELECT display_name FROM trip_members WHERE id = ?').get(payeeMemberId);

  const payerName = payer ? payer.display_name : 'Member';
  const payeeName = payee ? payee.display_name : 'Member';

  // Activity log
  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(
    tripId, req.tripMember.display_name, 'settlement_paid', `${payerName} paid ${payeeName} ₹${numAmount}`
  );

  broadcastTripUpdate(req, tripId, 'SETTLEMENT_RECORDED', { settlementId: stmt.lastInsertRowid, payerName, payeeName, amount: numAmount });

  res.status(201).json({ message: 'Settlement payment recorded successfully', settlementId: stmt.lastInsertRowid });
});

// 2. Get Settlement History
router.get('/history', verifyToken, verifyTripMember, (req, res) => {
  const { tripId } = req.query;
  const settlements = db.prepare('SELECT * FROM settlements WHERE trip_id = ? ORDER BY created_at DESC').all(tripId);

  const history = settlements.map(s => {
    const payer = db.prepare('SELECT display_name, avatar_url FROM trip_members WHERE id = ?').get(s.payer_member_id);
    const payee = db.prepare('SELECT display_name, avatar_url FROM trip_members WHERE id = ?').get(s.payee_member_id);

    return {
      ...s,
      payerName: payer ? payer.display_name : 'Member',
      payerAvatar: payer ? payer.avatar_url : '',
      payeeName: payee ? payee.display_name : 'Member',
      payeeAvatar: payee ? payee.avatar_url : ''
    };
  });

  res.json({ settlements: history });
});

module.exports = router;
