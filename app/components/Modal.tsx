'use client';

import { useEffect } from 'react';

interface ModalProps {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 처리 중에는 ESC·닫기 버튼으로 닫지 않는다 */
  busy?: boolean;
  maxWidth?: 'max-w-md' | 'max-w-lg' | 'max-w-2xl';
}

/** 입력 폼 모달. 바깥 클릭으로는 닫지 않는다(입력값 보호). z-[60]이라 ConfirmModal(z-[70])이 그 위에 뜬다 */
export default function Modal({ title, onClose, children, footer, busy = false, maxWidth = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} disabled={busy} className="p-1 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50" aria-label="닫기">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export const inputClass = 'w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500';
export const labelClass = 'block text-xs font-medium text-slate-700 mb-1';
export const primaryButtonClass = 'px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const secondaryButtonClass = 'px-4 py-2 text-sm border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const dangerButtonClass = 'px-4 py-2 text-sm bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
export const selectClass = 'px-2 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500';
