import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Star, LogOut, User, ShieldCheck, Clock, Database, GraduationCap } from 'lucide-react';

export const Navbar = () => {
  const { user, logout, triggerSeed, simulatedTime } = useContext(AuthContext);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      if (simulatedTime) {
        setTimeStr(`${simulatedTime}:00 AM (Simulated)`);
      } else {
        const now = new Date();
        setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [simulatedTime]);

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-purple-600 p-0.5 shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                DHRUV STAR <span className="text-indigo-400 font-normal">ACADEMY</span>
              </h1>
              <span className="bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
                Study Tracker
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Daily Attendance &amp; Self-Study Monitoring System</p>
          </div>
        </div>

        {/* Live Digital Clock Widget */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg shadow-inner font-mono text-xs text-slate-300">
          <Clock className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-white">{timeStr}</span>
        </div>

        {/* User Info & Actions */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/50 px-3 py-1.5 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center">
                {user.role === 'teacher' ? (
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="text-left leading-tight">
                <div className="text-xs font-semibold text-white">{user.name}</div>
                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <span>{user.student_id}</span>
                  <span className="text-slate-600">•</span>
                  <span className="capitalize text-indigo-300">{user.role}</span>
                </div>
              </div>
            </div>

            <button
              onClick={triggerSeed}
              title="Reset Demo Data"
              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 rounded-lg border border-transparent hover:border-slate-700 transition text-xs flex items-center gap-1.5"
            >
              <Database className="w-4 h-4" />
              <span className="hidden lg:inline">Reset Demo DB</span>
            </button>

            <button
              onClick={logout}
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/80 hover:text-rose-300 text-slate-300 border border-slate-700 hover:border-rose-800/50 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
