const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { initDb, run, get, all } = require('./db');

const createSampleSvgImage = (filepath, subject, hourNum, studentName) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
    <rect width="800" height="1000" fill="#0f172a" />
    <rect x="40" y="40" width="720" height="920" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2" />
    <!-- Header -->
    <rect x="40" y="40" width="720" height="100" fill="#1e1b4b" rx="16" />
    <text x="80" y="95" font-family="system-ui, sans-serif" font-size="26" font-weight="bold" fill="#818cf8">DHRUV STAR ACADEMY - STUDY PROOF</text>
    <text x="80" y="125" font-family="system-ui, sans-serif" font-size="16" fill="#94a3b8">Student: ${studentName} | Hour ${hourNum}: ${subject}</text>
    
    <!-- Notebook Paper Simulation -->
    <rect x="70" y="170" width="660" height="740" rx="8" fill="#fefcbf" opacity="0.95" />
    <!-- Red margin line -->
    <line x1="140" y1="170" x2="140" y2="910" stroke="#f87171" stroke-width="2" />
    <!-- Blue notebook lines -->
    ${Array.from({ length: 22 }).map((_, i) => `<line x1="70" y1="${220 + i * 30}" x2="730" y2="${220 + i * 30}" stroke="#93c5fd" stroke-width="1.5" opacity="0.7" />`).join('\n')}
    
    <!-- Simulated Handwritten Content -->
    <text x="160" y="210" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="#1e3a8a">Topic: ${subject} Practice &amp; Key Notes</text>
    <text x="160" y="250" font-family="monospace" font-size="16" fill="#0f172a">1. Key Theorem &amp; Derivative Formula:</text>
    <text x="180" y="280" font-family="monospace" font-size="17" font-weight="bold" fill="#b91c1c">∫ (x³ + 4x - 7) dx = ¼ x⁴ + 2x² - 7x + C</text>
    
    <text x="160" y="340" font-family="monospace" font-size="16" fill="#0f172a">2. Solved Problem Set #${hourNum}:</text>
    <text x="180" y="370" font-family="monospace" font-size="15" fill="#1e293b">a) Given vector A = 3i + 4j, find magnitude |A|</text>
    <text x="200" y="400" font-family="monospace" font-size="15" fill="#047857">|A| = √(3² + 4²) = √(9 + 16) = √25 = 5 units</text>
    
    <text x="160" y="460" font-family="monospace" font-size="16" fill="#0f172a">3. Summary Observations:</text>
    <text x="180" y="490" font-family="monospace" font-size="14" fill="#334155">• Completed 15 practice problems from Chapter ${hourNum + 2}</text>
    <text x="180" y="520" font-family="monospace" font-size="14" fill="#334155">• Reviewed previous mistakes in revision log</text>
    <text x="180" y="550" font-family="monospace" font-size="14" fill="#334155">• Verified solutions against answer key</text>

    <!-- Diagram -->
    <rect x="180" y="590" width="380" height="200" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
    <circle cx="280" cy="690" r="60" fill="none" stroke="#2563eb" stroke-width="3" />
    <line x1="280" y1="690" x2="340" y2="690" stroke="#dc2626" stroke-width="3" />
    <text x="295" y="680" font-family="sans-serif" font-size="14" fill="#dc2626">r = 6 cm</text>
    <text x="380" y="650" font-family="sans-serif" font-size="15" fill="#1e293b">Area = π · r²</text>
    <text x="380" y="680" font-family="sans-serif" font-size="15" font-weight="bold" fill="#047857">Area = 36π ≈ 113.1 cm²</text>
    
    <!-- Signature Stamp -->
    <rect x="500" y="820" width="200" height="60" rx="8" fill="#dcfce7" stroke="#16a34a" stroke-width="2" />
    <text x="515" y="845" font-family="sans-serif" font-size="13" font-weight="bold" fill="#15803d">VERIFIED SUBMISSION</text>
    <text x="515" y="865" font-family="sans-serif" font-size="12" fill="#166534">Dhruv Star Tracker ✓</text>
  </svg>`;

  fs.writeFileSync(filepath, svg);
};

const seed = async () => {
  await initDb();

  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Hash default passwords
  const studentPasswordHash = await bcrypt.hash('password123', 10);
  const teacherPasswordHash = await bcrypt.hash('admin123', 10);

  // Clear existing data for fresh seed
  await run('DELETE FROM users');
  await run('DELETE FROM attendance');
  await run('DELETE FROM study_submissions');
  await run('DELETE FROM study_hours');

  // Insert Users
  const usersToInsert = [
    { student_id: 'STU001', name: 'Rahul Sharma', role: 'student', pass: studentPasswordHash },
    { student_id: 'STU002', name: 'Sneha Patel', role: 'student', pass: studentPasswordHash },
    { student_id: 'STU003', name: 'Arjun Verma', role: 'student', pass: studentPasswordHash },
    { student_id: 'STU004', name: 'Ananya Roy', role: 'student', pass: studentPasswordHash },
    { student_id: 'STU005', name: 'Karan Malhotra', role: 'student', pass: studentPasswordHash },
    { student_id: 'TCH001', name: 'Prof. Vikramaditya (Teacher)', role: 'teacher', pass: teacherPasswordHash }
  ];

  for (const u of usersToInsert) {
    await run(
      'INSERT INTO users (student_id, name, role, password_hash) VALUES (?, ?, ?, ?)',
      [u.student_id, u.name, u.role, u.pass]
    );
  }

  // Get Today's Date YYYY-MM-DD
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // 1. Rahul Sharma (STU001) - Full Submission (Present, 4/4 study hours uploaded)
  await run(
    'INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
    ['STU001', dateStr, '04:48 AM', 'PRESENT']
  );

  const rahulSubResult = await run(
    'INSERT INTO study_submissions (student_id, date, status) VALUES (?, ?, ?)',
    ['STU001', dateStr, 'COMPLETED']
  );
  const rahulSubId = rahulSubResult.lastID;

  const rahulSubjects = [
    { subject: 'Mathematics (Calculus)', time_slot: '05:30 AM - 06:30 AM' },
    { subject: 'Physics (Mechanics)', time_slot: '06:30 AM - 07:30 AM' },
    { subject: 'Chemistry (Organic)', time_slot: '09:00 PM - 10:00 PM' },
    { subject: 'English (Literature)', time_slot: '10:00 PM - 11:00 PM' }
  ];

  for (let i = 0; i < rahulSubjects.length; i++) {
    const hNum = i + 1;
    const imgFilename = `STU001_seed_hour_${hNum}.svg`;
    const imgPath = path.join(uploadsDir, imgFilename);
    createSampleSvgImage(imgPath, rahulSubjects[i].subject, hNum, 'Rahul Sharma');

    await run(
      `INSERT INTO study_hours (submission_id, student_id, date, hour_number, subject, time_slot, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [rahulSubId, 'STU001', dateStr, hNum, rahulSubjects[i].subject, rahulSubjects[i].time_slot, `/uploads/${imgFilename}`]
    );
  }

  // 2. Sneha Patel (STU002) - Partial Submission (Present, 2/4 study hours uploaded)
  await run(
    'INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
    ['STU002', dateStr, '05:15 AM', 'PRESENT']
  );

  const snehaSubjects = [
    { subject: 'Physics (Optics)', time_slot: '05:30 AM - 06:30 AM' },
    { subject: 'Biology (Genetics)', time_slot: '06:30 AM - 07:30 AM' }
  ];

  for (let i = 0; i < snehaSubjects.length; i++) {
    const hNum = i + 1;
    const imgFilename = `STU002_seed_hour_${hNum}.svg`;
    const imgPath = path.join(uploadsDir, imgFilename);
    createSampleSvgImage(imgPath, snehaSubjects[i].subject, hNum, 'Sneha Patel');

    await run(
      `INSERT INTO study_hours (submission_id, student_id, date, hour_number, subject, time_slot, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [null, 'STU002', dateStr, hNum, snehaSubjects[i].subject, snehaSubjects[i].time_slot, `/uploads/${imgFilename}`]
    );
  }

  // 3. Arjun Verma (STU003) - Absent (Missed attendance)
  await run(
    'INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
    ['STU003', dateStr, '05:45 AM', 'ABSENT']
  );

  // 4. Ananya Roy (STU004) - Present, 4/4 study hours uploaded
  await run(
    'INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
    ['STU004', dateStr, '04:35 AM', 'PRESENT']
  );

  const ananyaSubResult = await run(
    'INSERT INTO study_submissions (student_id, date, status) VALUES (?, ?, ?)',
    ['STU004', dateStr, 'COMPLETED']
  );
  const ananyaSubId = ananyaSubResult.lastID;

  const ananyaSubjects = [
    { subject: 'Computer Science (Data Structures)', time_slot: '05:30 AM - 06:30 AM' },
    { subject: 'Mathematics (Linear Algebra)', time_slot: '06:30 AM - 07:30 AM' },
    { subject: 'Physics (Electromagnetism)', time_slot: '08:30 PM - 09:30 PM' },
    { subject: 'Chemistry (Physical)', time_slot: '09:30 PM - 10:30 PM' }
  ];

  for (let i = 0; i < ananyaSubjects.length; i++) {
    const hNum = i + 1;
    const imgFilename = `STU004_seed_hour_${hNum}.svg`;
    const imgPath = path.join(uploadsDir, imgFilename);
    createSampleSvgImage(imgPath, ananyaSubjects[i].subject, hNum, 'Ananya Roy');

    await run(
      `INSERT INTO study_hours (submission_id, student_id, date, hour_number, subject, time_slot, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ananyaSubId, 'STU004', dateStr, hNum, ananyaSubjects[i].subject, ananyaSubjects[i].time_slot, `/uploads/${imgFilename}`]
    );
  }

  // 5. Karan Malhotra (STU005) - Present, 0 study hours uploaded yet
  await run(
    'INSERT INTO attendance (student_id, date, time, status) VALUES (?, ?, ?, ?)',
    ['STU005', dateStr, '05:02 AM', 'PRESENT']
  );

  console.log('Seed data inserted successfully!');
};

if (require.main === module) {
  seed().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = seed;
