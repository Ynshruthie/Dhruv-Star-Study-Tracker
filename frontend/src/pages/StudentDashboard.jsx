import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import ImageModal from '../components/ImageModal';
import confetti from 'canvas-confetti';
import { 
  Sun, Moon, CheckCircle2, Clock, Upload, BookOpen, 
  Sparkles, AlertCircle, FileCheck, Image as ImageIcon, Check, X
} from 'lucide-react';

const SUBJECT_OPTIONS = [
  'Mathematics (Calculus)',
  'Physics (Mechanics & Optics)',
  'Chemistry (Organic & Physical)',
  'Biology (Genetics & Botany)',
  'Computer Science & Coding',
  'English Literature',
  'History & Social Sciences',
  'Self Study / Revision'
];

const TIME_SLOT_PRESETS = [
  { morning: true, slot: '05:30 AM - 06:30 AM' },
  { morning: true, slot: '06:30 AM - 07:30 AM' },
  { morning: false, slot: '09:00 PM - 10:00 PM' },
  { morning: false, slot: '10:00 PM - 11:00 PM' }
];

export const StudentDashboard = () => {
  const { user, simulatedTime } = useContext(AuthContext);
  const [attendance, setAttendance] = useState(null);
  const [windowInfo, setWindowInfo] = useState(null);
  const [studyData, setStudyData] = useState({ isSubmitted: false, hours: [] });
  const [loading, setLoading] = useState(true);
  const [markingAtt, setMarkingAtt] = useState(false);
  const [submittingStudy, setSubmittingStudy] = useState(false);
  const [attError, setAttError] = useState('');
  const [studyError, setStudyError] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  // Form state for 4 hours
  const [formHours, setFormHours] = useState({
    1: { subject: 'Mathematics (Calculus)', time_slot: '05:30 AM - 06:30 AM', file: null, preview: null },
    2: { subject: 'Physics (Mechanics & Optics)', time_slot: '06:30 AM - 07:30 AM', file: null, preview: null },
    3: { subject: 'Chemistry (Organic & Physical)', time_slot: '09:00 PM - 10:00 PM', file: null, preview: null },
    4: { subject: 'English Literature', time_slot: '10:00 PM - 11:00 PM', file: null, preview: null }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [attRes, studyRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/study/today')
      ]);

      setAttendance(attRes.data);
      setWindowInfo(attRes.data.window);
      setStudyData(studyRes.data);
    } catch (err) {
      console.error('Failed to load student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [simulatedTime]);

  const handleMarkAttendance = async () => {
    setAttError('');
    setMarkingAtt(true);
    try {
      await api.post('/attendance/mark', {});
      await fetchData();
    } catch (err) {
      setAttError(err.response?.data?.error || 'Failed to mark attendance');
    } finally {
      setMarkingAtt(false);
    }
  };

  const handleFileChange = (hNum, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setFormHours(prev => ({
      ...prev,
      [hNum]: {
        ...prev[hNum],
        file,
        preview: previewUrl
      }
    }));
  };

  const handleInputChange = (hNum, field, val) => {
    setFormHours(prev => ({
      ...prev,
      [hNum]: {
        ...prev[hNum],
        [field]: val
      }
    }));
  };

  const handleStudySubmit = async (e) => {
    e.preventDefault();
    setStudyError('');

    // Check all 4 entries
    for (let h = 1; h <= 4; h++) {
      if (!formHours[h].subject) {
        setStudyError(`Please select a subject for Hour ${h}.`);
        return;
      }
      if (!formHours[h].time_slot) {
        setStudyError(`Please specify the study time for Hour ${h}.`);
        return;
      }
      if (!formHours[h].file) {
        setStudyError(`Please upload image proof of completed work for Hour ${h}.`);
        return;
      }
    }

    setSubmittingStudy(true);
    try {
      const formData = new FormData();
      for (let h = 1; h <= 4; h++) {
        formData.append(`subject_${h}`, formHours[h].subject);
        formData.append(`time_slot_${h}`, formHours[h].time_slot);
        formData.append(`image_${h}`, formHours[h].file);
      }

      await api.post('/study/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      await fetchData();
    } catch (err) {
      setStudyError(err.response?.data?.error || 'Failed to submit study tracker.');
    } finally {
      setSubmittingStudy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-400">Loading student profile &amp; study logs...</span>
        </div>
      </div>
    );
  }

  const isAttRecorded = attendance?.record != null;
  const isAttPresent = attendance?.status === 'PRESENT';
  const isAttWindowOpen = windowInfo?.isOpen || false;
  const isAttWindowClosed = windowInfo?.isAfter && !isAttRecorded;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Welcome Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dhruv Star Academy • Student Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome back, <span className="text-indigo-400">{user?.name}</span>
          </h1>
          <p className="text-sm text-slate-400">
            Student ID: <span className="font-mono text-slate-200 font-bold">{user?.student_id}</span> • Date: <span className="font-mono text-indigo-300">{attendance?.date}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Attendance Status</div>
            <div className="mt-1">
              <StatusBadge status={attendance?.status} type="attendance" />
            </div>
          </div>
          <div className="text-right pl-4 border-l border-slate-800">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Study Tracker</div>
            <div className="mt-1">
              <StatusBadge status={studyData.isSubmitted ? 'Submitted' : 'Pending'} type="study" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: MORNING ATTENDANCE (4:30 AM - 5:30 AM) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">1. Morning Attendance</h2>
              <p className="text-xs text-slate-400">Mandatory window: 4:30 AM – 5:30 AM daily</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">Step 1 of 2</span>
        </div>

        <div className="glass-card rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
          {attError && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{attError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            
            {/* Clock & Timing Info */}
            <div className="space-y-2">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Attendance Window</div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span className="text-xl font-bold font-mono text-white">04:30 AM – 05:30 AM</span>
              </div>
              <div className="text-xs text-slate-400">
                Current System Time: <span className="font-mono text-indigo-300 font-bold">{windowInfo?.timeFormatted}</span>
              </div>
            </div>

            {/* Status Message */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              {isAttRecorded ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-400">Attendance Recorded</div>
                    <div className="text-xs text-slate-400">
                      Marked at <span className="font-mono text-slate-200">{attendance.record.time}</span> on {attendance.record.date}
                    </div>
                  </div>
                </div>
              ) : isAttWindowOpen ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-400">Window Open Now</div>
                    <div className="text-xs text-slate-400">Please click the button to record today's attendance.</div>
                  </div>
                </div>
              ) : isAttWindowClosed ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-500/40 flex items-center justify-center text-rose-400">
                    <X className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-rose-400">Window Closed • Marked Absent</div>
                    <div className="text-xs text-slate-400">Morning attendance closed at 5:30 AM.</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-indigo-300">Upcoming Window</div>
                    <div className="text-xs text-slate-400">Opens at 04:30 AM tomorrow morning.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              {isAttRecorded ? (
                <button
                  disabled
                  className="w-full lg:w-auto px-6 py-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Attendance Verified</span>
                </button>
              ) : (
                <button
                  onClick={handleMarkAttendance}
                  disabled={markingAtt || (!isAttWindowOpen && !simulatedTime)}
                  className={`w-full lg:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition flex items-center justify-center gap-2 ${
                    isAttWindowOpen || simulatedTime
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/40 glow-green cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {markingAtt ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Sun className="w-5 h-5 text-amber-300" />
                      <span>Mark Attendance Now</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 2: DAILY 4-HOUR STUDY TRACKER */}
      <section className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">2. Daily Self-Study Tracker</h2>
              <p className="text-xs text-slate-400">
                4 compulsory hours required (2 Morning sessions + 2 Night sessions)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Progress:</span>
            <span className="text-indigo-400 font-bold">
              {studyData.isSubmitted ? '4 / 4 Complete' : `${Object.values(formHours).filter(h => h.file).length} / 4 Proofs Attached`}
            </span>
          </div>
        </div>

        {/* STUDY SUBMITTED VIEW */}
        {studyData.isSubmitted ? (
          <div className="glass-card rounded-2xl p-6 border border-emerald-500/30 space-y-6">
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-emerald-300">Daily Study Tracker Submitted Successfully!</h3>
                <p className="text-xs text-slate-300">
                  All 4 compulsory study hours for today have been verified and submitted to your teacher.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {studyData.hours.map((h) => (
                <div 
                  key={h.id}
                  onClick={() => setSelectedImage(h)}
                  className="bg-slate-950/90 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 space-y-3 cursor-pointer group transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                      Hour {h.hour_number}
                    </span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Submitted
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition">{h.subject}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-mono">
                      <Clock className="w-3 h-3 text-indigo-400" /> {h.time_slot}
                    </div>
                  </div>

                  <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-800 group-hover:border-indigo-500/40">
                    <img src={h.image_url} alt={`Hour ${h.hour_number}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-semibold text-white">
                      <span>Click to view proof</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* FORM VIEW FOR 4 COMPULSORY HOURS */
          <form onSubmit={handleStudySubmit} className="space-y-6">
            {!isAttPresent && (
              <div className="p-4 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs sm:text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                <span>
                  <strong>Notice:</strong> Please mark your morning attendance first to enable final submission.
                </span>
              </div>
            )}

            {studyError && (
              <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs sm:text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                <span>{studyError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((hNum) => {
                const isMorning = hNum <= 2;
                const hState = formHours[hNum];

                return (
                  <div 
                    key={hNum} 
                    className="glass-card glass-card-hover rounded-2xl p-5 border border-slate-800 space-y-4 relative"
                  >
                    {/* Header of Card */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isMorning ? 'bg-amber-950 text-amber-400 border border-amber-500/30' : 'bg-indigo-950 text-indigo-400 border border-indigo-500/30'
                        }`}>
                          H{hNum}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-white">Hour {hNum} Study Entry</span>
                          <span className="text-[11px] text-slate-400 ml-2">
                            ({isMorning ? 'Morning Session' : 'Night Session'})
                          </span>
                        </div>
                      </div>

                      {hState.file ? (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Proof Attached
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-400 bg-rose-950/80 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                          Required
                        </span>
                      )}
                    </div>

                    {/* Subject Select */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Select Subject *
                      </label>
                      <select
                        required
                        value={hState.subject}
                        onChange={(e) => handleInputChange(hNum, 'subject', e.target.value)}
                        className="w-full corporate-select text-sm"
                      >
                        {SUBJECT_OPTIONS.map((sub) => (
                          <option key={sub} value={sub} className="bg-slate-900 text-white">
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Time Slot Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Study Time (e.g. 5:30 AM–6:30 AM) *
                      </label>
                      <input
                        type="text"
                        required
                        value={hState.time_slot}
                        onChange={(e) => handleInputChange(hNum, 'time_slot', e.target.value)}
                        placeholder="e.g. 05:30 AM - 06:30 AM"
                        className="w-full corporate-input text-sm font-mono"
                      />
                    </div>

                    {/* Image Upload Area */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Upload Completed Work Photo *
                      </label>

                      {hState.preview ? (
                        <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950 p-2 flex items-center gap-3">
                          <img src={hState.preview} alt={`Hour ${hNum}`} className="w-16 h-16 object-cover rounded-lg border border-slate-800" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{hState.file.name}</div>
                            <div className="text-[11px] text-slate-400">{(hState.file.size / 1024).toFixed(1)} KB</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormHours(prev => ({ ...prev, [hNum]: { ...prev[hNum], file: null, preview: null } }))}
                            className="p-1.5 bg-rose-950 text-rose-300 hover:bg-rose-900 rounded-lg text-xs"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/40 hover:bg-slate-950/80 transition group">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-400 transition" />
                          <div className="text-center">
                            <span className="text-xs font-semibold text-indigo-400 group-hover:underline">Click to upload photo</span>
                            <span className="text-xs text-slate-500 block">PNG, JPG, WEBP up to 10MB</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            required
                            onChange={(e) => handleFileChange(hNum, e.target.files[0])}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Submit All 4 Hours Button */}
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400">
                <span className="text-amber-400 font-bold">Rule:</span> All 4 study hours must be completed with uploaded images before final submission. Only 1 submission allowed per day.
              </div>

              <button
                type="submit"
                disabled={submittingStudy || !isAttPresent}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-900/40 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingStudy ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    <span>Submit All 4 Study Hours</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </section>

      {/* Lightbox Preview Modal */}
      <ImageModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        hourData={selectedImage}
        studentName={user?.name}
      />
    </div>
  );
};

export default StudentDashboard;
