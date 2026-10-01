'use client';

import { useState } from 'react';
import Modal, { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { issueBalance } from '../actions';
import { BALANCE_TYPES, BALANCE_TYPE_LABELS, formatCount, formatPrice, type AgencyUser, type BalanceType } from '../../types/agency';

const CODE_MESSAGES: Record<string, string> = {
  BLOCKED: '차단된 계정에는 적립할 수 없습니다.',
};

/** 금액을 유형별 건수로 나누는 방식. manual은 건수를 직접 고친 상태다 */
type Preset = 'even' | BalanceType | 'manual';

type Counts = Record<BalanceType, string>;

const emptyCounts = (): Counts => ({ quiz1: '', quiz2: '', direction: '' });
const newRequestIds = (): Record<BalanceType, string> => ({
  quiz1: crypto.randomUUID(),
  quiz2: crypto.randomUUID(),
  direction: crypto.randomUUID(),
});

const toNumber = (text: string) => Number(text) || 0;
const digitsOnly = (v: string) => v.replace(/[^0-9]/g, '');

interface IssueModalProps {
  user: AgencyUser;
  /** 청구 참고 금액을 계산할 플랫폼 단가 (부가세 별도) */
  platformPrices: Record<BalanceType, number | null>;
  onClose: () => void;
  onDone: () => void;
}

/**
 * tier-1 적립(새 건수 발행). 입금 금액(부가세 별도)과 분배 방식으로 유형별 건수를 계산해 채우고, 건수는 직접 고칠 수 있다.
 * 계산은 항상 내림이라 입력 금액을 넘지 않는다. 남는 금액을 어떻게 할지는 관리자가 건수를 고쳐 정한다.
 *
 * API는 유형 하나씩 받으므로 건수가 있는 유형을 차례로 적립한다. requestId는 유형마다 따로 두고 그 유형의 건수가 바뀔 때만 새로 만든다.
 * 중간에 실패하면 성공한 유형은 잠그고, 다시 누르면 남은 유형만 같은 requestId로 보낸다(이미 처리된 요청은 중복 처리되지 않는다).
 */
export default function IssueModal({ user, platformPrices, onClose, onDone }: IssueModalProps) {
  const { showToast } = useToast();
  const [amountText, setAmountText] = useState('');
  const [preset, setPreset] = useState<Preset>('even');
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [memo, setMemo] = useState('');
  const [requestIds, setRequestIds] = useState(newRequestIds);
  const [doneTypes, setDoneTypes] = useState<Partial<Record<BalanceType, number>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pricedTypes = BALANCE_TYPES.filter((t) => platformPrices[t] != null);
  const amount = toNumber(amountText);
  const started = Object.keys(doneTypes).length > 0;

  const typeAmount = (t: BalanceType) => toNumber(counts[t]) * (platformPrices[t] ?? 0);
  const totalCount = BALANCE_TYPES.reduce((n, t) => n + toNumber(counts[t]), 0);
  const totalAmount = BALANCE_TYPES.reduce((n, t) => n + typeAmount(t), 0);
  const diff = amount - totalAmount;
  const pending = BALANCE_TYPES.filter((t) => toNumber(counts[t]) > 0 && doneTypes[t] === undefined);
  const canSubmit = pending.length > 0 && !!memo.trim();

  /** 금액과 분배 방식으로 건수를 계산한다. 내림이라 합계가 금액을 넘지 않는다 */
  const compute = (value: number, p: Preset): Counts => {
    const next = emptyCounts();
    if (p === 'manual' || value <= 0) return next;
    const targets = p === 'even' ? pricedTypes : pricedTypes.filter((t) => t === p);
    for (const t of targets) {
      const price = platformPrices[t]!;
      // 금액 균등: 유형마다 금액의 1/n을 쓴다
      next[t] = String(Math.floor(value / (targets.length * price)));
    }
    return next;
  };

  const applyCounts = (next: Counts) => {
    // 건수가 바뀐 유형만 requestId를 새로 만든다
    setRequestIds((ids) => {
      const renewed = { ...ids };
      for (const t of BALANCE_TYPES) if (next[t] !== counts[t]) renewed[t] = crypto.randomUUID();
      return renewed;
    });
    setCounts(next);
    setError(null);
  };

  const changeAmount = (v: string) => {
    const text = digitsOnly(v);
    setAmountText(text);
    if (preset !== 'manual') applyCounts(compute(toNumber(text), preset));
  };

  const changePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'manual') applyCounts(compute(amount, p));
  };

  const changeCount = (t: BalanceType, v: string) => {
    setPreset('manual');
    applyCounts({ ...counts, [t]: digitsOnly(v) });
  };

  const close = () => (started ? onDone() : onClose());

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    const done = { ...doneTypes };
    try {
      for (const t of pending) {
        const r = await issueBalance(user.id, { type: t, count: toNumber(counts[t]), memo, requestId: requestIds[t] });
        if (!r.ok || !r.data) {
          // 다른 요청이 이미 쓴 requestId면 새 값으로 다시 보낼 수 있게 한다
          if (r.code === 'DUPLICATE_REQUEST') setRequestIds((ids) => ({ ...ids, [t]: crypto.randomUUID() }));
          setError(`${BALANCE_TYPE_LABELS[t]}: ${(r.code && CODE_MESSAGES[r.code]) || r.error}`);
          return;
        }
        done[t] = r.data.availableCount;
        setDoneTypes({ ...done });
      }
      const summary = BALANCE_TYPES.filter((t) => done[t] !== undefined)
        .map((t) => `${BALANCE_TYPE_LABELS[t]} ${formatCount(toNumber(counts[t]))}`)
        .join(', ');
      showToast(`${user.loginId} 적립 완료 (${summary})`, 'success');
      onDone();
    } catch {
      setError('처리 중 오류가 발생했습니다. 다시 누르면 남은 유형만 같은 요청으로 처리됩니다(중복 처리되지 않음).');
    } finally {
      setIsSubmitting(false);
    }
  };

  const presetOptions: { key: Preset; label: string; disabled?: boolean }[] = [
    { key: 'even', label: '균등 분할', disabled: pricedTypes.length === 0 },
    ...BALANCE_TYPES.map((t) => ({ key: t as Preset, label: `${BALANCE_TYPE_LABELS[t]} 100%`, disabled: platformPrices[t] == null })),
    { key: 'manual', label: '직접 입력' },
  ];

  return (
    <Modal
      title={`적립 — ${user.name} (${user.loginId})`}
      onClose={close}
      busy={isSubmitting}
      maxWidth="max-w-2xl"
      footer={
        <>
          <button className={secondaryButtonClass} onClick={close} disabled={isSubmitting}>{started ? '닫기' : '취소'}</button>
          <button className={primaryButtonClass} onClick={submit} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? '처리 중...' : started ? '남은 유형 적립하기' : '적립하기'}
          </button>
        </>
      }
    >
      <div>
        <label className={labelClass}>입금 금액 (부가세 별도)</label>
        <div className="relative">
          <input
            className={`${inputClass} pr-8`}
            inputMode="numeric"
            value={amountText ? Number(amountText).toLocaleString() : ''}
            onChange={(e) => changeAmount(e.target.value)}
            placeholder="예: 1,000,000"
            disabled={started}
            autoFocus
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">원</span>
        </div>
      </div>

      <div>
        <label className={labelClass}>분배</label>
        <div className="flex flex-wrap gap-2">
          {presetOptions.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => changePreset(o.key)}
              disabled={started || o.disabled}
              className={`px-3 py-1.5 rounded-lg border-2 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed ${preset === o.key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-1">균등 분할은 금액을 유형 수만큼 나눠 각 단가로 계산합니다. 건수는 내림이라 입력 금액을 넘지 않습니다.</p>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-slate-400 font-semibold border-b border-slate-200">
            <th className="text-left py-2">유형</th>
            <th className="text-right py-2">단가</th>
            <th className="text-right py-2">보유</th>
            <th className="text-right py-2 w-36">적립 건수</th>
            <th className="text-right py-2">금액</th>
          </tr>
        </thead>
        <tbody>
          {BALANCE_TYPES.map((t) => {
            const price = platformPrices[t];
            const done = doneTypes[t];
            return (
              <tr key={t} className="border-b border-slate-100">
                <td className="py-2 text-slate-800">
                  {BALANCE_TYPE_LABELS[t]}
                  {done !== undefined && <span className="ml-1.5 text-[11px] font-semibold text-green-600">완료</span>}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-500">{price == null ? '단가 미설정' : formatPrice(price)}</td>
                <td className="py-2 text-right tabular-nums text-slate-500">
                  {formatCount(done ?? user.availableCounts[t] ?? 0)}
                </td>
                <td className="py-2 pl-3">
                  <input
                    className={`${inputClass} text-right py-1.5`}
                    inputMode="numeric"
                    value={counts[t] ? Number(counts[t]).toLocaleString() : ''}
                    onChange={(e) => changeCount(t, e.target.value)}
                    placeholder="0"
                    disabled={price == null || done !== undefined || isSubmitting}
                  />
                </td>
                <td className="py-2 text-right tabular-nums text-slate-700">{typeAmount(t).toLocaleString()}원</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
        <p>
          적립 합계 <span className="font-semibold text-slate-900">{formatCount(totalCount)}</span> ·{' '}
          <span className="font-semibold text-slate-900">{totalAmount.toLocaleString()}원</span>
          <span className="text-slate-400"> (부가세 별도)</span>
        </p>
        {amount > 0 && (
          <p className={diff < 0 ? 'text-amber-600 font-medium' : 'text-slate-500'}>
            입력 금액 {amount.toLocaleString()}원 ·{' '}
            {diff > 0 ? `남는 금액 ${diff.toLocaleString()}원` : diff < 0 ? `입력 금액보다 ${(-diff).toLocaleString()}원 많음` : '남는 금액 없음'}
          </p>
        )}
        <p className="text-slate-400">건수가 새로 생기는 유일한 경로입니다. 대금은 오프라인으로 처리합니다.</p>
      </div>

      <div>
        <label className={labelClass}>메모 (필수)</label>
        <input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={200} placeholder="예: 10월 입금분" disabled={started} />
        <p className="text-[11px] text-slate-400 mt-1">적립하는 모든 유형에 같은 메모가 남습니다.</p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </Modal>
  );
}
