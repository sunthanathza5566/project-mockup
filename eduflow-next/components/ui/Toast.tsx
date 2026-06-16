'use client';

import { useToast } from '@/context/ToastContext';

export default function Toast() {
  const { toast } = useToast();

  return (
    <div className={`toast${toast?.visible ? ' show' : ''}`} role="alert" aria-live="polite">
      <div className="toast-icon">
        {toast?.type === 'error' ? '⚠️' : '✓'}
      </div>
      <span id="toast-msg">{toast?.msg}</span>
    </div>
  );
}
