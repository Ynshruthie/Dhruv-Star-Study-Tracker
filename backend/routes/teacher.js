const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase } = require('../db');
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
    const { data: students } = await supabase
      .from('users')
      .select('id, student_id, name')
      .eq('role', 'student')
      .order('name', { ascending: true });

    // Get all attendance records for date
    const { data: attendanceRecords } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', date);
    const attendanceMap = new Map((attendanceRecords || []).map(a => [a.student_id, a]));

    // Get all study submissions for date
    const { data: submissions } = await supabase
      .from('study_submissions')
      .select('*')
      .eq('date', date);
    const submissionMap = new Map((submissions || []).map(s => [s.student_id, s]));

    // Get all study hours for date
    const { data: studyHours } = await supabase
      .from('study_hours')
      .select('*')
      .eq('date', date);
    const hoursMap = new Map();
    (studyHours || []).forEach(h => {
      if (!hoursMap.has(h.student_id)) {
        hoursMap.set(h.student_id, {});
      }
      hoursMap.get(h.student_id)[h.hour_number] = h;
    });

    let presentCount = 0;
    let absentCount = 0;
    let submittedCount = 0;
    let pendingCount = 0;

    const studentReport = (students || []).map(st => {
      const att = attendanceMap.get(st.student_id);
      const sub = submissionMap.get(st.student_id);
      const studentHoursObj = hoursMap.get(st.student_id) || {};

      // Build 4 hours array
      const parseImageUrls = (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string' && raw.trim().startsWith('[')) {
          try { return JSON.parse(raw); } catch (e) {}
        }
        return [raw];
      };

      const hours = [1, 2, 3, 4].map(hNum => {
        const hourData = studentHoursObj[hNum];
        const urls = hourData ? parseImageUrls(hourData.image_url) : [];
        return {
          hour_number: hNum,
          completed: !!hourData,
          subject: hourData ? hourData.subject : null,
          time_slot: hourData ? hourData.time_slot : null,
          image_url: urls[0] || null,
          image_urls: urls,
          photo_count: urls.length,
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
        totalStudents: (students || []).length,
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

// POST /api/teacher/students — Create a new student
router.post('/students', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { name, student_id, password } = req.body;

    if (!name || !student_id || !password) {
      return res.status(400).json({ error: 'Name, Student ID, and Password are all required.' });
    }

    if (student_id.length < 3) {
      return res.status(400).json({ error: 'Student ID must be at least 3 characters.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if student_id already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .ilike('student_id', student_id)
      .single();

    if (existing) {
      return res.status(409).json({ error: `Student ID "${student_id.toUpperCase()}" already exists. Please use a different ID.` });
    }

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert new student into database
    const { data: result, error } = await supabase
      .from('users')
      .insert({ student_id: student_id.toUpperCase(), name: name.trim(), password_hash, role: 'student' })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: `Student "${name.trim()}" (${student_id.toUpperCase()}) created successfully.`,
      student: {
        id: result.id,
        student_id: student_id.toUpperCase(),
        name: name.trim(),
        role: 'student'
      }
    });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ error: 'Failed to create student. Please try again.' });
  }
});

// DELETE /api/teacher/students/:studentId — Remove a student
router.delete('/students/:studentId', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { studentId } = req.params;

    const { data: existing } = await supabase
      .from('users')
      .select('id, name')
      .eq('student_id', studentId)
      .eq('role', 'student')
      .single();

    if (!existing) {
      return res.status(404).json({ error: `Student "${studentId}" not found.` });
    }

    // Since we set up ON DELETE CASCADE in the schema for study_hours (if applicable) 
    // or we can manually delete them via Supabase API (simulating CASCADE)
    await supabase.from('study_hours').delete().eq('student_id', studentId);
    await supabase.from('study_submissions').delete().eq('student_id', studentId);
    await supabase.from('attendance').delete().eq('student_id', studentId);
    await supabase.from('users').delete().eq('student_id', studentId).eq('role', 'student');

    res.json({ message: `Student "${existing.name}" (${studentId}) has been removed.` });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});

module.exports = router;
