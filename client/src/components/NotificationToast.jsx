import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function NotificationToast() {
  const { toasts } = useApp();

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="glass-card"
          style={{
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: `4px solid ${
              toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#f43f5e' : '#3b82f6'
            }`,
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.9rem',
            fontWeight: 500,
            pointerEvents: 'auto',
            animation: 'slideUp 0.2s ease-out'
          }}
        >
          {toast.type === 'success' && <CheckCircle2 size={18} color="#10b981" />}
          {toast.type === 'error' && <AlertCircle size={18} color="#f43f5e" />}
          {toast.type === 'info' && <Info size={18} color="#3b82f6" />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
