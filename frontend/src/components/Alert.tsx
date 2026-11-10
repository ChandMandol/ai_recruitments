import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface AlertProps {
  type: 'error' | 'success' | 'info';
  message: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose }) => {
  if (!message) return null;

  const styles = {
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    info: <AlertCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />,
  };

  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm font-medium ${styles[type]} transition-all animate-fadeIn`}>
      {icons[type]}
      <div className="flex-1 pt-0.5">{message}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

