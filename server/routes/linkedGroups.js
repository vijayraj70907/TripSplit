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

// Create a Linked / Family Group (e.g. A + B)
router.post('/', verifyToken, verifyTripMember, (req, res) => {
  const { tripId, name, memberIds } = req.body;
  if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
    return res.status(400).json({ error: 'Group name and at least 2 member IDs are required' });
  }

  // Create linked_group
  const groupStmt = db.prepare('INSERT INTO linked_groups (trip_id, name) VALUES (?, ?)').run(tripId, name);
  const groupId = groupStmt.lastInsertRowid;

  // Insert linked members
  memberIds.forEach(mId => {
    db.prepare('INSERT INTO linked_group_members (group_id, member_id) VALUES (?, ?)').run(groupId, mId);
  });

  // Log activity
  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(
    tripId, req.tripMember.display_name, 'created_linked_group', `Created Linked Family Group "${name}"`
  );

  broadcastTripUpdate(req, tripId, 'LINKED_GROUP_UPDATED', { groupId, name });

  res.status(201).json({ message: 'Linked group created successfully', groupId });
});

// Update / Edit Linked Group
router.put('/:groupId', verifyToken, verifyTripMember, (req, res) => {
  const { groupId } = req.params;
  const { tripId, name, memberIds } = req.body;

  if (!name || !memberIds || !Array.isArray(memberIds) || memberIds.length < 2) {
    return res.status(400).json({ error: 'Group name and at least 2 member IDs are required' });
  }

  // Remove existing members
  db.prepare('DELETE FROM linked_groups WHERE id = ?').run(groupId);

  // Re-create group
  const groupStmt = db.prepare('INSERT INTO linked_groups (trip_id, name) VALUES (?, ?)').run(tripId, name);
  const newGroupId = groupStmt.lastInsertRowid;

  memberIds.forEach(mId => {
    db.prepare('INSERT INTO linked_group_members (group_id, member_id) VALUES (?, ?)').run(newGroupId, mId);
  });

  broadcastTripUpdate(req, tripId, 'LINKED_GROUP_UPDATED', { groupId: newGroupId, name });

  res.json({ message: 'Linked group updated successfully', groupId: newGroupId });
});

// Delete Linked Group
router.delete('/:groupId', verifyToken, verifyTripMember, (req, res) => {
  const { groupId } = req.params;
  const { tripId } = req.query;

  db.prepare('DELETE FROM linked_groups WHERE id = ?').run(groupId);

  db.prepare('INSERT INTO activity_logs (trip_id, user_name, action, details) VALUES (?, ?, ?, ?)').run(
    tripId, req.tripMember.display_name, 'deleted_linked_group', 'Removed Linked Family Group'
  );

  broadcastTripUpdate(req, tripId, 'LINKED_GROUP_UPDATED', { groupId });

  res.json({ message: 'Linked group deleted' });
});

module.exports = router;
