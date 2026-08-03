import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Star, ShieldCheck, GraduationCap, ArrowRight, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(studentId, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please check your ID and Password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (id, pass, role) => {
    setActiveTab(role);
    setStudentId(id);
    setPassword(pass);
    setError('');
    setLoading(true);
    try {
      await login(id, pass);
    } catch (err) {
      setError(err.response?.data?.error || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-105px)] flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-50">
      <div className="w-full max-w-md">
        
        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white border border-slate-200 p-1.5 shadow-md mb-4 overflow-hidden">
              <img src="/logo.png" alt="Dhruv Star Academy Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Dhruv Star Study Tracker
            </h2>
            <p className="text-slate-500 text-sm mt-1.5">
              Daily Attendance &amp; Self-Study Portal
            </p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('student');
                setStudentId('');
                setPassword('');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('teacher');
                setStudentId('TCH001');
                setPassword('admin123');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition cursor-pointer ${
                activeTab === 'teacher'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Teacher
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                {activeTab === 'student' ? 'Student ID' : 'Teacher ID'}
              </label>
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                placeholder={activeTab === 'student' ? 'STU001' : 'TCH001'}
                className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-11 px-4 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-11 rounded-lg font-semibold text-sm text-white shadow-sm transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'student'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>



        </div>
      </div>
    </div>
  );
};

export default LoginPage;
