const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const seedDatabase = require('./seed');

const authRoutes = require('./routes/auth');
const tripRoutes = require('./routes/trips');
const linkedGroupRoutes = require('./routes/linkedGroups');
const expenseRoutes = require('./routes/expenses');
const settlementRoutes = require('./routes/settlements');
const reportRoutes = require('./routes/reports');
const aiRoutes = require('./routes/ai');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Attach Socket.IO instance to app for route handler access
app.set('io', io);

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log('⚡ Socket connected:', socket.id);

  socket.on('JOIN_TRIP', (tripId) => {
    socket.join(tripId);
    console.log(`Socket ${socket.id} joined trip room: ${tripId}`);
  });

  socket.on('LEAVE_TRIP', (tripId) => {
    socket.leave(tripId);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Seed data if store is empty
const store = db._getStore();
if (!store.trips.length) {
  seedDatabase();
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/linked-groups', linkedGroupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend static build files in production if available
const clientBuildDir = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientBuildDir)) {
  app.use(express.static(clientBuildDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildDir, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 TripSplit server running on http://localhost:${PORT}`);
});
