const express = require('express');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { verifyToken, verifyTripMember } = require('../middleware/auth');

const router = express.Router();

// Use memory storage instead of disk — works on ephemeral filesystems (Render, Railway, etc.)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
    }
  }
});

function broadcastTripUpdate(req, tripId, event, data) {
  const io = req.app.get('io');
  if (io) {
    io.to(tripId).emit(event, data);
  }
}

// 1. Add Expense (supports multi-currency & recurring flag)
router.post('/', verifyToken, verifyTripMember, (req, res) => {
  const {
    tripId,
    title,
    total_amount,
    date,
    category,
    split_method,
    notes,
    receipt_url,
    original_currency,
    exchange_rate,
    is_recurring,
    payers,
    participants
  } = req.body;

  if (!title || !total_amount || !date || !category || !payers || !participants || !participants.length) {
    return res.status(400).json({ error: 'Title, total amount, date, category, payers, and participants are required' });
  }

  const numAmount = parseFloat(total_amount);
  const expenseDate = date || new Date().toISOString().split('T')[0];
  const method = split_method || 'equal';
  const exRate = parseFloat(exchange_rate || 1);

  const expStmt = db.prepare(`
    INSERT INTO expenses (trip_id, title, total_amount, date, category, split_method, notes, receipt_url, created_by_member_id, original_currency, exchange_rate, is_recurring)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    tripId, title, numAmount, expenseDate, category, method, notes || '', receipt_url || '',
    req.tripMember.member_id, original_currency || '', exRate, is_recurring ? 1 : 0
  );

  const expenseId = expStmt.lastInsertRowid;

  payers.forEach(p => {
    db.prepare('INSERT INTO expense_payers (expense_id, member_id, amount_paid) VALUES (?, ?, ?)')
      .run(expenseId, p.member_id, parseFloat(p.amount_paid));
  });

  participants.forEach(pt => {
    let share = 0;
    if (method === 'equal' || method === 'select') {
      share = Math.round((numAmount / participants.length) * 100) / 100;
    } else if (method === 'custom') {
      share = parseFloat(pt.custom_amount || pt.share_amount || 0);
    } else if (method === 'percentage') {
      share = Math.round((numAmount * (parseFloat(pt.percentage || 0) / 100)) * 100) / 100;
    }

    db.prepare(`
      INSERT INTO expense_participants (expense_id, member_id, share_amount, percentage, custom_amount)
      VALUES (?, ?, ?, ?, ?)
    `).run(expenseId, pt.member_id, share, pt.percentage || null, pt.custom_amount || null);
  });

  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(
    tripId, req.tripMember.display_name, 'added_expense', `Added expense "${title}" (₹${numAmount})`
  );

  broadcastTripUpdate(req, tripId, 'EXPENSE_UPDATED', { expenseId, action: 'add', title });

  res.status(201).json({ message: 'Expense added successfully', expenseId });
});

// 2. Edit Expense
router.put('/:expenseId', verifyToken, verifyTripMember, (req, res) => {
  const { expenseId } = req.params;
  const {
    tripId,
    title,
    total_amount,
    date,
    category,
    split_method,
    notes,
    receipt_url,
    original_currency,
    exchange_rate,
    is_recurring,
    payers,
    participants
  } = req.body;

  // Only the creator of the expense can edit it
  const existing = db.prepare('SELECT created_by_member_id FROM expenses WHERE id = ?').get(expenseId);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });
  if (existing.created_by_member_id && existing.created_by_member_id !== req.tripMember.member_id) {
    return res.status(403).json({ error: 'Only the person who added this expense can edit it.' });
  }

  const numAmount = parseFloat(total_amount);
  const method = split_method || 'equal';

  db.prepare(`
    UPDATE expenses
    SET title = ?, total_amount = ?, date = ?, category = ?, split_method = ?, notes = ?, receipt_url = ?, original_currency = ?, exchange_rate = ?, is_recurring = ?
    WHERE id = ?
  `).run(
    title, numAmount, date, category, method, notes || '', receipt_url || '',
    original_currency || '', parseFloat(exchange_rate || 1), is_recurring ? 1 : 0, expenseId
  );

  db.prepare('DELETE FROM expense_payers WHERE expense_id = ?').run(expenseId);
  payers.forEach(p => {
    db.prepare('INSERT INTO expense_payers (expense_id, member_id, amount_paid) VALUES (?, ?, ?)')
      .run(expenseId, p.member_id, parseFloat(p.amount_paid));
  });

  db.prepare('DELETE FROM expense_participants WHERE expense_id = ?').run(expenseId);
  participants.forEach(pt => {
    let share = 0;
    if (method === 'equal' || method === 'select') {
      share = Math.round((numAmount / participants.length) * 100) / 100;
    } else if (method === 'custom') {
      share = parseFloat(pt.custom_amount || pt.share_amount || 0);
    } else if (method === 'percentage') {
      share = Math.round((numAmount * (parseFloat(pt.percentage || 0) / 100)) * 100) / 100;
    }

    db.prepare(`
      INSERT INTO expense_participants (expense_id, member_id, share_amount, percentage, custom_amount)
      VALUES (?, ?, ?, ?, ?)
    `).run(expenseId, pt.member_id, share, pt.percentage || null, pt.custom_amount || null);
  });

  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(
    tripId, req.tripMember.display_name, 'edited_expense', `Edited expense "${title}"`
  );

  broadcastTripUpdate(req, tripId, 'EXPENSE_UPDATED', { expenseId, action: 'edit', title });

  res.json({ message: 'Expense updated successfully' });
});

// 3. Delete Expense
router.delete('/:expenseId', verifyToken, verifyTripMember, (req, res) => {
  const { expenseId } = req.params;
  const { tripId } = req.query;

  const exp = db.prepare('SELECT title FROM expenses WHERE id = ?').get(expenseId);
  const title = exp ? exp.title : 'Expense';

  db.prepare('DELETE FROM expenses WHERE id = ?').run(expenseId);

  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(
    tripId, req.tripMember.display_name, 'deleted_expense', `Deleted expense "${title}"`
  );

  broadcastTripUpdate(req, tripId, 'EXPENSE_UPDATED', { expenseId, action: 'delete', title });

  res.json({ message: 'Expense deleted successfully' });
});

// 4. List Expenses with Search & Filters
router.get('/', verifyToken, verifyTripMember, (req, res) => {
  const { tripId, search, category, paidBy, participatedBy, startDate, endDate } = req.query;

  let expenses = db.prepare('SELECT * FROM expenses WHERE trip_id = ? ORDER BY date DESC, id DESC').all(tripId);

  if (search) {
    const q = search.toLowerCase();
    expenses = expenses.filter(e => e.title.toLowerCase().includes(q) || (e.notes && e.notes.toLowerCase().includes(q)));
  }

  if (category && category !== 'All') {
    expenses = expenses.filter(e => e.category === category);
  }

  const fullExpenses = expenses.map(exp => {
    const expPayers = db.prepare('SELECT * FROM expense_payers WHERE expense_id = ?').all(exp.id);
    const expParticipants = db.prepare('SELECT * FROM expense_participants WHERE expense_id = ?').all(exp.id);
    const comments = db.prepare('SELECT * FROM expense_comments WHERE expense_id = ?').all(exp.id);

    return {
      ...exp,
      payers: expPayers,
      participants: expParticipants,
      commentsCount: comments.length
    };
  });

  let filtered = fullExpenses;
  if (paidBy && paidBy !== 'All') {
    const payerId = Number(paidBy);
    filtered = filtered.filter(e => e.payers.some(p => p.member_id === payerId));
  }

  res.json({ expenses: filtered });
});

// 5. Get comments for an expense
router.get('/:expenseId/comments', verifyToken, verifyTripMember, (req, res) => {
  const { expenseId } = req.params;
  const comments = db.prepare('SELECT * FROM expense_comments WHERE expense_id = ?').all(expenseId);
  res.json({ comments });
});

// 6. Post a comment on an expense
router.post('/:expenseId/comments', verifyToken, verifyTripMember, (req, res) => {
  const { expenseId } = req.params;
  const { tripId, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  const stmt = db.prepare(`
    INSERT INTO expense_comments (expense_id, member_id, author_name, content)
    VALUES (?, ?, ?, ?)
  `).run(expenseId, req.tripMember.member_id, req.tripMember.display_name, content.trim());

  broadcastTripUpdate(req, tripId, 'EXPENSE_UPDATED', { expenseId, action: 'comment' });

  res.status(201).json({ message: 'Comment added', commentId: stmt.lastInsertRowid });
});

// 7. Upload receipt (returns Base64 data URL — works on ephemeral filesystems)
router.post('/upload-receipt', verifyToken, upload.single('receipt'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  // Convert buffer to Base64 data URL
  const base64 = req.file.buffer.toString('base64');
  const mimeType = req.file.mimetype;
  const dataUrl = `data:${mimeType};base64,${base64}`;
  res.json({ receiptUrl: dataUrl });
});

module.exports = router;
