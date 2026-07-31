import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999, minWidth: '320px' }}>
        {toasts.map(toast => (
          <div key={toast.id} className={`alert alert-${toast.type === 'success' ? 'success' : toast.type === 'danger' ? 'danger' : 'info'} alert-dismissible fade show d-flex align-items-center gap-2 shadow-sm border-0 mb-2`}
            style={{ animation: 'slideIn 0.3s ease', borderRadius: '10px' }}>
            <i className={`bi ${toast.type === 'success' ? 'bi-check-circle-fill text-success' : toast.type === 'danger' ? 'bi-exclamation-circle-fill text-danger' : 'bi-info-circle-fill text-info'} fs-5`}></i>
            <span className="small flex-grow-1">{toast.message}</span>
            <button type="button" className="btn-close btn-close-sm" onClick={() => removeToast(toast.id)}></button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}