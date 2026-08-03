const express = require('express');
const { get, run, all } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

const getTodayDateString = (customDate) => {
  if (customDate) return customDate;
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// GET /api/teacher/dashboard
router.get('/dashboard', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const date = getTodayDateString(req.query.date);

    // Get all students
    const students = await all("SELECT id, student_id, name FROM users WHERE role = 'student' ORDER BY name ASC");

    // Get all attendance records for date
    const attendanceRecords = await all('SELECT * FROM attendance WHERE date = ?', [date]);
    const attendanceMap = new Map(attendanceRecords.map(a => [a.student_id, a]));

    // Get all study submissions for date
    const submissions = await all('SELECT * FROM study_submissions WHERE date = ?', [date]);
    const submissionMap = new Map(submissions.map(s => [s.student_id, s]));

    // Get all study hours for date
    const studyHours = await all('SELECT * FROM study_hours WHERE date = ?', [date]);
    const hoursMap = new Map();
    studyHours.forEach(h => {
      if (!hoursMap.has(h.student_id)) {
        hoursMap.set(h.student_id, {});
      }
      hoursMap.get(h.student_id)[h.hour_number] = h;
    });

    let presentCount = 0;
    let absentCount = 0;
    let submittedCount = 0;
    let pendingCount = 0;

    const studentReport = students.map(st => {
      const att = attendanceMap.get(st.student_id);
      const sub = submissionMap.get(st.student_id);
      const studentHoursObj = hoursMap.get(st.student_id) || {};

      // Build 4 hours array
      const hours = [1, 2, 3, 4].map(hNum => {
        const hourData = studentHoursObj[hNum];
        return {
          hour_number: hNum,
          completed: !!hourData,
          subject: hourData ? hourData.subject : null,
          time_slot: hourData ? hourData.time_slot : null,
          image_url: hourData ? hourData.image_url : null,
          created_at: hourData ? hourData.created_at : null
        };
      });

      const completedHoursCount = hours.filter(h => h.completed).length;

      // Status determination logic
      let attendanceStatus = 'ABSENT';
      if (att) {
        attendanceStatus = att.status; // PRESENT or ABSENT
      }

      let overallStatus = 'Pending';
      if (attendanceStatus === 'ABSENT' || (!att && new Date().getHours() >= 6)) {
        overallStatus = 'Absent';
        absentCount++;
      } else if (attendanceStatus === 'PRESENT') {
        presentCount++;
        if (completedHoursCount === 4) {
          overallStatus = 'Submitted';
          submittedCount++;
        } else {
          overallStatus = 'Pending';
          pendingCount++;
        }
      } else {
        pendingCount++;
      }

      return {
        id: st.id,
        student_id: st.student_id,
        name: st.name,
        attendance: att ? { marked: true, time: att.time, status: att.status } : { marked: false, status: attendanceStatus },
        hours,
        completedHoursCount,
        overallStatus
      };
    });

    res.json({
      date,
      metrics: {
        totalStudents: students.length,
        presentCount,
        absentCount,
        submittedCount,
        pendingCount
      },
      students: studentReport
    });
  } catch (err) {
    console.error('Teacher dashboard error:', err);
    res.status(500).json({ error: 'Failed to fetch teacher dashboard data' });
  }
});

module.exports = router;
