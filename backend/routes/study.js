const express = require('express');
const upload = require('../middleware/upload');
const { get, run, all } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

const getTodayDateString = (customDate) => {
  if (customDate) return customDate;
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// GET /api/study/today
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const student_id = req.user.student_id;
    const date = getTodayDateString(req.query.date);

    const submission = await get('SELECT * FROM study_submissions WHERE student_id = ? AND date = ?', [student_id, date]);
    
    let hours = [];
    if (submission) {
      hours = await all('SELECT * FROM study_hours WHERE submission_id = ? ORDER BY hour_number ASC', [submission.id]);
    } else {
      // Also check if any partial hours were saved
      hours = await all('SELECT * FROM study_hours WHERE student_id = ? AND date = ? ORDER BY hour_number ASC', [student_id, date]);
    }

    res.json({
      date,
      isSubmitted: !!submission,
      submission: submission || null,
      hours: hours || []
    });
  } catch (err) {
    console.error('Error fetching today study tracker:', err);
    res.status(500).json({ error: 'Failed to fetch study tracker data' });
  }
});

// POST /api/study/submit
// Expects multipart fields:
// - subject_1, time_slot_1, image_1
// - subject_2, time_slot_2, image_2
// - subject_3, time_slot_3, image_3
// - subject_4, time_slot_4, image_4
router.post('/submit', authenticateToken, upload.fields([
  { name: 'image_1', maxCount: 1 },
  { name: 'image_2', maxCount: 1 },
  { name: 'image_3', maxCount: 1 },
  { name: 'image_4', maxCount: 1 }
]), async (req, res) => {
  try {
    const student_id = req.user.student_id;
    const date = getTodayDateString(req.body.date);

    // Check if already submitted today
    const existingSubmission = await get('SELECT * FROM study_submissions WHERE student_id = ? AND date = ?', [student_id, date]);
    if (existingSubmission) {
      return res.status(400).json({ error: 'You have already submitted your 4-hour study tracker for today.' });
    }

    // Verify attendance has been marked
    const attendance = await get('SELECT * FROM attendance WHERE student_id = ? AND date = ?', [student_id, date]);
    if (!attendance || attendance.status !== 'PRESENT') {
      return res.status(400).json({ error: 'You must mark morning attendance before submitting your study tracker.' });
    }

    // Parse items for 4 compulsory hours
    const hoursData = [];
    for (let h = 1; h <= 4; h++) {
      const subject = req.body[`subject_${h}`];
      const time_slot = req.body[`time_slot_${h}`];
      const fileArr = req.files ? req.files[`image_${h}`] : null;

      if (!subject || !subject.trim()) {
        return res.status(400).json({ error: `Subject for Hour ${h} is required.` });
      }
      if (!time_slot || !time_slot.trim()) {
        return res.status(400).json({ error: `Study time for Hour ${h} is required.` });
      }
      if (!fileArr || fileArr.length === 0) {
        return res.status(400).json({ error: `Upload image proof for Hour ${h} is required.` });
      }

      const imageUrl = `/uploads/${fileArr[0].filename}`;
      hoursData.push({
        hour_number: h,
        subject: subject.trim(),
        time_slot: time_slot.trim(),
        image_url: imageUrl
      });
    }

    // Create main submission
    const result = await run(
      'INSERT INTO study_submissions (student_id, date, status) VALUES (?, ?, ?)',
      [student_id, date, 'COMPLETED']
    );
    const submissionId = result.lastID;

    // Insert 4 hour entries
    for (const hData of hoursData) {
      await run(
        `INSERT INTO study_hours (submission_id, student_id, date, hour_number, subject, time_slot, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [submissionId, student_id, date, hData.hour_number, hData.subject, hData.time_slot, hData.image_url]
      );
    }

    const savedHours = await all('SELECT * FROM study_hours WHERE submission_id = ? ORDER BY hour_number ASC', [submissionId]);

    res.json({
      message: 'All 4 study hours successfully submitted for today!',
      submission_id: submissionId,
      date,
      hours: savedHours
    });
  } catch (err) {
    console.error('Error submitting study hours:', err);
    res.status(500).json({ error: 'Failed to submit study tracker. ' + (err.message || '') });
  }
});

module.exports = router;
