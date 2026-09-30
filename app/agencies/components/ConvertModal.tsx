'use client';

import { useState } from 'react';
import Modal, { inputClass, labelClass, primaryButtonClass, secondaryButtonClass, selectClass } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { convertBalance } from '../actions';
import { BALANCE_TYPES, BALANCE_TYPE_LABELS, formatCount, formatPrice, type AgencyUser, type BalanceType } from '../../types/agency';

interface ConvertModalProps {
  user: AgencyUser;
  platformPrices: Record<BalanceType, number | null>;
  onClose: () => void;
  onDone: () => void;
}

/**
 * 한 계정 안에서 유형 사이 건수를 옮긴다(admin만, memo 필수). 받을 건수를 정하면
 * 빠질 건수 = 올림(받을 건수 × 받을 유형 플랫폼 단가 ÷ 원래 유형 플랫폼 단가). 화면 계산은 참고값이고 실제 값은 API가 정한다.
 */
export default function ConvertModal({ user, platformPrices, onClose, onDone }: ConvertModalProps) {
  const { showToast } = useToast();
  const [fromType, setFromType] = useState<BalanceType>('quiz1');
  const [toType, setToType] = useState<BalanceType>('quiz2');
  const [countText, setCountText] = useState('');
  const [memo, setMemo] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toCount = Number(countText) || 0;
  const fromPrice = platformPrices[fromType];
  const toPrice = platformPrices[toType];
  const fromCount = toCount > 0 && fromPrice && toPrice ? Math.ceil((toCount * toPrice) / fromPrice) : null;
  const fromAvailable = user.availableCounts[fromType] ?? 0;

  const problem =
    (fromType === toType && '원래 유형과 받을 유형이 같습니다.') ||
    ((!fromPrice || !toPrice) && '플랫폼 단가가 정해지지 않은 유형입니다.') ||
    (fromCount != null && fromCount > fromAvailable && `${BALANCE_TYPE_LABELS[fromType]} 보유 건수(${formatCount(fromAvailable)})가 부족합니다. ${formatCount(fromCount)}이 필요합니다.`) ||
    null;
  const canSubmit = toCount >= 1 && !!memo.trim() && !problem;

  const renew = () => { setRequestId(crypto.randomUUID()); setError(null); };

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const r = await convertBalance(user.id, { fromType, toType, toCount, memo, requestId });
      if (!r.ok || !r.data) {
        if (r.code === 'DUPLICATE_REQUEST') setRequestId(crypto.randomUUID());
        setError(r.code === 'INSUFFICIENT_BALANCE' ? '보유 건수가 부족합니다. 화면을 새로고침해 현재 건수를 확인해 주세요.' : r.error);
        return;
      }
      const done = `${user.loginId} ${BALANCE_TYPE_LABELS[fromType]} ${formatCount(r.data.fromCount)} → ${BALANCE_TYPE_LABELS[toType]} ${formatCount(r.data.toCount)} 전환 완료`;
      showToast(r.data.duplicate ? `이미 처리된 요청입니다. ${done}` : done, r.data.duplicate ? 'info' : 'success');
      onDone();
    } catch {
      setError('처리 중 오류가 발생했습니다. 다시 누르면 같은 요청으로 처리됩니다(중복 처리되지 않음).');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={`유형 전환 — ${user.name} (${user.loginId})`}
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <button className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>취소</button>
          <button className={primaryButtonClass} onClick={submit} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? '처리 중...' : '전환하기'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>원래 유형 (빠짐)</label>
          <select className={`${selectClass} w-full`} value={fromType} onChange={(e) => { setFromType(e.target.value as BalanceType); renew(); }}>
            {BALANCE_TYPES.map((t) => <option key={t} value={t}>{BALANCE_TYPE_LABELS[t]} · 보유 {formatCount(user.availableCounts[t] ?? 0)}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>받을 유형</label>
          <select className={`${selectClass} w-full`} value={toType} onChange={(e) => { setToType(e.target.value as BalanceType); renew(); }}>
            {BALANCE_TYPES.map((t) => <option key={t} value={t}>{BALANCE_TYPE_LABELS[t]} · 보유 {formatCount(user.availableCounts[t] ?? 0)}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>받을 건수</label>
        <input className={inputClass} inputMode="numeric" value={countText} onChange={(e) => { setCountText(e.target.value.replace(/[^0-9]/g, '')); renew(); }} placeholder="예: 100" autoFocus />
      </div>

      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
        <p>플랫폼 단가: {BALANCE_TYPE_LABELS[fromType]} {formatPrice(fromPrice)} · {BALANCE_TYPE_LABELS[toType]} {formatPrice(toPrice)}</p>
        {fromCount != null && (
          <p>
            <span className="font-semibold text-red-600">{BALANCE_TYPE_LABELS[fromType]} −{formatCount(fromCount)}</span>
            {' → '}
            <span className="font-semibold text-blue-600">{BALANCE_TYPE_LABELS[toType]} +{formatCount(toCount)}</span>
          </p>
        )}
        <p className="text-slate-400">빠질 건수는 올림(받을 건수 × 받을 유형 단가 ÷ 원래 유형 단가)입니다.</p>
      </div>

      <div>
        <label className={labelClass}>메모 (필수)</label>
        <input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={200} placeholder="전환 사유" />
      </div>

      {(problem || error) && <p className="text-xs text-red-600">{problem || error}</p>}
    </Modal>
  );
}
