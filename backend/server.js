const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb, supabase } = require('./db');

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

// Serve static uploaded study proof images (still here for backwards compatibility if needed)
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
  // Check if users exist in Supabase
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (!error && (!users || users.length === 0)) {
      console.log('No users found in Supabase. You may need to run the seed script after creating tables.');
      // Optionally await seed(); but we'll wait for the user to create tables first via SQL editor
    }
  } catch (err) {
    console.error('Could not check users table. Did you run schema.sql in Supabase SQL editor?');
  }

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`⭐ Dhruv Star Study Tracker Backend Server`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`=======================================================`);
    
    // Initialize scheduled cron jobs
    require('./cron');
  });
}).catch(err => {
  console.error('Failed to initialize server:', err);
});
