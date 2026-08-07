import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../context/AuthContextDefinition';
import api from '../utils/api';
import ImageModal from '../components/ImageModal';
import { AlertCircle, BookOpen, CalendarClock, CheckCircle2, Clock3, ImagePlus, Play, Save, ThumbsUp, Timer, Upload } from 'lucide-react';

const SUBJECT_OPTIONS = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'Social', 'Kannada', 'Hindi', 'English', 'Self Study', 'Notes Completion', 'Project', 'Exam Preparation'];
const DEFAULT_SLOTS = [
  { subject: 'Mathematics', planned_start: '05:30', planned_end: '06:30', manager_type: 'SELF' },
  { subject: 'Science', planned_start: '06:30', planned_end: '07:30', manager_type: 'SELF' },
  { subject: 'English', planned_start: '20:00', planned_end: '21:00', manager_type: 'PARENT' },
  { subject: 'Physics', planned_start: '21:00', planned_end: '22:00', manager_type: 'SELF' }
];

const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const getUpcomingWeekStart = () => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() + (today.getDay() === 0 ? 1 : (8 - today.getDay()) % 7));
  return formatDate(monday);
};
const formatWeekRange = (weekStart) => {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 5);
  const formatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, formatOptions)} – ${end.toLocaleDateString(undefined, { ...formatOptions, year: 'numeric' })}`;
};
const timeToMinutes = (time) => {
  if (!time || !time.includes(':')) return null;
  const [hours, minutes] = time.split(':').map(Number);
  return Number.isNaN(hours) || Number.isNaN(minutes) ? null : (hours * 60) + minutes;
};
const formatCountdown = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
const REVIEW_REFRESH_INTERVAL_MS = 3_000;
const buildFormSlots = () => DEFAULT_SLOTS.map((slot) => ({ ...slot }));
const buildEmptyHours = () => [1, 2, 3, 4].map((hourNumber) => ({
  hour_number: hourNumber, subject: '', scheduled_time_slot: '', attendance_status: 'UNSCHEDULED', manager_type: 'SELF',
  mark_button_enabled: false, upload_window_open: false, image_urls: [], photo_count: 0
}));

const statusStyles = {
  PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200', ABSENT: 'bg-rose-50 text-rose-700 border-rose-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200', PARENT: 'bg-violet-50 text-violet-700 border-violet-200',
  UNSCHEDULED: 'bg-slate-100 text-slate-600 border-slate-200'
};
const statusLabels = { PRESENT: 'Present', ABSENT: 'Absent', PENDING: 'Waiting', PARENT: 'Parent', UNSCHEDULED: 'Not Scheduled' };

export const StudentDashboard = () => {
  const { user, simulatedTime } = useContext(AuthContext);
  const [weekStart, setWeekStart] = useState(getUpcomingWeekStart);
  const [selectedBookingDate, setSelectedBookingDate] = useState(getUpcomingWeekStart);
  const [date, setDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [hours, setHours] = useState(buildEmptyHours);
  const [teacherAcknowledgement, setTeacherAcknowledgement] = useState(null);
  const [formSlots, setFormSlots] = useState(buildFormSlots);
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [weeklyPlanSaved, setWeeklyPlanSaved] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [uploadingHour, setUploadingHour] = useState(null);
  const [markingHour, setMarkingHour] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [now, setNow] = useState(Date.now());
  const bookingOpen = new Date().getDay() === 0;
  const bookingAllowedForWeek = bookingOpen && weekStart === getUpcomingWeekStart();

  const fetchToday = useCallback(async ({ showLoader = false } = {}) => {
    if (showLoader) setLoading(true);
    try {
      const { data } = await api.get('/study/today');
      const nextHours = buildEmptyHours();
      (data.hours || []).forEach((hour) => { nextHours[hour.hour_number - 1] = hour; });
      setHours(nextHours);
      setDate(data.date);
      setCurrentTime(data.current_time_label);
      setTeacherAcknowledgement(data.teacher_acknowledgement || null);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
      setError('Failed to load today’s student slots.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const fetchWeeklyPlan = useCallback(async () => {
    try {
      const { data } = await api.get(`/study/week?week_start=${weekStart}`);
      const daySlots = data.by_date[selectedBookingDate] || [];
      if (daySlots.length !== 4 || !daySlots.every((slot) => slot.booking_confirmed_at)) {
        setWeeklyPlanSaved(false);
        setFormSlots(buildFormSlots());
        return;
      }
      const nextFormSlots = buildFormSlots();
      daySlots.forEach((hour) => {
        nextFormSlots[hour.hour_number - 1] = {
          subject: hour.subject, planned_start: hour.planned_start, planned_end: hour.planned_end, manager_type: hour.manager_type
        };
      });
      setFormSlots(nextFormSlots);
      setWeeklyPlanSaved(true);
    } catch (err) {
      console.error('Failed to load weekly plan:', err);
      setError('Failed to load the upcoming weekly plan.');
    }
  }, [selectedBookingDate, weekStart]);

  useEffect(() => {
    fetchToday({ showLoader: true });
    fetchWeeklyPlan();
  }, [fetchToday, fetchWeeklyPlan, simulatedTime, weekStart]);

  useEffect(() => {
    // Keep the review card in sync when a teacher acknowledges work in their dashboard.
    const refreshTimer = window.setInterval(fetchToday, REVIEW_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(refreshTimer);
  }, [fetchToday, simulatedTime]);

  useEffect(() => {
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(clockTimer);
  }, []);

  const getUploadCountdownSeconds = (hour) => {
    const deadlineMinutes = timeToMinutes(hour.upload_window_end);
    if (deadlineMinutes == null) return 0;

    // Simulated time is intentionally fixed, so show the countdown at its
    // selected minute instead of advancing it with the computer clock.
    const currentMinutes = simulatedTime ? timeToMinutes(simulatedTime) : ((new Date(now).getHours() * 60) + new Date(now).getMinutes());
    if (currentMinutes == null) return 0;

    let remainingMinutes = deadlineMinutes - currentMinutes;
    if (remainingMinutes < 0) remainingMinutes += 24 * 60;
    const elapsedSecondsInMinute = simulatedTime ? 0 : new Date(now).getSeconds();
    return Math.max(0, (remainingMinutes * 60) - elapsedSecondsInMinute);
  };

  const scheduledCount = useMemo(() => hours.filter((hour) => hour.attendance_status !== 'UNSCHEDULED').length, [hours]);
  const selfCount = useMemo(() => formSlots.filter((slot) => slot.manager_type === 'SELF').length, [formSlots]);
  const bookingDates = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const day = new Date(`${weekStart}T00:00:00`);
    day.setDate(day.getDate() + index);
    return {
      key: formatDate(day),
      weekday: day.toLocaleDateString(undefined, { weekday: 'short' }),
      day: day.toLocaleDateString(undefined, { day: 'numeric' }),
      month: day.toLocaleDateString(undefined, { month: 'short' })
    };
  }), [weekStart]);
  const slotsLocked = !bookingAllowedForWeek;

  const updateFormSlot = (index, field, value) => {
    setFormSlots((previous) => previous.map((slot, slotIndex) => slotIndex === index ? { ...slot, [field]: value } : slot));
    setMessage('');
    setError('');
  };

  const handleSaveSchedule = async (event) => {
    event.preventDefault();
    setSavingSchedule(true);
    setMessage('');
    setError('');
    try {
      await api.post('/study/schedule/day', { date: selectedBookingDate, slots: formSlots });
      setWeeklyPlanSaved(true);
      setMessage(`Your plan for ${selectedBookingDate} has been saved.`);
      const { data: weekData } = await api.get(`/study/week?week_start=${weekStart}`);
      const weekIsComplete = weekData.dates.every((day) => {
        const daySlots = weekData.by_date[day] || [];
        return daySlots.length === 4 && daySlots.every((slot) => slot.booking_confirmed_at);
      });
      if (weekIsComplete) {
        const nextWeek = new Date(`${weekStart}T00:00:00`);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStart = formatDate(nextWeek);
        setWeekStart(nextWeekStart);
        setSelectedBookingDate(nextWeekStart);
        setWeeklyPlanSaved(false);
        setFormSlots(buildFormSlots());
        setMessage(`All six days are booked. The next week (${formatWeekRange(nextWeekStart)}) is shown and opens for booking next Sunday.`);
      } else {
        await fetchWeeklyPlan();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save the weekly plan.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleUpload = async (hourNumber, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setUploadingHour(hourNumber);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));
      const { data } = await api.post(`/study/slots/${hourNumber}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage(`Uploaded ${data.hour.photo_count} photo${data.hour.photo_count === 1 ? '' : 's'} for Slot ${hourNumber}.`);
      await fetchToday();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload photos.');
    } finally {
      setUploadingHour(null);
    }
  };

  const handleStart = async (hourNumber) => {
    setMarkingHour(hourNumber);
    setMessage('');
    setError('');
    try {
      const { data } = await api.post(`/study/slots/${hourNumber}/mark`, {});
      setMessage(`Slot ${hourNumber} started at ${data.hour.actual_start}. Your study session ends at ${data.hour.actual_end}.`);
      await fetchToday();
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to start this slot.');
    } finally {
      setMarkingHour(null);
    }
  };

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="clean-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full"><BookOpen className="w-3.5 h-3.5" /><span>Dhruv Star Academy • Student Dashboard</span></div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Students Lead the Day for <span className="text-blue-600">{user?.name}</span></h1>
          <p className="text-sm text-slate-500">On Sunday, choose a Monday–Saturday date, then set its four study slots. Each day is saved separately.</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <div>Upcoming Week: <span className="font-semibold text-slate-900">{formatWeekRange(weekStart)}</span></div>
          <div>Booking: <span className={`font-semibold ${bookingAllowedForWeek ? 'text-emerald-700' : 'text-amber-700'}`}>{bookingAllowedForWeek ? 'Open today' : 'Opens next Sunday'}</span></div>
          <div>Today: <span className="font-mono font-semibold text-slate-900">{date}</span> · <span className="font-mono font-semibold text-blue-700">{currentTime}</span></div>
          <div>Today&apos;s Slots: <span className="font-mono font-semibold text-slate-900">{scheduledCount} / 4</span></div>
        </div>
      </div>

      {(error || message) && <div className={`p-4 rounded-xl border text-sm flex items-start gap-3 ${error ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{error ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}<span>{error || message}</span></div>}

      <form onSubmit={handleSaveSchedule} className="clean-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-bold text-slate-900">Plan 4 Slots for a Day</h2><p className="text-sm text-slate-500">On Sunday, click a day below to open and manage that date&apos;s independent four-slot plan.</p></div>
          <div className="flex gap-3 text-xs font-semibold"><span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Self: {selfCount}</span><span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Parent: {4 - selfCount}</span></div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarClock className="w-4 h-4 text-blue-600" />Select a study day</div><span className={`text-xs font-semibold ${bookingAllowedForWeek ? 'text-emerald-700' : 'text-amber-700'}`}>{bookingAllowedForWeek ? 'Sunday booking is open' : 'Booking opens next Sunday'}</span></div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">{bookingDates.map((bookingDate) => <button type="button" key={bookingDate.key} onClick={() => { setSelectedBookingDate(bookingDate.key); setWeeklyPlanSaved(false); setFormSlots(buildFormSlots()); setMessage(''); setError(''); }} aria-pressed={selectedBookingDate === bookingDate.key} className={`rounded-lg border px-2 py-2.5 text-center transition ${selectedBookingDate === bookingDate.key ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-blue-200 bg-white text-slate-600 hover:border-blue-400 hover:bg-blue-50'}`}><div className="text-[11px] font-bold uppercase tracking-wide">{bookingDate.weekday}</div><div className="text-lg font-extrabold leading-tight">{bookingDate.day}</div><div className="text-[11px]">{bookingDate.month}</div></button>)}</div>
          <p className="mt-3 text-xs text-slate-600">The active day is highlighted. Its saved slots load automatically when you select it.</p>
        </div>
        {!bookingAllowedForWeek && <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><CalendarClock className="w-5 h-5 shrink-0" /><span>You can view each day&apos;s slots now, but booking and changes open on the Sunday before this week.</span></div>}
        {weeklyPlanSaved && <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="w-5 h-5 shrink-0" /><span>Four slots are saved for {selectedBookingDate}.</span></div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {formSlots.map((slot, index) => <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between"><div><div className="text-sm font-bold text-slate-900">Slot {index + 1}</div><div className="text-xs text-slate-500">{slotsLocked ? 'Booking opens Sunday' : 'Choose subject, time and owner'}</div></div><span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200">{slot.manager_type === 'SELF' ? 'Student Handles' : 'Parent Handles'}</span></div>
            <select value={slot.subject} onChange={(event) => updateFormSlot(index, 'subject', event.target.value)} disabled={slotsLocked} className="w-full corporate-select text-sm disabled:opacity-60">{SUBJECT_OPTIONS.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select>
            <div className="grid grid-cols-2 gap-4"><input aria-label={`Slot ${index + 1} start time`} type="time" value={slot.planned_start} onChange={(event) => updateFormSlot(index, 'planned_start', event.target.value)} disabled={slotsLocked} className="w-full corporate-input text-sm disabled:opacity-60" /><input aria-label={`Slot ${index + 1} end time`} type="time" value={slot.planned_end} onChange={(event) => updateFormSlot(index, 'planned_end', event.target.value)} disabled={slotsLocked} className="w-full corporate-input text-sm disabled:opacity-60" /></div>
            <div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => updateFormSlot(index, 'manager_type', 'SELF')} disabled={slotsLocked} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${slot.manager_type === 'SELF' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>Self</button><button type="button" onClick={() => updateFormSlot(index, 'manager_type', 'PARENT')} disabled={slotsLocked} className={`rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${slot.manager_type === 'PARENT' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'}`}>Parent</button></div>
          </div>)}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4"><p className="text-sm text-slate-500">{bookingAllowedForWeek ? `Save the four slots for ${selectedBookingDate}. Click another day to continue planning it.` : 'Booking is locked until the Sunday before this week.'}</p><button type="submit" disabled={savingSchedule || slotsLocked} className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md transition flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /><span>{savingSchedule ? 'Saving Day...' : slotsLocked ? 'Booking Opens Sunday' : weeklyPlanSaved ? 'Update Day Plan' : 'Save Day Plan'}</span></button></div>
      </form>

      <div className="clean-card p-6 space-y-2"><div className="flex items-center gap-2 text-slate-900"><CalendarClock className="w-5 h-5 text-blue-600" /><h2 className="text-lg font-bold">Today&apos;s Slot Tracking</h2></div><p className="text-sm text-slate-500">Self slots can start during the first 15 minutes, run for one hour from the actual start time, then allow proof uploads for 15 minutes. Parent slots stay unchanged.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hours.map((hour) => {
          const unscheduled = hour.attendance_status === 'UNSCHEDULED';
          const selfManaged = hour.manager_type !== 'PARENT';
          const uploadCountdownSeconds = getUploadCountdownSeconds(hour);
          const canUpload = selfManaged && hour.upload_window_open && uploadCountdownSeconds > 0;
          const canStart = selfManaged && hour.mark_button_enabled;
          return <div key={hour.hour_number} className="clean-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3"><div><div className="text-sm font-bold text-slate-900">{hour.subject || `Slot ${hour.hour_number}`}</div><div className="text-xs text-slate-500">{unscheduled ? 'No slot scheduled today' : hour.scheduled_time_slot}</div></div><span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusStyles[hour.attendance_status]}`}>{statusLabels[hour.attendance_status]}</span></div>
            <div className="space-y-2 text-sm text-slate-600"><div className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-slate-400" /><span>{hour.active_time_slot || hour.scheduled_time_slot || '--'}</span></div><div className="flex items-center gap-2"><ImagePlus className="w-4 h-4 text-slate-400" /><span>Uploaded Photos: {hour.photo_count || 0}</span></div></div>
            {selfManaged && canStart && <button type="button" onClick={() => handleStart(hour.hour_number)} disabled={markingHour === hour.hour_number} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"><Play className="w-4 h-4" /><span>{markingHour === hour.hour_number ? 'Starting...' : 'Start Study Session'}</span></button>}
            {selfManaged && hour.attendance_status === 'PENDING' && !canStart && !unscheduled && <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">Start is available from {hour.start_window_label}. After that 15-minute grace period, this slot is marked absent.</div>}
            {selfManaged && hour.study_warning && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2"><Timer className="w-4 h-4 shrink-0" /><span><strong>{hour.study_remaining_minutes} minutes left</strong> to complete this one-hour study session.</span></div>}
            {selfManaged && hour.attendance_status === 'PRESENT' && !canUpload && hour.study_remaining_minutes != null && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-800">Study in progress. Photo upload opens after your session ends.</div>}
            {selfManaged && canUpload && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-center gap-2"><Timer className="w-4 h-4 shrink-0" /><span>Upload time remaining: <strong className="font-mono">{formatCountdown(uploadCountdownSeconds)}</strong></span></div>}
            {selfManaged && !unscheduled && <label className={`w-full border-2 border-dashed rounded-xl px-4 py-4 flex flex-col items-center justify-center gap-2 text-center ${canUpload ? 'border-blue-300 bg-blue-50 cursor-pointer' : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'}`}><Upload className="w-5 h-5" /><span className="text-sm font-semibold">{uploadingHour === hour.hour_number ? 'Uploading...' : 'Upload Slot Photos'}</span><span className="text-xs">{canUpload ? `Upload before ${hour.upload_window_end}.` : 'Available for 15 minutes after the study session ends.'}</span><input type="file" accept="image/*" multiple disabled={!canUpload || uploadingHour === hour.hour_number} onChange={(event) => handleUpload(hour.hour_number, event.target.files)} className="hidden" /></label>}
            {!selfManaged && !unscheduled && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">This parent-managed slot is completed from the Parent Dashboard.</div>}
            {hour.image_urls?.length > 0 && <div className="flex flex-wrap gap-2">{hour.image_urls.map((imageUrl, index) => <button type="button" key={`${hour.hour_number}-${index}`} onClick={() => setSelectedImage(hour)} className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200"><img src={imageUrl} alt={`Slot ${hour.hour_number} proof ${index + 1}`} className="w-full h-full object-cover" /></button>)}</div>}
          </div>;
        })}
      </div>
      <section className={`teacher-review-card clean-card relative overflow-hidden p-5 border ${teacherAcknowledgement ? 'teacher-review-card--acknowledged' : 'teacher-review-card--pending'}`} aria-label="Teacher review">
        <div className="relative z-10 flex items-start gap-3">
          <div className={`teacher-review-icon mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${teacherAcknowledgement ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-300 text-amber-950'}`}>
            {teacherAcknowledgement ? <ThumbsUp className="h-5 w-5 fill-current" /> : <Clock3 className="h-5 w-5" />}
          </div>
          <div className="space-y-1.5">
            <h2 className="text-sm font-bold text-white">Teacher Review</h2>
            {teacherAcknowledgement ? <>
              <p className="text-sm text-emerald-100">Your teacher has corrected and acknowledged today&apos;s uploaded work.</p>
              {teacherAcknowledgement.comment && <p className="text-sm text-emerald-200">Teacher&apos;s comment: {teacherAcknowledgement.comment}</p>}
              <p className="text-[11px] text-emerald-300">Reviewed by {teacherAcknowledgement.teacher_id} · {new Date(teacherAcknowledgement.acknowledged_at).toLocaleString()}</p>
            </> : <p className="text-sm text-amber-100">No teacher review yet. Uploaded work will show as corrected here after your teacher acknowledges it.</p>}
          </div>
        </div>
      </section>
      <ImageModal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} hourData={selectedImage} studentName={user?.name} />
    </div>
  );
};

export default StudentDashboard;
