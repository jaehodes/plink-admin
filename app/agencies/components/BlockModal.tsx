'use client';

import { useState } from 'react';
import Modal, { dangerButtonClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { setAgencyBlocked } from '../actions';
import type { AgencyUser } from '../../types/agency';

interface BlockModalProps {
  user: AgencyUser;
  onClose: () => void;
  onDone: () => void;
}

/**
 * 계정 차단·해제. 차단하면 하위 계정의 로그인·발주·판매도 막힌다(하위 계정의 blocked는 바꾸지 않는다).
 * 건수는 그대로 두고 진행 중인 발주도 계속된다. 멈춰야 하면 발주를 따로 취소한다.
 */
export default function BlockModal({ user, onClose, onDone }: BlockModalProps) {
  const { showToast } = useToast();
  const nextBlocked = !user.blocked;
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const r = await setAgencyBlocked(user.id, nextBlocked, reason);
      if (!r.ok || !r.data) {
        setError(r.error);
        return;
      }
      if (!r.data.changed) showToast(nextBlocked ? '이미 차단된 계정입니다.' : '이미 사용 중인 계정입니다.', 'info');
      else showToast(nextBlocked ? `${user.loginId}을(를) 차단했습니다.` : `${user.loginId}의 차단을 해제했습니다.`);
      onDone();
    } catch {
      setError('처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={nextBlocked ? `차단 — ${user.name} (${user.loginId})` : `차단 해제 — ${user.name} (${user.loginId})`}
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <button className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>취소</button>
          <button className={nextBlocked ? dangerButtonClass : primaryButtonClass} onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : nextBlocked ? '차단하기' : '해제하기'}
          </button>
        </>
      }
    >
      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
        {nextBlocked ? (
          <>
            <p>이 계정{user.tier < 3 ? '과 모든 하위 계정' : ''}의 로그인·발주·판매가 막힙니다.</p>
            <p>보유 건수는 그대로 남고, 진행 중인 발주는 계속 진행됩니다. 멈춰야 하면 발주 목록에서 취소해 주세요.</p>
          </>
        ) : (
          <>
            <p>이 계정의 차단을 풉니다.{user.blockedByType === 'order_user' && ' (상위 대리점이 차단한 계정입니다)'}</p>
            {user.blockedByAncestor && <p className="text-amber-700">상위 계정이 차단되어 있어 해제해도 계속 막힙니다.</p>}
          </>
        )}
      </div>
      <div>
        <label className={labelClass}>사유 (선택)</label>
        <input className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} autoFocus />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </Modal>
  );
}
