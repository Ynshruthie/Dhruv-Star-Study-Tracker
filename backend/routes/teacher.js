const express = require('express');
const bcrypt = require('bcryptjs');
const { supabase } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
const START_GRACE_MINUTES = 15;
const UPLOAD_GRACE_MINUTES = 15;

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

const minutesToHHMM = (minutes) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
};

const formatHHMM = (value) => {
  const minutes = hhmmToMinutes(value);
  if (minutes == null) return value || '--';
  const hour24 = Math.floor(minutes / 60);
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minutes % 60).padStart(2, '0')} ${hour24 >= 12 ? 'PM' : 'AM'}`;
};

const formatTimeRange = (start, end) => `${formatHHMM(start)} – ${formatHHMM(end)}`;

// A mentor is always another teacher account, stored by its login ID rather
// than a free-form display name.
const getMentorId = async (mentor) => {
  const mentorId = mentor?.trim().toUpperCase();
  if (!mentorId) {
    const validationError = new Error('Mentor ID is required.');
    validationError.status = 400;
    throw validationError;
  }

  const { data: mentorUser, error } = await supabase
    .from('users')
    .select('student_id')
    .ilike('student_id', mentorId)
    .eq('role', 'teacher')
    .maybeSingle();

  if (error) throw error;
  if (!mentorUser) {
    const validationError = new Error(`Mentor ID "${mentorId}" was not found.`);
    validationError.status = 400;
    throw validationError;
  }

  return mentorUser.student_id;
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
      .select('id, student_id, name, mentor')
      .eq('role', 'student')
      .order('name', { ascending: true });

    // Get all study hours for date
    const { data: studyHours } = await supabase
      .from('study_hours')
      .select('*')
      .eq('date', date);

    const { data: acknowledgements, error: acknowledgementsError } = await supabase
      .from('teacher_acknowledgements')
      .select('student_id, teacher_id, reaction, comment, acknowledged_at')
      .eq('date', date);
    if (acknowledgementsError) throw acknowledgementsError;
    const acknowledgementMap = new Map((acknowledgements || []).map((item) => [item.student_id, item]));

    // Also include each student's next booked day. A teacher normally views
    // today's dashboard, while students book future Monday–Saturday slots.
    const { data: futureStudyHours, error: futureStudyHoursError } = await supabase
      .from('study_hours')
      .select('*')
      .gte('date', date)
      .order('date', { ascending: true })
      .order('hour_number', { ascending: true });

    if (futureStudyHoursError) throw futureStudyHoursError;

    const hoursMap = new Map();
    (studyHours || []).forEach(h => {
      if (!hoursMap.has(h.student_id)) {
        hoursMap.set(h.student_id, {});
      }
      hoursMap.get(h.student_id)[h.hour_number] = h;
    });
    const nextBookingMap = new Map();
    (futureStudyHours || []).forEach(h => {
      const payload = parseStoredHourPayload(h.image_url);
      // A future row is a booking only after the student has confirmed it
      // through the Sunday weekly-plan action. This prevents old/imported
      // rows from being presented as a student booking.
      if (!payload.bookingConfirmedAt) return;

      const nextBooking = nextBookingMap.get(h.student_id);
      if (!nextBooking || h.date < nextBooking.date) {
        nextBookingMap.set(h.student_id, { date: h.date, hours: {} });
      }
      const booking = nextBookingMap.get(h.student_id);
      if (booking.date === h.date) {
        booking.hours[h.hour_number] = {
          subject: h.subject,
          planned_start: payload.plannedStart,
          planned_end: payload.plannedEnd,
          planned_time_slot: formatTimeRange(payload.plannedStart, payload.plannedEnd)
        };
      }
    });

    let presentCount = 0;
    let absentCount = 0;
    let submittedCount = 0;
    let pendingCount = 0;
    const today = getTodayDateString();
    const currentMinutes = date < today
      ? 1440
      : date > today
        ? -1
        : ((new Date().getHours() * 60) + new Date().getMinutes());

    const studentReport = (students || []).map(st => {
      const studentHoursObj = hoursMap.get(st.student_id) || {};
      const nextBooking = nextBookingMap.get(st.student_id);
      const acknowledgement = acknowledgementMap.get(st.student_id) || null;

      const hours = [1, 2, 3, 4].map(hNum => {
        const hourData = studentHoursObj[hNum];
        const payload = hourData ? parseStoredHourPayload(hourData.image_url) : null;
        const urls = payload?.images || [];
        const plannedStartMinutes = hhmmToMinutes(payload?.plannedStart);
        const plannedEndMinutes = hhmmToMinutes(payload?.plannedEnd);
        const actualEndMinutes = hhmmToMinutes(payload?.actualEnd);
        const startDeadlineMinutes = plannedStartMinutes == null ? null : plannedStartMinutes + START_GRACE_MINUTES;
        const uploadDeadlineMinutes = actualEndMinutes == null ? null : actualEndMinutes + UPLOAD_GRACE_MINUTES;
        const managerType = payload?.managerType || 'SELF';
        let attendanceStatus = payload?.attendanceStatus || 'PENDING';

        if (managerType === 'PARENT') {
          attendanceStatus = 'PARENT';
        } else if (attendanceStatus === 'PENDING' && startDeadlineMinutes != null && currentMinutes > startDeadlineMinutes) {
          attendanceStatus = 'ABSENT';
        }

        let timingLabel = 'Not scheduled';
        if (hourData && managerType === 'PARENT') {
          timingLabel = `Parent managed · ${formatTimeRange(payload?.plannedStart, payload?.plannedEnd)}`;
        } else if (hourData && attendanceStatus === 'ABSENT') {
          timingLabel = `Start missed · due by ${formatHHMM(minutesToHHMM(startDeadlineMinutes))}`;
        } else if (hourData && attendanceStatus === 'PENDING' && currentMinutes < plannedStartMinutes) {
          timingLabel = `Starts ${formatHHMM(payload?.plannedStart)} · 15 min grace`;
        } else if (hourData && attendanceStatus === 'PENDING') {
          timingLabel = `Start now · ${Math.max(0, startDeadlineMinutes - currentMinutes)} min grace left`;
        } else if (hourData && attendanceStatus === 'PRESENT' && actualEndMinutes != null && currentMinutes < actualEndMinutes) {
          timingLabel = `Studying · ${actualEndMinutes - currentMinutes} min left`;
        } else if (hourData && attendanceStatus === 'PRESENT' && uploadDeadlineMinutes != null && currentMinutes <= uploadDeadlineMinutes) {
          timingLabel = `Upload proof · ${uploadDeadlineMinutes - currentMinutes} min left`;
        } else if (hourData && attendanceStatus === 'PRESENT') {
          timingLabel = 'Proof upload window closed';
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
          attendance_marked_at: payload?.attendanceMarkedAt || null,
          planned_start: payload?.plannedStart || null,
          planned_end: payload?.plannedEnd || null,
          planned_time_slot: hourData ? formatTimeRange(payload?.plannedStart, payload?.plannedEnd) : null,
          active_time_slot: payload?.actualStart && payload?.actualEnd ? formatTimeRange(payload.actualStart, payload.actualEnd) : null,
          timing_label: timingLabel
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
        mentor: st.mentor,
        acknowledgement,
        next_booking_date: nextBooking?.date || null,
        next_booking_hours: nextBooking ? nextBooking.hours : {},
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

// PUT /api/teacher/students/:studentId/acknowledgement — acknowledge a daily review
router.put('/students/:studentId/acknowledgement', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const student_id = decodeURIComponent(req.params.studentId || '').trim();
    const date = getTodayDateString(req.body.date);
    const reaction = req.body.reaction === 'THUMBS_UP' ? 'THUMBS_UP' : 'THUMBS_UP';
    const comment = typeof req.body.comment === 'string' ? req.body.comment.trim().slice(0, 500) : '';
    if (!student_id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'A student and valid review date are required.' });
    }

    const { data, error } = await supabase
      .from('teacher_acknowledgements')
      .upsert({ student_id, date, teacher_id: req.user.student_id, reaction, comment: comment || null, acknowledged_at: new Date().toISOString() }, { onConflict: 'student_id,date' })
      .select('student_id, teacher_id, reaction, comment, acknowledged_at')
      .single();
    if (error) throw error;
    res.json({ message: 'Work acknowledged.', acknowledgement: data });
  } catch (err) {
    console.error('Teacher acknowledgement error:', err);
    res.status(500).json({ error: 'Failed to acknowledge this work. Ensure the latest database schema is installed.' });
  }
});

// PUT /api/teacher/students/:studentId/slots/:date/:hourNumber — Adjust one booked slot for one day
router.put('/students/:studentId/slots/:date/:hourNumber', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const studentId = decodeURIComponent(req.params.studentId || '').trim();
    const { date, hourNumber } = req.params;
    const { planned_start, planned_end } = req.body;
    const hour_number = Number.parseInt(hourNumber, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isInteger(hour_number) || hour_number < 1 || hour_number > 4) {
      return res.status(400).json({ error: 'A valid date and Slot number (1–4) are required.' });
    }

    const startMinutes = hhmmToMinutes(planned_start);
    const endMinutes = hhmmToMinutes(planned_end);
    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
      return res.status(400).json({ error: 'End time must be later than start time.' });
    }

    const { data: slot, error: slotError } = await supabase
      .from('study_hours')
      .select('*')
      .ilike('student_id', studentId)
      .eq('date', date)
      .eq('hour_number', hour_number)
      .maybeSingle();

    if (slotError) throw slotError;
    if (!slot) return res.status(404).json({ error: 'This student has no booked slot for that date.' });

    const payload = parseStoredHourPayload(slot.image_url);
    if (payload.attendanceStatus === 'PRESENT' || payload.images.length > 0) {
      return res.status(409).json({ error: 'A slot cannot be changed after attendance is marked or proof is uploaded.' });
    }

    const updatedPayload = {
      ...payload,
      plannedStart: planned_start,
      plannedEnd: planned_end
    };
    const { error: updateError } = await supabase
      .from('study_hours')
      .update({
        time_slot: formatTimeRange(planned_start, planned_end),
        image_url: JSON.stringify(updatedPayload)
      })
      .eq('id', slot.id);

    if (updateError) throw updateError;

    res.json({
      message: `Slot ${hour_number} updated for ${date}.`,
      slot: { student_id: slot.student_id, date, hour_number, planned_start, planned_end }
    });
  } catch (err) {
    console.error('Update student slot error:', err);
    res.status(500).json({ error: 'Failed to update the slot time.' });
  }
});

// POST /api/teacher/students — Create a new student
router.post('/students', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { name, student_id, password, mentor } = req.body;

    if (!name || !student_id || !password || !mentor?.trim()) {
      return res.status(400).json({ error: 'Name, Student ID, Mentor ID, and Password are all required.' });
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

    const mentorId = await getMentorId(mentor);

    // Hash the password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert new student into database
    const { data: result, error } = await supabase
      .from('users')
      .insert({
        student_id: student_id.toUpperCase(),
        name: name.trim(),
        mentor: mentorId,
        password_hash,
        role: 'student'
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: `Student "${name.trim()}" (${student_id.toUpperCase()}) created successfully.`,
      student: {
        id: result.id,
        student_id: student_id.toUpperCase(),
        name: name.trim(),
        mentor: result.mentor,
        role: 'student'
      }
    });
  } catch (err) {
    console.error('Create student error:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to create student. Please try again.' });
  }
});

// PUT /api/teacher/students/:studentId — Update a student's profile and mentor
router.put('/students/:studentId', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const studentId = decodeURIComponent(req.params.studentId || '').trim();
    const { name, mentor, password } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Student name is required.' });
    }

    if (!mentor?.trim()) {
      return res.status(400).json({ error: 'Mentor ID is required.' });
    }

    if (password && password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const { data: existing, error: existingError } = await supabase
      .from('users')
      .select('id, student_id')
      .ilike('student_id', studentId)
      .eq('role', 'student')
      .maybeSingle();

    if (existingError) {
      console.error('Find student for update error:', existingError);
      return res.status(500).json({ error: 'Could not find the student to update.' });
    }

    if (!existing) {
      return res.status(404).json({ error: `Student "${studentId}" not found.` });
    }

    const mentorId = await getMentorId(mentor);
    const updates = {
      name: name.trim(),
      mentor: mentorId
    };

    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    // Keep the mutation separate from the response read. This works with
    // Supabase projects whose UPDATE policies allow writes but do not allow
    // returning rows from UPDATE ... RETURNING.
    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', existing.id)
      .eq('role', 'student');

    if (updateError) throw updateError;

    const { data: updatedStudent, error: updatedStudentError } = await supabase
      .from('users')
      .select('id, student_id, name, mentor, role')
      .eq('id', existing.id)
      .eq('role', 'student')
      .maybeSingle();

    if (updatedStudentError) throw updatedStudentError;
    if (!updatedStudent) {
      return res.status(404).json({ error: `Student "${studentId}" could not be updated.` });
    }

    res.json({
      message: `Student "${updatedStudent.name}" updated successfully.`,
      student: updatedStudent
    });
  } catch (err) {
    console.error('Update student error:', {
      message: err.message,
      code: err.code,
      details: err.details,
      hint: err.hint
    });
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to update student. Please try again.' });
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
    await supabase.from('teacher_acknowledgements').delete().eq('student_id', studentId);
    await supabase.from('users').delete().eq('student_id', studentId).eq('role', 'student');

    res.json({ message: `Student "${existing.name}" (${studentId}) has been removed.` });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Failed to delete student.' });
  }
});

module.exports = router;
