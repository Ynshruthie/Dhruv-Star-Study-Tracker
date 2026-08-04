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

const hhmmToMinutes = (value) => {
  if (!value || typeof value !== 'string' || !value.includes(':')) return null;
  const [hourStr, minuteStr] = value.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return (hour * 60) + minute;
};

const parseStoredHourPayload = (raw) => {
  const basePayload = {
    images: [],
    managerType: 'SELF',
    attendanceStatus: 'PENDING',
    attendanceMarkedAt: null,
    plannedStart: null,
    plannedEnd: null,
    actualStart: null,
    actualEnd: null
  };

  if (!raw) return { ...basePayload };

  if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw);
      return {
        ...basePayload,
        ...parsed,
        images: Array.isArray(parsed.images) ? parsed.images : []
      };
    } catch (error) {
      return { ...basePayload };
    }
  }

  if (typeof raw === 'string' && raw.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      return {
        ...basePayload,
        images: Array.isArray(parsed) ? parsed : []
      };
    } catch (error) {
      return { ...basePayload };
    }
  }

  if (typeof raw === 'string') {
    return { ...basePayload, images: [raw] };
  }

  return { ...basePayload };
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
    const today = getTodayDateString();
    const currentMinutes = date < today ? 1440 : ((new Date().getHours() * 60) + new Date().getMinutes());

    const studentReport = (students || []).map(st => {
      const studentHoursObj = hoursMap.get(st.student_id) || {};

      const hours = [1, 2, 3, 4].map(hNum => {
        const hourData = studentHoursObj[hNum];
        const payload = hourData ? parseStoredHourPayload(hourData.image_url) : null;
        const urls = payload?.images || [];
        const plannedEndMinutes = hhmmToMinutes(payload?.plannedEnd);
        const managerType = payload?.managerType || 'SELF';
        let attendanceStatus = payload?.attendanceStatus || 'PENDING';

        if (managerType === 'PARENT') {
          attendanceStatus = 'PARENT';
        } else if (attendanceStatus === 'PENDING' && plannedEndMinutes != null && currentMinutes >= plannedEndMinutes) {
          attendanceStatus = 'ABSENT';
        }

        return {
          hour_number: hNum,
          completed: !!hourData,
          subject: hourData ? hourData.subject : null,
          time_slot: hourData ? hourData.time_slot : null,
          image_url: urls[0] || null,
          image_urls: urls,
          photo_count: urls.length,
          created_at: hourData ? hourData.created_at : null,
          manager_type: managerType,
          attendance_status: attendanceStatus,
          attendance_marked_at: payload?.attendanceMarkedAt || null
        };
      });

      const completedHoursCount = hours.filter(h => h.completed).length;
      const uploadedHoursCount = hours.filter(h => h.photo_count > 0).length;
      const presentSlots = hours.filter(h => h.attendance_status === 'PRESENT');
      const pendingSlots = hours.filter(h => h.completed && h.attendance_status === 'PENDING');
      const absentSlots = hours.filter(h => h.completed && h.attendance_status === 'ABSENT');
      const parentSlots = hours.filter(h => h.completed && h.manager_type === 'PARENT');
      const hasSchedule = completedHoursCount > 0;

      let attendanceStatus = 'PENDING';
      if (presentSlots.length > 0) {
        attendanceStatus = 'PRESENT';
      } else if (parentSlots.length === completedHoursCount && completedHoursCount > 0) {
        attendanceStatus = 'PARENT';
      } else if (hasSchedule && pendingSlots.length === 0 && absentSlots.length > 0) {
        attendanceStatus = 'ABSENT';
      }

      let overallStatus = 'Pending';
      if (uploadedHoursCount === 4) {
        overallStatus = 'Submitted';
        submittedCount++;
      } else if (attendanceStatus === 'ABSENT') {
        overallStatus = 'Absent';
        absentCount++;
      } else if (attendanceStatus === 'PRESENT') {
        presentCount++;
        pendingCount++;
      } else if (hasSchedule) {
        pendingCount++;
      }

      return {
        id: st.id,
        student_id: st.student_id,
        name: st.name,
        attendance: {
          marked: presentSlots.length > 0,
          time: presentSlots[0]?.attendance_marked_at || null,
          status: attendanceStatus
        },
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
