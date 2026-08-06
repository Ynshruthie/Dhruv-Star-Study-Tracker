import React, { useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import ImageModal from '../components/ImageModal';
import { 
  Users, CheckCircle2, Clock, XCircle, Search, 
  Calendar, RefreshCw, BookOpen, Camera,
  UserPlus, Trash2, Eye, EyeOff, AlertCircle, Pencil, Save, X
} from 'lucide-react';

const TAB_STORAGE_KEY = 'dhruv_teacher_dashboard_tab';

export const TeacherDashboard = () => {
  const { user } = useContext(AuthContext);
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
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(TAB_STORAGE_KEY) || 'monitor');
  const [newName, setNewName] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newMentor, setNewMentor] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminMsg, setAdminMsg] = useState(null); // { type: 'success'|'error', text: '' }
  const [addingStudent, setAddingStudent] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMentor, setEditMentor] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

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
        mentor: newMentor.trim(),
        password: newPassword
      });
      setAdminMsg({ type: 'success', text: res.data.message });
      setNewName('');
      setNewStudentId('');
      setNewMentor('');
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

  const beginEditStudent = (student) => {
    setEditingStudentId(student.student_id);
    setEditName(student.name);
    setEditMentor(student.mentor || '');
    setEditPassword('');
    setAdminMsg(null);
  };

  const cancelEditStudent = () => {
    setEditingStudentId(null);
    setEditPassword('');
  };

  const handleUpdateStudent = async (event, studentId) => {
    event.preventDefault();
    setSavingStudent(true);
    setAdminMsg(null);
    try {
      const response = await api.put(`/teacher/students/${encodeURIComponent(studentId)}`, {
        name: editName.trim(),
        mentor: editMentor.trim(),
        password: editPassword
      });
      setAdminMsg({ type: 'success', text: response.data.message });
      cancelEditStudent();
      fetchDashboard();
    } catch (err) {
      const serverMessage = err.response?.data?.error;
      const statusMessage = err.response?.status
        ? ` (server returned ${err.response.status})`
        : ' (backend unavailable)';
      setAdminMsg({ type: 'error', text: serverMessage || `Failed to update student${statusMessage}.` });
    } finally {
      setSavingStudent(false);
    }
  };

  const switchTab = (tab) => {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
    setActiveTab(tab);
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
    if (statusFilter === 'MENTEES') {
      return Boolean(st.mentor) &&
        st.mentor.toUpperCase() === user?.student_id?.toUpperCase();
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="clean-card p-2 inline-flex gap-2">
        <button type="button" onClick={() => switchTab('monitor')} className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${activeTab === 'monitor' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><Users className="w-4 h-4" /><span>Teacher Dashboard</span></button>
        <button type="button" onClick={() => switchTab('admin')} className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${activeTab === 'admin' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-50'}`}><UserPlus className="w-4 h-4" /><span>Admin Dashboard</span></button>
      </div>

      {activeTab === 'monitor' && <>
      {/* Header Banner */}
      <div className="clean-card p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full mb-2">
            <Users className="w-3.5 h-3.5 text-purple-600" />
            <span>Dhruv Star Academy • Teacher Monitoring Command</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Daily Slot Attendance &amp; Study Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time tracking of scheduled slot attendance and uploaded study proof across all 4 slots.
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
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
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
            <span>Slot Attendance</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-900">{metrics.presentCount}</div>
          <div className="text-[11px] text-emerald-700">At least one slot started</div>
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
            <span>Missed Slots</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-900">{metrics.absentCount}</div>
          <div className="text-[11px] text-rose-700">Marked Absent</div>
        </div>

      </div>

      {/* SEARCH AND FILTERS */}
      <div className="clean-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-60">
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
            { id: 'ABSENT', label: '❌ Absent' },
            { id: 'MENTEES', label: '👥 Mentees' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setStatusFilter(btn.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
                statusFilter === btn.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* STUDENT PROGRESS TABLE */}
      <div className="clean-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="py-4 px-6">Student Name &amp; ID</th>
                <th className="py-4 px-6">Daily Overview</th>
                <th className="py-4 px-6 text-center">Slot 1</th>
                <th className="py-4 px-6 text-center">Slot 2</th>
                <th className="py-4 px-6 text-center">Slot 3</th>
                <th className="py-4 px-6 text-center">Slot 4</th>
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
                  const startedSlots = st.hours.filter((hour) => hour.attendance_status === 'PRESENT').length;
                  const missedSlots = st.hours.filter((hour) => hour.attendance_status === 'ABSENT').length;
                  const parentSlots = st.hours.filter((hour) => hour.manager_type === 'PARENT').length;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition">
                      
                      {/* Student Name & ID */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 text-sm">{st.name}</div>
                        <div className="font-mono text-slate-500 text-xs">{st.student_id}</div>
                      </td>

                      {/* Daily Overview */}
                      <td className="py-4 px-6">
                        <div className="space-y-1 text-[11px] font-medium">
                          <div className="text-emerald-700">{startedSlots} self slot{startedSlots === 1 ? '' : 's'} started</div>
                          {missedSlots > 0 && <div className="text-rose-600">{missedSlots} start window{missedSlots === 1 ? '' : 's'} missed</div>}
                          {parentSlots > 0 && <div className="text-violet-700">{parentSlots} parent-managed</div>}
                          {!startedSlots && !missedSlots && !parentSlots && <div className="text-slate-500">No slots scheduled</div>}
                        </div>
                      </td>

                      {/* Hour 1 .. 4 Columns */}
                      {st.hours.map((h) => (
                        <td key={h.hour_number} className="py-4 px-6 text-center">
                          {h.completed ? h.photo_count > 0 ? (
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
                              <span className="text-[10px] text-slate-500 font-mono truncate max-w-20">
                                {h.subject}
                              </span>
                              <span className="text-[10px] text-slate-500 leading-tight">{h.active_time_slot || h.planned_time_slot}</span>
                              <span className="text-[10px] text-slate-500 max-w-28 leading-tight">{h.timing_label}</span>
                            </button>
                          ) : (
                            <div className="inline-flex max-w-32 flex-col items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2" title={h.timing_label}>
                              <span className={`text-xs font-bold ${h.attendance_status === 'ABSENT' ? 'text-rose-600' : h.attendance_status === 'PRESENT' ? 'text-blue-700' : h.manager_type === 'PARENT' ? 'text-violet-700' : 'text-amber-700'}`}>{h.subject}</span>
                              <span className="text-[10px] text-slate-500 leading-tight">{h.active_time_slot || h.planned_time_slot}</span>
                              <span className="text-[10px] text-slate-600 leading-tight">{h.timing_label}</span>
                              <span className="text-[10px] text-slate-400">No proof yet</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 font-bold text-xs" title="Slot not scheduled">
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

      </>}

      {activeTab === 'admin' && <div className="clean-card overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center"><UserPlus className="w-5 h-5 text-purple-700" /></div>
            <div><h1 className="text-xl font-extrabold text-slate-900">Admin Dashboard</h1><p className="text-sm text-slate-500">Add students and manage the enrolled student roster.</p></div>
          </div>
          <div className="p-5 space-y-6">

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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mentor ID *</label>
                  <input
                    type="text"
                    required
                    value={newMentor}
                    onChange={(e) => setNewMentor(e.target.value.toUpperCase())}
                    placeholder="e.g. TCH001 (teacher ID)"
                    pattern="[A-Za-z0-9_-]+"
                    title="Enter an existing teacher's ID, not their name."
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
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
                {students.map((student) => (
                  <div key={student.student_id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    {editingStudentId === student.student_id ? (
                      <form onSubmit={(event) => handleUpdateStudent(event, student.student_id)} className="space-y-3">
                        <div className="text-xs font-mono text-slate-500">{student.student_id}</div>
                        <input value={editName} onChange={(event) => setEditName(event.target.value)} required aria-label="Student name" className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <input value={editMentor} onChange={(event) => setEditMentor(event.target.value.toUpperCase())} required placeholder="Mentor ID (teacher ID)" aria-label="Mentor ID" pattern="[A-Za-z0-9_-]+" title="Enter an existing teacher's ID, not their name." className="w-full h-9 px-2.5 rounded-lg border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <input type="password" value={editPassword} onChange={(event) => setEditPassword(event.target.value)} placeholder="New password (optional)" aria-label="New password" minLength={6} className="w-full h-9 px-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        <div className="flex gap-2"><button type="submit" disabled={savingStudent} className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Save className="w-3.5 h-3.5" />{savingStudent ? 'Saving...' : 'Save'}</button><button type="button" onClick={cancelEditStudent} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600"><X className="w-3.5 h-3.5" />Cancel</button></div>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div><div className="text-sm font-semibold text-slate-800">{student.name}</div><div className="text-[11px] font-mono text-slate-500">{student.student_id}</div><div className="text-[11px] text-purple-700">Mentor ID: {student.mentor || 'Not assigned'}</div></div>
                        <div className="flex items-center gap-1"><button type="button" onClick={() => beginEditStudent(student)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition" title={`Edit ${student.name}`}><Pencil className="w-3.5 h-3.5" /></button><button type="button" onClick={() => handleDeleteStudent(student.student_id, student.name)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition" title={`Remove ${student.name}`}><Trash2 className="w-4 h-4" /></button></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
      </div>}

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
