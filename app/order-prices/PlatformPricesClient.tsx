'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getPlatformPrices, updatePlatformPrices } from '../agencies/actions';
import Pagination from '../agencies/components/Pagination';
import PriceHistoryTable from '../agencies/components/PriceHistoryTable';
import Modal, { inputClass, labelClass, primaryButtonClass, secondaryButtonClass, selectClass } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  BALANCE_TYPES,
  BALANCE_TYPE_LABELS,
  BALANCE_TYPE_SHORT_LABELS,
  formatPrice,
  type BalanceType,
  type PriceChange,
  type PriceHistory,
  type Prices,
} from '../types/agency';

const PAGE_SIZE = 20;

/**
 * 플랫폼 단가 조회·변경. tier-1 단가도 함께 바뀐다.
 * 올려서 tier-2 단가보다 높아지면(역전) 막지 않고 결과로 알린다. 그 tier-1 화면에도 경고로 보인다.
 */
export default function PlatformPricesClient() {
  const [current, setCurrent] = useState<Prices | null>(null);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [type, setType] = useState<'all' | BalanceType>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [lastChange, setLastChange] = useState<PriceChange | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const r = await getPlatformPrices({ type, page, limit: PAGE_SIZE });
      if (!r.ok || !r.data) {
        setError(r.error);
        return;
      }
      setCurrent(r.data.current);
      setHistory(r.data.history);
      setTotal(r.data.total);
    } catch {
      setError('플랫폼 단가를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [type, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const inverted = lastChange
    ? Object.entries(lastChange).flatMap(([t, c]) => (c?.invertedChildren ?? []).map((child) => ({ type: t as BalanceType, child, after: c!.after })))
    : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">플랫폼 단가</h1>
          <p className="text-sm text-slate-500 mt-1">tier-1 대리점의 단가이자 적립 청구 기준입니다. 바꾸면 tier-1 단가도 함께 바뀝니다.</p>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          disabled={!current}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
        >
          단가 변경
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BALANCE_TYPES.map((t) => (
          <div key={t} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-500">{BALANCE_TYPE_LABELS[t]}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{current ? formatPrice(current[t]) : '-'}</p>
          </div>
        ))}
      </div>

      {inverted.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-semibold text-amber-800 mb-1">단가 역전 발생</p>
          <ul className="text-xs text-amber-700 space-y-0.5">
            {inverted.map(({ type: t, child, after }) => (
              <li key={`${t}-${child.userId}`}>
                <Link href={`/agencies/${child.userId}`} className="underline">{child.name}</Link>의 {BALANCE_TYPE_LABELS[t]} 단가({formatPrice(child.price)})가 새 tier-1 단가({formatPrice(after)})보다 낮습니다.
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-600 mt-1.5">막지 않았습니다. 해당 tier-1 대리점 화면에 경고로 보이며, tier-1이 하위 계정 단가를 올리면 사라집니다.</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800 mr-2">변경 이력</h3>
          <select className={selectClass} value={type} onChange={(e) => { setType(e.target.value as 'all' | BalanceType); setPage(1); }}>
            <option value="all">전체 상품 유형</option>
            {BALANCE_TYPES.map((t) => <option key={t} value={t}>{BALANCE_TYPE_SHORT_LABELS[t]}</option>)}
          </select>
          <span className="text-xs text-slate-400 ml-auto">총 {total.toLocaleString()}건</span>
        </div>
        <PriceHistoryTable prices={history} isLoading={isLoading} error={error} platform />
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {showEdit && current && (
        <EditPricesModal
          current={current}
          onClose={() => setShowEdit(false)}
          onDone={(changed) => {
            setShowEdit(false);
            setLastChange(changed);
            setPage(1);
            void load();
          }}
        />
      )}
    </div>
  );
}

function EditPricesModal({ current, onClose, onDone }: { current: Prices; onClose: () => void; onDone: (changed: PriceChange) => void }) {
  const { showToast } = useToast();
  const [values, setValues] = useState<Record<BalanceType, string>>(() => ({
    quiz1: current.quiz1 != null ? String(current.quiz1) : '',
    quiz2: current.quiz2 != null ? String(current.quiz2) : '',
    direction: current.direction != null ? String(current.direction) : '',
  }));
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 바뀐 유형만 보낸다
  const changes = Object.fromEntries(
    BALANCE_TYPES.filter((t) => values[t] !== '' && Number(values[t]) !== current[t]).map((t) => [t, Number(values[t])]),
  ) as Partial<Record<BalanceType, number>>;
  const changedTypes = Object.keys(changes) as BalanceType[];
  const problem = changedTypes.some((t) => !Number.isInteger(changes[t]) || changes[t]! < 1) ? '단가는 1원 이상 정수여야 합니다.' : null;

  const submit = async () => {
    if (changedTypes.length === 0 || problem) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const r = await updatePlatformPrices(changes, memo);
      if (!r.ok || !r.data) {
        setError(r.error);
        return;
      }
      const invertedCount = Object.values(r.data.changed).reduce((n, c) => n + (c?.invertedChildren.length ?? 0), 0);
      showToast(
        invertedCount > 0 ? `플랫폼 단가를 바꿨습니다. 역전된 tier-2 ${invertedCount}건이 있습니다.` : '플랫폼 단가를 바꿨습니다.',
        invertedCount > 0 ? 'warning' : 'success',
      );
      onDone(r.data.changed);
    } catch {
      setError('처리 중 오류가 발생했습니다. 이력을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="플랫폼 단가 변경"
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <button className={secondaryButtonClass} onClick={onClose} disabled={isSubmitting}>취소</button>
          <button className={primaryButtonClass} onClick={submit} disabled={isSubmitting || changedTypes.length === 0 || !!problem}>
            {isSubmitting ? '변경 중...' : '변경하기'}
          </button>
        </>
      }
    >
      {BALANCE_TYPES.map((t) => (
        <div key={t}>
          <label className={labelClass}>{BALANCE_TYPE_LABELS[t]} (현재 {formatPrice(current[t])})</label>
          <input
            className={inputClass}
            inputMode="numeric"
            value={values[t]}
            onChange={(e) => { setValues((v) => ({ ...v, [t]: e.target.value.replace(/[^0-9]/g, '') })); setError(null); }}
          />
        </div>
      ))}
      <div>
        <label className={labelClass}>메모 (선택)</label>
        <input className={inputClass} value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={200} placeholder="변경 사유" />
      </div>
      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
        {changedTypes.length === 0 ? (
          <p className="text-slate-400">바뀐 단가가 없습니다.</p>
        ) : changedTypes.map((t) => (
          <p key={t}>{BALANCE_TYPE_LABELS[t]}: {formatPrice(current[t])} → <span className="font-semibold text-slate-900">{formatPrice(changes[t])}</span></p>
        ))}
        <p className="text-slate-400">tier-1 단가도 함께 바뀝니다. 이미 적립·판매된 건수와 tier-2·3 단가는 바뀌지 않습니다.</p>
      </div>
      {(problem || error) && <p className="text-xs text-red-600">{problem || error}</p>}
    </Modal>
  );
}
