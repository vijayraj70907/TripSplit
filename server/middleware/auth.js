const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'tripsplit_super_secret_jwt_key_2026';

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

function verifyTripMember(req, res, next) {
  const tripId = req.params.tripId || req.body.tripId || req.query.tripId;
  if (!tripId) {
    return res.status(400).json({ error: 'Trip ID is required' });
  }

  const member = db.prepare(`
    SELECT tm.id as member_id, tm.user_id, tm.role, tm.display_name
    FROM trip_members tm
    WHERE tm.trip_id = ? AND tm.user_id = ?
  `).get(tripId, req.user.id);

  if (!member) {
    return res.status(403).json({ error: 'Access denied. You are not a member of this trip.' });
  }

  req.tripMember = member;
  next();
}

module.exports = {
  JWT_SECRET,
  verifyToken,
  verifyTripMember
};
