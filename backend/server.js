const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const studyRoutes = require('./routes/study');
const teacherRoutes = require('./routes/teacher');
const seed = require('./seed');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded study proof images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/teacher', teacherRoutes);

// Optional trigger to re-seed database
app.post('/api/seed', async (req, res) => {
  try {
    await seed();
    res.json({ message: 'Database re-seeded successfully with demo accounts and data!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed database: ' + err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Initialize database and start server
initDb().then(async () => {
  // Auto-seed if database has no users
  const { get } = require('./db');
  const userCount = await get('SELECT COUNT(*) as count FROM users');
  if (!userCount || userCount.count === 0) {
    console.log('No users found. Running initial seed...');
    await seed();
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`⭐ Dhruv Star Study Tracker Backend Server`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
