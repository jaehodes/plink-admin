'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAgencyLedger } from '../actions';
import { selectClass } from '../../components/Modal';
import {
  ACTOR_TYPE_LABELS,
  BALANCE_TYPES,
  BALANCE_TYPE_SHORT_LABELS,
  formatDateTime,
  LEDGER_KIND_OPTIONS,
  ledgerKindLabel,
  type BalanceType,
  type LedgerEntry,
  type LedgerKind,
} from '../../types/agency';
import Pagination from './Pagination';

const PAGE_SIZE = 20;

/** 그 순간의 단가 스냅샷. 판매·회수는 보낸 쪽 → 받은 쪽, 나머지는 이 계정 쪽 단가 */
const priceText = (e: LedgerEntry) => {
  if (e.kind === 'transfer' || e.kind === 'reclaim') {
    return `${e.fromPrice?.toLocaleString() ?? '-'} → ${e.toPrice?.toLocaleString() ?? '-'}원`;
  }
  const price = e.delta < 0 ? e.fromPrice : e.toPrice;
  return price != null ? `${price.toLocaleString()}원` : '-';
};

const kindDetail = (e: LedgerEntry) => {
  if (e.kind === 'convert' && e.toType && e.toCount != null) {
    return e.delta < 0 ? `→ ${BALANCE_TYPE_SHORT_LABELS[e.toType]} ${e.toCount.toLocaleString()}건` : '';
  }
  if (e.orderId) return `발주 ${e.orderId.slice(0, 8)}`;
  if (e.sourceEventId) return `원 판매 ${e.sourceEventId.slice(0, 8)}`;
  return '';
};

interface LedgerTableProps {
  userId: string;
  /** 바뀌면 다시 불러온다 (적립·회수 뒤 등) */
  reloadKey?: number;
}

/** 한 계정의 잔액 변동(원장) 표. 최근 순이며 유형·종류로 거른다 */
export default function LedgerTable({ userId, reloadKey = 0 }: LedgerTableProps) {
  const [type, setType] = useState<'all' | BalanceType>('all');
  const [kind, setKind] = useState<'all' | LedgerKind>('all');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const r = await getAgencyLedger(userId, { type, kind, page, limit: PAGE_SIZE });
      if (!r.ok || !r.data) {
        setError(r.error);
        return;
      }
      setEntries(r.data.entries);
      setTotal(r.data.total);
    } catch {
      setError('잔액 변동을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, type, kind, page]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-800 mr-2">잔액 변동</h3>
        <select className={selectClass} value={type} onChange={(e) => { setType(e.target.value as 'all' | BalanceType); setPage(1); }}>
          <option value="all">전체 유형</option>
          {BALANCE_TYPES.map((t) => <option key={t} value={t}>{BALANCE_TYPE_SHORT_LABELS[t]}</option>)}
        </select>
        <select className={selectClass} value={kind} onChange={(e) => { setKind(e.target.value as 'all' | LedgerKind); setPage(1); }}>
          {LEDGER_KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="text-xs text-slate-400 ml-auto">총 {total.toLocaleString()}건</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">일시</th>
              <th className="px-4 py-2.5 text-left font-medium">종류</th>
              <th className="px-4 py-2.5 text-left font-medium">유형</th>
              <th className="px-4 py-2.5 text-right font-medium">변동</th>
              <th className="px-4 py-2.5 text-right font-medium">변동 후</th>
              <th className="px-4 py-2.5 text-left font-medium">상대 계정</th>
              <th className="px-4 py-2.5 text-left font-medium">단가</th>
              <th className="px-4 py-2.5 text-left font-medium">처리</th>
              <th className="px-4 py-2.5 text-left font-medium">메모</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">불러오는 중...</td></tr>
            ) : error ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">내역이 없습니다</td></tr>
            ) : entries.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {ledgerKindLabel(e)}
                  {e.belowCostConfirmed && <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-700">역전 판매</span>}
                  {kindDetail(e) && <span className="ml-1 text-[11px] text-slate-400">{kindDetail(e)}</span>}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">{BALANCE_TYPE_SHORT_LABELS[e.type]}</td>
                <td className={`px-4 py-2.5 text-right font-medium whitespace-nowrap ${e.delta > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {e.delta > 0 ? '+' : ''}{e.delta.toLocaleString()}
                </td>
                <td className="px-4 py-2.5 text-right text-slate-900 whitespace-nowrap">{e.balanceAfter.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                  {e.counterparty ? `${e.counterparty.name} (${e.counterparty.loginId})` : '-'}
                </td>
                <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{priceText(e)}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{ACTOR_TYPE_LABELS[e.actorType] ?? e.actorType}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[16rem] truncate" title={e.memo ?? ''}>{e.memo ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
