import React from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useWorkspaceStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          info: <Info className="h-5 w-5 text-blue-400 shrink-0" />,
          success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
          warning: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
          error: <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />,
        };

        const borderColors = {
          info: 'border-blue-500/30 bg-dark-900/95',
          success: 'border-emerald-500/30 bg-dark-900/95',
          warning: 'border-amber-500/30 bg-dark-900/95',
          error: 'border-red-500/30 bg-dark-900/95',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-slide-in ${borderColors[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white">{toast.title}</h4>
              {toast.message && <p className="mt-0.5 text-xs text-gray-300 leading-relaxed">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white transition p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
