const express = require('express');
const { supabase } = require('../db');
const { authenticateToken, enforceStudentScope } = require('../middleware/auth');

const router = express.Router();

// Helper to determine attendance window status given a time (HH:MM or Date)
const checkAttendanceWindow = (timeStr, simHeader) => {
  // If simulated header or param is provided (e.g. "05:00"), parse it
  let hour, minute;
  if (simHeader && typeof simHeader === 'string' && simHeader.includes(':')) {
    const parts = simHeader.split(':');
    hour = parseInt(parts[0], 10);
    minute = parseInt(parts[1], 10);
  } else {
    const now = new Date();
    hour = now.getHours();
    minute = now.getMinutes();
  }

  const currentMinutes = hour * 60 + minute;
  const windowStartMinutes = 4 * 60 + 30; // 4:30 AM = 270 mins
  const windowEndMinutes = 5 * 60 + 30;   // 5:30 AM = 330 mins

  const isOpen = currentMinutes >= windowStartMinutes && currentMinutes <= windowEndMinutes;
  const isBefore = currentMinutes < windowStartMinutes;
  const isAfter = currentMinutes > windowEndMinutes;

  return {
    isOpen,
    isBefore,
    isAfter,
    currentMinutes,
    timeFormatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  };
};

// Helper to get formatted today's date string YYYY-MM-DD
const getTodayDateString = (customDate) => {
  if (customDate) return customDate;
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// GET /api/attendance/today
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const student_id = req.user.student_id;
    const date = getTodayDateString(req.query.date);
    const simTime = req.headers['x-simulated-time'] || req.query.simulated_time;

    const windowInfo = checkAttendanceWindow(null, simTime);
    
    const { data: record, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student_id)
      .eq('date', date)
      .single();

    let calculatedStatus = 'PENDING';
    if (record) {
      calculatedStatus = record.status; // PRESENT or ABSENT
    } else if (windowInfo.isAfter) {
      calculatedStatus = 'ABSENT'; // Automatically absent after 5:30 AM if un-marked
    }

    res.json({
      date,
      record: record || null,
      status: calculatedStatus,
      window: windowInfo
    });
  } catch (err) {
    console.error('Error fetching today attendance:', err);
    res.status(500).json({ error: 'Failed to fetch attendance status' });
  }
});

// POST /api/attendance/mark
router.post('/mark', authenticateToken, async (req, res) => {
  try {
    const student_id = req.user.student_id;
    const student_name = req.user.name;
    const date = getTodayDateString(req.body.date);
    const simTime = req.headers['x-simulated-time'] || req.body.simulated_time;

    // Check existing attendance record
    const { data: existing } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student_id)
      .eq('date', date)
      .single();

    if (existing) {
      return res.status(400).json({
        error: 'Attendance has already been recorded for today.',
        record: existing
      });
    }

    // Enforce attendance window strictly. A student must mark during the allowed window;
    // otherwise they remain absent for the day.
    const windowInfo = checkAttendanceWindow(null, simTime);

    if (!windowInfo.isOpen) {
      return res.status(400).json({
        error: `Morning attendance is only allowed from 4:30 AM to 5:30 AM. Current time: ${windowInfo.timeFormatted}`,
        window: windowInfo
      });
    }

    // Format display time e.g., "05:12 AM"
    const now = new Date();
    const displayTime = simTime 
      ? `${simTime} ${parseInt(simTime.split(':')[0], 10) >= 12 ? 'PM' : 'AM'}`
      : now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const { data: newRecord, error } = await supabase
      .from('attendance')
      .insert({ student_id, date, time: displayTime, status: 'PRESENT' })
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Attendance marked successfully!',
      student_id,
      student_name,
      date,
      time: displayTime,
      record: newRecord
    });
  } catch (err) {
    console.error('Error marking attendance:', err);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

module.exports = router;
