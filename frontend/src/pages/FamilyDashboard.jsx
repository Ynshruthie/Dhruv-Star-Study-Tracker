import React, { useState } from 'react';
import ParentDashboard from './ParentDashboard';
import StudentDashboard from './StudentDashboard';
import { BookOpen, Users } from 'lucide-react';

const STORAGE_KEY = 'dhruv_family_dashboard_tab';

export const FamilyDashboard = () => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(STORAGE_KEY) || 'student');

  const switchTab = (tab) => {
    localStorage.setItem(STORAGE_KEY, tab);
    setActiveTab(tab);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="clean-card p-2 inline-flex gap-2">
        <button
          type="button"
          onClick={() => switchTab('parent')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
            activeTab === 'parent'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Parent Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('student')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition ${
            activeTab === 'student'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Student Dashboard</span>
        </button>
      </div>

      {activeTab === 'parent' ? <ParentDashboard /> : <StudentDashboard />}
    </div>
  );
};

export default FamilyDashboard;
