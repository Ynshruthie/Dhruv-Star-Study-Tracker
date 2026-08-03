import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import StatusBadge from '../components/StatusBadge';
import ImageModal from '../components/ImageModal';
import { 
  Users, CheckCircle2, Clock, XCircle, Search, 
  Calendar, RefreshCw, BookOpen, Camera,
  UserPlus, Trash2, Eye, EyeOff, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';

export const TeacherDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeModalHour, setActiveModalHour] = useState(null);
  const [activeModalStudent, setActiveModalStudent] = useState('');

  // Admin panel state
  const [adminOpen, setAdminOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminMsg, setAdminMsg] = useState(null); // { type: 'success'|'error', text: '' }
  const [addingStudent, setAddingStudent] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/teacher/dashboard?date=${selectedDate}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch teacher dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedDate]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setAdminMsg(null);
    setAddingStudent(true);
    try {
      const res = await api.post('/teacher/students', {
        name: newName.trim(),
        student_id: newStudentId.trim(),
        password: newPassword
      });
      setAdminMsg({ type: 'success', text: res.data.message });
      setNewName('');
      setNewStudentId('');
      setNewPassword('');
      // Refresh dashboard to show new student in the roster
      fetchDashboard();
    } catch (err) {
      setAdminMsg({ type: 'error', text: err.response?.data?.error || 'Failed to create student.' });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${studentName}" (${studentId})? This will delete all their attendance and study records.`)) {
      return;
    }
    try {
      const res = await api.delete(`/teacher/students/${studentId}`);
      setAdminMsg({ type: 'success', text: res.data.message });
      fetchDashboard();
    } catch (err) {
      setAdminMsg({ type: 'error', text: err.response?.data?.error || 'Failed to delete student.' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-500">Loading teacher monitoring metrics...</span>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || { totalStudents: 0, presentCount: 0, absentCount: 0, submittedCount: 0, pendingCount: 0 };
  const students = data?.students || [];

  const filteredStudents = students.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          st.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (statusFilter === 'SUBMITTED') return st.overallStatus === 'Submitted';
    if (statusFilter === 'PENDING') return st.overallStatus === 'Pending';
    if (statusFilter === 'ABSENT') return st.overallStatus === 'Absent';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header Banner */}
      <div className="clean-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full mb-2">
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Dhruv Star Academy • Teacher Monitoring Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Daily Attendance &amp; 4-Hour Study Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time tracking of student morning attendance (4:30–5:30 AM) and self-study work submissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-900 text-xs font-mono focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={fetchDashboard}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* METRICS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Enrolled */}
        <div className="clean-card p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Students</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.totalStudents}</div>
          <div className="text-[11px] text-slate-400 font-medium">Active Roster</div>
        </div>

        {/* Card 2: Attendance Present */}
        <div className="clean-card p-5 border-emerald-200 bg-emerald-50/30 space-y-1">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <span>Attendance Marked</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900">{metrics.presentCount}</div>
          <div className="text-[11px] text-emerald-700">4:30–5:30 AM Window</div>
        </div>

        {/* Card 3: 4/4 Hours Completed */}
        <div className="clean-card p-5 border-blue-200 bg-blue-50/30 space-y-1">
          <div className="flex items-center justify-between text-blue-800 text-xs font-bold uppercase tracking-wider">
            <span>4/4 Study Submitted</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-blue-900">{metrics.submittedCount}</div>
          <div className="text-[11px] text-blue-700">All 4 Proofs Attached</div>
        </div>

        {/* Card 4: Pending Hours */}
        <div className="clean-card p-5 border-amber-200 bg-amber-50/30 space-y-1">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider">
            <span>Incomplete / Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-900">{metrics.pendingCount}</div>
          <div className="text-[11px] text-amber-700">&lt; 4 Hours Uploaded</div>
        </div>

        {/* Card 5: Missed Attendance / Absent */}
        <div className="clean-card p-5 border-rose-200 bg-rose-50/30 space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-rose-800 text-xs font-bold uppercase tracking-wider">
            <span>Missed Attendance</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-900">{metrics.absentCount}</div>
          <div className="text-[11px] text-rose-700">Marked Absent</div>
        </div>

      </div>

      {/* SEARCH AND FILTERS */}
      <div className="clean-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by student name or ID..."
            className="w-full h-10 pl-10 pr-4 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mr-1">Filter:</span>
          {[
            { id: 'ALL', label: 'All Students' },
            { id: 'SUBMITTED', label: '✅ Submitted (4/4)' },
            { id: 'PENDING', label: '⏳ Pending (<4)' },
            { id: 'ABSENT', label: '❌ Absent' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setStatusFilter(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                statusFilter === btn.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* STUDENT PROGRESS TABLE */}
      <div className="clean-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="py-4 px-6">Student Name &amp; ID</th>
                <th className="py-4 px-6">Attendance (4:30-5:30 AM)</th>
                <th className="py-4 px-6 text-center">Hour 1</th>
                <th className="py-4 px-6 text-center">Hour 2</th>
                <th className="py-4 px-6 text-center">Hour 3</th>
                <th className="py-4 px-6 text-center">Hour 4</th>
                <th className="py-4 px-6 text-right">Overall Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No student records matching your filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st) => {
                  const isPresent = st.attendance.marked && st.attendance.status === 'PRESENT';

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Student Name & ID */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{st.name}</div>
                        <div className="font-mono text-slate-500 text-xs">{st.student_id}</div>
                      </td>

                      {/* Attendance Column */}
                      <td className="py-4 px-6">
                        {isPresent ? (
                          <div className="space-y-1">
                            <StatusBadge status="PRESENT" type="attendance" size="small" />
                            <div className="text-[11px] text-slate-500 font-mono">
                              Marked: {st.attendance.time}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <StatusBadge status="ABSENT" type="attendance" size="small" />
                            <div className="text-[11px] text-rose-600 font-medium">Missed window</div>
                          </div>
                        )}
                      </td>

                      {/* Hour 1 .. 4 Columns */}
                      {st.hours.map((h) => (
                        <td key={h.hour_number} className="py-4 px-6 text-center">
                          {h.completed ? (
                            <button
                              onClick={() => {
                                setActiveModalHour(h);
                                setActiveModalStudent(st.name);
                              }}
                              className="group inline-flex flex-col items-center gap-1 p-2 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition cursor-pointer"
                              title={`View ${h.subject} proof`}
                            >
                              <span className="text-emerald-700 font-bold flex items-center gap-1 text-xs">
                                <Camera className="w-3.5 h-3.5 text-emerald-600" /> {h.photo_count > 1 ? `${h.photo_count} Photos` : '1 Photo'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono truncate max-w-[80px]">
                                {h.subject}
                              </span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs" title="Study hour not submitted">
                              ❌
                            </span>
                          )}
                        </td>
                      ))}

                      {/* Overall Status Badge */}
                      <td className="py-4 px-6 text-right">
                        <StatusBadge status={st.overallStatus} type="study" />
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN PANEL: ADD / MANAGE STUDENTS */}
      <div className="clean-card overflow-hidden">
        <button
          type="button"
          onClick={() => setAdminOpen(!adminOpen)}
          className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center">
              <UserPlus className="w-4.5 h-4.5 text-purple-700" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-900">Admin Panel — Manage Students</h3>
              <p className="text-xs text-slate-500">Add new students or remove existing ones</p>
            </div>
          </div>
          {adminOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {adminOpen && (
          <div className="border-t border-slate-200 p-5 space-y-6">

            {/* Success / Error Message */}
            {adminMsg && (
              <div className={`p-3 rounded-xl text-sm flex items-start gap-2.5 ${
                adminMsg.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-700'
              }`}>
                {adminMsg.type === 'success' 
                  ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                  : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                }
                <span>{adminMsg.text}</span>
              </div>
            )}

            {/* Add Student Form */}
            <form onSubmit={handleAddStudent} className="space-y-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Create New Student Account</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Student Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Priya Gupta"
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Student ID *</label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value.toUpperCase())}
                    placeholder="e.g. STU006"
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 font-mono placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full h-10 px-3 pr-10 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={addingStudent}
                className="h-10 px-6 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {addingStudent ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                <span>Add Student</span>
              </button>
            </form>

            {/* Current Enrolled Students List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Students ({students.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {students.map(st => (
                  <div key={st.student_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{st.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{st.student_id}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(st.student_id, st.name)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title={`Remove ${st.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Lightbox Viewer */}
      <ImageModal
        isOpen={!!activeModalHour}
        onClose={() => setActiveModalHour(null)}
        hourData={activeModalHour}
        studentName={activeModalStudent}
      />
    </div>
  );
};

export default TeacherDashboard;
