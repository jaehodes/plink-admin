'use client';

import { useState } from 'react';
import Modal, { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { adjustBalance, reclaimBalance, type AgencyResult } from '../actions';
import { BALANCE_TYPES, BALANCE_TYPE_LABELS, formatCount, type AgencyUser, type BalanceType } from '../../types/agency';

export type CountMode = 'reclaim' | 'adjust';

const MODE_TITLES: Record<CountMode, string> = { reclaim: '회수', adjust: '수동 조정' };

const CODE_MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE: '보유 건수가 부족합니다. 화면을 새로고침해 현재 건수를 확인해 주세요.',
};

interface CountModalProps {
  mode: CountMode;
  user: AgencyUser;
  onClose: () => void;
  onDone: () => void;
}

/**
 * 건수 회수(이 계정 → 부모)·수동 조정(±). 모두 admin만 하고 memo가 필수다. 적립은 IssueModal.
 * requestId는 모달을 열 때 한 번 만들고 유형·건수를 바꾸면 새로 만든다. 네트워크 오류 뒤 다시 누르면 같은 값을 보내 중복 처리를 막는다.
 */
export default function CountModal({ mode, user, onClose, onDone }: CountModalProps) {
  const { showToast } = useToast();
  const [type, setType] = useState<BalanceType>('quiz1');
  const [countText, setCountText] = useState('');
  const [sign, setSign] = useState<1 | -1>(1);
  const [memo, setMemo] = useState('');
  const [sourceEventId, setSourceEventId] = useState('');
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const count = Number(countText) || 0;
  const available = user.availableCounts[type] ?? 0;
  const delta = mode === 'adjust' ? sign * count : -count;
  const after = available + delta;
  const parentLabel = user.parent ? `${user.parent.name} (${user.parent.loginId})` : '부모 계정';

  const problem =
    (count > 0 && after < 0 && `보유 건수(${formatCount(available)})보다 많이 ${mode === 'reclaim' ? '회수' : '줄일'} 수 없습니다.`) ||
    (sourceEventId.trim() && !/^[0-9a-f-]{36}$/i.test(sourceEventId.trim()) && '원래 판매 이벤트 id 형식이 올바르지 않습니다.') ||
    null;
  const canSubmit = count >= 1 && !!memo.trim() && !problem;

  const renew = () => { setRequestId(crypto.randomUUID()); setError(null); };
  const changeType = (t: BalanceType) => { setType(t); renew(); };
  const changeCount = (v: string) => { setCountText(v.replace(/[^0-9]/g, '')); renew(); };
  const changeSign = (s: 1 | -1) => { setSign(s); renew(); };
  const changeSource = (v: string) => { setSourceEventId(v); renew(); };

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      let r: AgencyResult<{ duplicate: boolean; availableCount: number }>;
      if (mode === 'reclaim') r = await reclaimBalance(user.id, { type, count, memo, sourceEventId: sourceEventId.trim() || undefined, requestId });
      else r = await adjustBalance(user.id, { type, delta, memo, requestId });

      if (!r.ok || !r.data) {
        // 다른 요청이 이미 쓴 requestId면 새 값으로 다시 보낼 수 있게 한다
        if (r.code === 'DUPLICATE_REQUEST') setRequestId(crypto.randomUUID());
        setError((r.code && CODE_MESSAGES[r.code]) || r.error);
        return;
      }
      const done = `${user.loginId} ${BALANCE_TYPE_LABELS[type]} ${MODE_TITLES[mode]} 완료 (보유 ${formatCount(r.data.availableCount)})`;
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
      title={`${MODE_TITLES[mode]} — ${user.name} (${user.loginId})`}
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <button className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>취소</button>
          <button className={primaryButtonClass} onClick={submit} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? '처리 중...' : `${MODE_TITLES[mode]}하기`}
          </button>
        </>
      }
    >
      <div>
        <label className={labelClass}>유형</label>
        <div className="grid grid-cols-3 gap-2">
          {BALANCE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => changeType(t)}
              className={`p-2 rounded-lg border-2 text-left text-xs ${type === t ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <p className="font-semibold text-slate-900">{BALANCE_TYPE_LABELS[t]}</p>
              <p className="text-slate-500 mt-0.5">보유 {formatCount(user.availableCounts[t] ?? 0)}</p>
            </button>
          ))}
        </div>
      </div>

      {mode === 'adjust' && (
        <div>
          <label className={labelClass}>방향</label>
          <div className="flex gap-2">
            {([1, -1] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeSign(s)}
                className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium ${sign === s ? (s > 0 ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-slate-200 text-slate-600'}`}
              >
                {s > 0 ? '늘리기 (+)' : '줄이기 (−)'}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>건수</label>
        <input className={inputClass} inputMode="numeric" value={countText} onChange={(e) => changeCount(e.target.value)} placeholder="예: 1000" autoFocus />
      </div>

      {mode === 'reclaim' && (
        <div>
          <label className={labelClass}>되돌릴 판매 이벤트 id (선택)</label>
          <input className={`${inputClass} font-mono`} value={sourceEventId} onChange={(e) => changeSource(e.target.value)} placeholder="특정 판매를 되돌릴 때만" />
          <p className="text-[11px] text-slate-400 mt-1">같은 부모 → 이 계정, 같은 유형의 판매여야 합니다. 원장 화면에서 확인할 수 있습니다.</p>
        </div>
      )}

      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
        <p>
          보유 {formatCount(available)}
          {count > 0 && <> → <span className={`font-semibold ${after < 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatCount(after)}</span></>}
        </p>
        {mode === 'reclaim' && <p>회수한 건수는 {parentLabel}에게 돌아갑니다.</p>}
        {mode === 'adjust' && <p className="text-slate-400">잘못된 기록을 바로잡을 때만 씁니다. 원장은 수정·삭제되지 않고 조정 항목이 추가됩니다.</p>}
      </div>

      <div>
        <label className={labelClass}>메모 (필수)</label>
        <input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={200} placeholder="처리 사유" />
      </div>

      {(problem || error) && <p className="text-xs text-red-600">{problem || error}</p>}
    </Modal>
  );
}
