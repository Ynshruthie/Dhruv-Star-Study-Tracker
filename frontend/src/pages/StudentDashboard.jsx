import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import ImageModal from '../components/ImageModal';
import confetti from 'canvas-confetti';
import { 
  Sun, CheckCircle2, Clock, Upload, BookOpen, 
  Sparkles, AlertCircle, FileCheck, Check, X
} from 'lucide-react';

const SUBJECT_OPTIONS = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Social',
  'Kannada',
  'Hindi',
  'English',
  'Self Study',
  'Notes Completion',
  'Project',
  'Exam Preparation'
];

const buildDefaultFormHours = () => ({
  1: { subject: 'Mathematics', time_slot: '05:30 AM - 06:30 AM', files: [], previews: [] },
  2: { subject: 'Physics (Mechanics & Optics)', time_slot: '06:30 AM - 07:30 AM', files: [], previews: [] },
  3: { subject: 'Chemistry (Organic & Physical)', time_slot: '09:00 PM - 10:00 PM', files: [], previews: [] },
  4: { subject: 'English Literature', time_slot: '10:00 PM - 11:00 PM', files: [], previews: [] }
});

const getStudyDraftKey = (studentId, date) => {
  if (!studentId || !date) return null;
  return `dhruv_study_draft_${studentId}_${date}`;
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Failed to read file'));
  reader.readAsDataURL(file);
});

const dataUrlToFile = (dataUrl, fileName, mimeType) => {
  const cleanDataUrl = dataUrl.split(',')[1];
  if (!cleanDataUrl) return null;

  const binary = atob(cleanDataUrl);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], fileName || 'photo', { type: mimeType || 'image/png' });
};

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
  const [draftStatus, setDraftStatus] = useState('');

  // Form state for 4 hours (now supporting multiple files)
  const [formHours, setFormHours] = useState(buildDefaultFormHours);

  const saveStudyDraft = async (draftHours = formHours, mode = 'auto') => {
    if (!user?.student_id || !attendance?.date) return;

    const draftKey = getStudyDraftKey(user.student_id, attendance.date);
    if (!draftKey) return;

    const draftPayload = {};
    for (let h = 1; h <= 4; h++) {
      const hourState = draftHours[h] || buildDefaultFormHours()[h];
      const fileData = await Promise.all((hourState.files || []).map(async (file) => {
        if (!file || typeof file === 'string') return null;
        const dataUrl = await readFileAsDataUrl(file);
        return {
          name: file.name || `hour-${h}-photo-${Date.now()}`,
          type: file.type || 'image/png',
          dataUrl
        };
      }));

      draftPayload[h] = {
        subject: hourState.subject || '',
        time_slot: hourState.time_slot || '',
        fileData: fileData.filter(Boolean)
      };
    }

    localStorage.setItem(draftKey, JSON.stringify(draftPayload));
    setDraftStatus(mode === 'manual' ? 'Draft saved.' : 'Auto-saved.');
  };

  const restoreStudyDraft = () => {
    if (!user?.student_id || !attendance?.date) return null;

    const draftKey = getStudyDraftKey(user.student_id, attendance.date);
    if (!draftKey) return null;

    try {
      const rawDraft = localStorage.getItem(draftKey);
      if (!rawDraft) return null;

      const parsedDraft = JSON.parse(rawDraft);
      const restored = buildDefaultFormHours();

      for (let h = 1; h <= 4; h++) {
        const savedHour = parsedDraft[h] || {};
        const savedFiles = Array.isArray(savedHour.fileData) ? savedHour.fileData : [];

        restored[h] = {
          subject: savedHour.subject || restored[h].subject,
          time_slot: savedHour.time_slot || restored[h].time_slot,
          files: savedFiles
            .map(fileData => dataUrlToFile(fileData.dataUrl, fileData.name, fileData.type))
            .filter(Boolean),
          previews: savedFiles.map(fileData => fileData.dataUrl).filter(Boolean)
        };
      }

      setDraftStatus('Draft restored.');
      return restored;
    } catch (error) {
      console.error('Failed to restore study draft:', error);
      return null;
    }
  };

  const clearStudyDraft = () => {
    if (!user?.student_id || !attendance?.date) return;
    const draftKey = getStudyDraftKey(user.student_id, attendance.date);
    if (draftKey) localStorage.removeItem(draftKey);
  };

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

  useEffect(() => {
    if (!user || !attendance?.date || studyData.isSubmitted) return;

    const restoredDraft = restoreStudyDraft();
    if (restoredDraft) {
      setFormHours(restoredDraft);
    }
  }, [user, attendance?.date, studyData.isSubmitted]);

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

  const handleInputChange = (hNum, field, val) => {
    setFormHours(prev => {
      const nextState = {
        ...prev,
        [hNum]: {
          ...prev[hNum],
          [field]: val
        }
      };
      saveStudyDraft(nextState, 'auto');
      return nextState;
    });
  };

  const handleFileChange = async (hNum, selectedFileList) => {
    if (!selectedFileList || selectedFileList.length === 0) return;
    const selectedFiles = Array.from(selectedFileList);

    const currentFiles = formHours[hNum].files || [];
    const newFiles = [...currentFiles, ...selectedFiles].slice(0, 25);
    const newPreviews = await Promise.all(newFiles.map(file => readFileAsDataUrl(file)));

    const nextState = {
      ...formHours,
      [hNum]: {
        ...formHours[hNum],
        files: newFiles,
        previews: newPreviews
      }
    };

    setFormHours(nextState);
    await saveStudyDraft(nextState, 'auto');
  };

  const removeFile = (hNum, indexToRemove) => {
    setFormHours(prev => {
      const hState = prev[hNum];
      const newFiles = hState.files.filter((_, i) => i !== indexToRemove);
      const newPreviews = hState.previews.filter((_, i) => i !== indexToRemove);
      return {
        ...prev,
        [hNum]: { ...hState, files: newFiles, previews: newPreviews }
      };
    });
  };

  const handleStudySubmit = async (e) => {
    e.preventDefault();
    setStudyError('');

    for (let h = 1; h <= 4; h++) {
      if (!formHours[h].subject) {
        setStudyError(`Please select a subject for Hour ${h}.`);
        return;
      }
      if (!formHours[h].time_slot) {
        setStudyError(`Please specify the study time for Hour ${h}.`);
        return;
      }
      if (!formHours[h].files || formHours[h].files.length === 0) {
        setStudyError(`Please upload at least one image proof of completed work for Hour ${h}.`);
        return;
      }
    }

    setSubmittingStudy(true);
    try {
      const formData = new FormData();
      for (let h = 1; h <= 4; h++) {
        formData.append(`subject_${h}`, formHours[h].subject);
        formData.append(`time_slot_${h}`, formHours[h].time_slot);
        if (formHours[h].files) {
          formHours[h].files.forEach(f => formData.append(`image_${h}`, f));
        }
      }

      await api.post('/study/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearStudyDraft();
      setDraftStatus('Submitted successfully.');
      setFormHours(buildDefaultFormHours());

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
          <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Loading student profile &amp; study logs...</span>
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
      <div className="clean-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dhruv Star Academy • Student Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, <span className="text-blue-600">{user?.name}</span>
          </h1>
          <p className="text-sm text-slate-500">
            Student ID: <span className="font-mono text-slate-900 font-bold">{user?.student_id}</span> • Date: <span className="font-mono text-blue-700 font-medium">{attendance?.date}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Attendance Status</div>
            <div className="mt-1">
              <StatusBadge status={attendance?.status} type="attendance" />
            </div>
          </div>
          <div className="text-right pl-4 border-l border-slate-200">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Study Tracker</div>
            <div className="mt-1">
              <StatusBadge status={studyData.isSubmitted ? 'Submitted' : 'Pending'} type="study" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: MORNING ATTENDANCE */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">1. Morning Attendance</h2>
              <p className="text-xs text-slate-500">Mandatory window: 4:30 AM – 5:30 AM daily</p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 font-medium">Step 1 of 2</span>
        </div>

        <div className="clean-card p-6">
          {attError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{attError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            
            {/* Clock & Timing Info */}
            <div className="space-y-1.5">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Attendance Window</div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <span className="text-xl font-bold font-mono text-slate-900">04:30 AM – 05:30 AM</span>
              </div>
              <div className="text-xs text-slate-500">
                Current System Time: <span className="font-mono text-slate-900 font-bold">{windowInfo?.timeFormatted}</span>
              </div>
            </div>

            {/* Status Message */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              {isAttRecorded ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-800">Attendance Recorded</div>
                    <div className="text-xs text-slate-600">
                      Marked at <span className="font-mono font-bold text-slate-900">{attendance.record.time}</span> on {attendance.record.date}
                    </div>
                  </div>
                </div>
              ) : isAttWindowOpen ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 animate-pulse">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-800">Window Open Now</div>
                    <div className="text-xs text-slate-600">Please click the button to record today's attendance.</div>
                  </div>
                </div>
              ) : isAttWindowClosed ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700">
                    <X className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-rose-800">Window Closed • Marked Absent</div>
                    <div className="text-xs text-slate-600">Morning attendance closed at 5:30 AM.</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-900">Upcoming Window</div>
                    <div className="text-xs text-slate-600">Opens at 04:30 AM tomorrow morning.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex justify-end">
              {isAttRecorded ? (
                <button
                  disabled
                  className="w-full lg:w-auto px-6 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Attendance Verified</span>
                </button>
              ) : (
                <button
                  onClick={handleMarkAttendance}
                  disabled={markingAtt || (!isAttWindowOpen && !simulatedTime)}
                  className={`w-full lg:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white shadow-md transition flex items-center justify-center gap-2 ${
                    isAttWindowOpen || simulatedTime
                      ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                      : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
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
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">2. Daily Self-Study Tracker</h2>
              <p className="text-xs text-slate-500">
                4 compulsory hours required (2 Morning sessions + 2 Night sessions)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono">
            <span className="text-slate-500">Progress:</span>
            <span className="text-blue-700 font-bold">
              {studyData.isSubmitted ? '4 / 4 Complete' : `${Object.values(formHours).filter(h => h.file).length} / 4 Proofs Attached`}
            </span>
          </div>
        </div>

        {/* STUDY SUBMITTED VIEW */}
        {studyData.isSubmitted ? (
          <div className="clean-card p-6 space-y-6">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-emerald-900">Daily Study Tracker Submitted Successfully!</h3>
                <p className="text-xs text-emerald-700">
                  All 4 compulsory study hours for today have been verified and submitted to your teacher.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {studyData.hours.map((h) => (
                <div 
                  key={h.id}
                  onClick={() => setSelectedImage(h)}
                  className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-4 space-y-3 cursor-pointer group transition shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      Hour {h.hour_number}
                    </span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Submitted
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">{h.subject}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-400" /> {h.time_slot}
                    </div>
                  </div>

                  <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group-hover:border-blue-300">
                    <img src={h.image_url} alt={`Hour ${h.hour_number}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-xs font-semibold text-white">
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
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <span>
                  <strong>Notice:</strong> Please mark your morning attendance first to enable final submission.
                </span>
              </div>
            )}

            {studyError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
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
                    className="clean-card clean-card-hover p-5 space-y-4"
                  >
                    {/* Header of Card */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isMorning ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          H{hNum}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900">Hour {hNum} Study Entry</span>
                          <span className="text-[11px] text-slate-500 ml-2">
                            ({isMorning ? 'Morning Session' : 'Night Session'})
                          </span>
                        </div>
                      </div>

                      {hState.files && hState.files.length > 0 ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Check className="w-3.5 h-3.5" /> {hState.files.length} Photo{hState.files.length > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full shadow-sm">
                          Required
                        </span>
                      )}
                    </div>

                    {/* Subject Select */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Select Subject *
                      </label>
                      <select
                        required
                        value={hState.subject}
                        onChange={(e) => handleInputChange(hNum, 'subject', e.target.value)}
                        className="w-full corporate-select text-sm"
                      >
                        {SUBJECT_OPTIONS.map((sub) => (
                          <option key={sub} value={sub}>
                            {sub}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Time Slot Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
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
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Upload Completed Work Photos *
                        </label>
                        {hState.files && hState.files.length > 0 && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {hState.files.length} / 25
                          </span>
                        )}
                      </div>

                      {/* Thumbnail Grid for Uploaded Photos */}
                      {hState.files && hState.files.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          {hState.previews.map((prevUrl, idx) => (
                            <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-300 w-16 h-16 shadow-sm">
                              <img src={prevUrl} alt={`Preview ${idx+1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeFile(hNum, idx)}
                                className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              >
                                <div className="w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white shadow">
                                  <X className="w-3.5 h-3.5" />
                                </div>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload Button */}
                      {(!hState.files || hState.files.length < 25) && (
                        <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition group">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition" />
                          <div className="text-center">
                            <span className="text-xs font-semibold text-blue-600 group-hover:underline">Click to upload photos (Multiple allowed)</span>
                            <span className="text-xs text-slate-400 block mt-0.5">PNG, JPG, WEBP up to 25 photos per slot</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            required={!hState.files || hState.files.length === 0}
                            onChange={(e) => handleFileChange(hNum, e.target.files)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

            {/* Submit Button */}
            <div className="clean-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                <span className="text-amber-800 font-bold">Rule:</span> All 4 study hours must be completed with uploaded images before final submission.
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
                <div className="text-xs text-emerald-700 font-semibold min-w-[120px] text-center sm:text-left">
                  {draftStatus || 'Draft not saved yet'}
                </div>

                <button
                  type="button"
                  onClick={() => saveStudyDraft(formHours, 'manual')}
                  disabled={submittingStudy || !user?.student_id || !attendance?.date}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Save Draft
                </button>

                <button
                  type="submit"
                  disabled={submittingStudy || !isAttPresent}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
