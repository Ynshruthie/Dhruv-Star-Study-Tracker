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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
      <div className="clean-card grid w-full grid-cols-2 gap-1 p-1.5 sm:inline-flex sm:w-auto sm:gap-2 sm:p-2">
        <button
          type="button"
          onClick={() => switchTab('parent')}
          className={`justify-center px-1.5 sm:px-4 py-2.5 rounded-xl text-[10px] sm:text-sm font-semibold flex items-center gap-1 sm:gap-2 whitespace-nowrap transition ${
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
          className={`justify-center px-1.5 sm:px-4 py-2.5 rounded-xl text-[10px] sm:text-sm font-semibold flex items-center gap-1 sm:gap-2 whitespace-nowrap transition ${
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
