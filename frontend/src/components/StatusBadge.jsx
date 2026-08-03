import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

export const StatusBadge = ({ status, type = 'attendance', size = 'normal' }) => {
  const normalized = (status || '').toUpperCase();
  const isSmall = size === 'small';

  if (normalized === 'PRESENT' || normalized === 'SUBMITTED' || normalized === 'COMPLETED' || status === '✅') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full ${isSmall ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm'}`}>
        <CheckCircle2 className={isSmall ? 'w-3.5 h-3.5 text-emerald-600' : 'w-4 h-4 text-emerald-600'} />
        {normalized === 'PRESENT' ? 'Present' : (normalized === 'SUBMITTED' ? 'Submitted' : 'Completed')}
      </span>
    );
  }

  if (normalized === 'ABSENT' || status === '❌') {
    return (
      <span className={`inline-flex items-center gap-1.5 font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full ${isSmall ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm'}`}>
        <XCircle className={isSmall ? 'w-3.5 h-3.5 text-rose-600' : 'w-4 h-4 text-rose-600'} />
        {type === 'attendance' ? 'Absent' : 'Missing'}
      </span>
    );
  }

  // Pending
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full ${isSmall ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm'}`}>
      <Clock className={isSmall ? 'w-3.5 h-3.5 text-amber-600' : 'w-4 h-4 text-amber-600'} />
      Pending
    </span>
  );
};

export default StatusBadge;
