const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'dhruv_study.db');
const db = new sqlite3.Database(dbPath);

// Promisified helper functions
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const initDb = async () => {
  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Attendance table
  await run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT')),
      marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, date)
    )
  `);

  // Study Submissions table
  await run(`
    CREATE TABLE IF NOT EXISTS study_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'COMPLETED',
      UNIQUE(student_id, date)
    )
  `);

  // Study Hours table
  await run(`
    CREATE TABLE IF NOT EXISTS study_hours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER,
      student_id TEXT NOT NULL,
      date TEXT NOT NULL,
      hour_number INTEGER NOT NULL CHECK(hour_number IN (1, 2, 3, 4)),
      subject TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      image_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, date, hour_number)
    )
  `);

  console.log('Database tables initialized successfully.');
};

module.exports = {
  db,
  run,
  get,
  all,
  initDb
};
