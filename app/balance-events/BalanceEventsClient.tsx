'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getBalanceEvents } from '../agencies/actions';
import Pagination from '../agencies/components/Pagination';
import { selectClass } from '../components/Modal';
import { useToast } from '../components/Toast';
import {
  ACTOR_TYPE_LABELS,
  BALANCE_TYPES,
  BALANCE_TYPE_SHORT_LABELS,
  EVENT_KIND_LABELS,
  formatDateTime,
  LEDGER_KIND_OPTIONS,
  PERIOD_OPTIONS,
  type AccountRef,
  type BalanceEvent,
  type BalanceType,
  type LedgerKind,
  type PeriodFilter,
} from '../types/agency';

const PAGE_SIZE = 50;

const isKind = (v: string | undefined): v is LedgerKind => !!v && LEDGER_KIND_OPTIONS.some((o) => o.value === v && v !== 'all');

/** from/to가 null이면 시스템 밖이다: 적립의 보낸 쪽은 플랫폼, 발주 차감의 받는 쪽은 발주 소비 */
function AccountCell({ account, empty }: { account: AccountRef | null; empty: string }) {
  if (!account) return <span className="text-slate-400">{empty}</span>;
  return (
    <Link href={`/agencies/${account.id}`} className="hover:text-blue-600">
      {account.name}<span className="ml-1 text-slate-400">{account.loginId}</span>
    </Link>
  );
}

const emptyLabel = (e: BalanceEvent, side: 'from' | 'to') => {
  if (e.kind === 'issue' && side === 'from') return '플랫폼';
  if (e.kind.startsWith('order_')) return '발주';
  if (e.kind === 'adjust') return '조정';
  return '-';
};

/** 판매·회수는 보낸 쪽 → 받은 쪽 단가, 한쪽만 있는 적립·조정·발주는 그 단가 하나. 전환은 플랫폼 단가만 쓴다 */
const priceText = (e: BalanceEvent) => {
  if (e.fromPrice != null && e.toPrice != null) return `${e.fromPrice.toLocaleString()} → ${e.toPrice.toLocaleString()}원`;
  const price = e.fromPrice ?? e.toPrice;
  return price != null ? `${price.toLocaleString()}원` : '-';
};

const countText = (e: BalanceEvent) =>
  e.kind === 'convert' && e.toType && e.toCount != null
    ? `${e.count.toLocaleString()} → ${BALANCE_TYPE_SHORT_LABELS[e.toType]} ${e.toCount.toLocaleString()}`
    : e.count.toLocaleString();

/**
 * 원장 이벤트(보낸 쪽 → 받은 쪽) 조회. 기간·종류·유형·계정으로 거른다.
 * 적립은 `건수 × 받은 쪽 단가(적립 시점 플랫폼 단가)`가 tier-1 청구 참고 금액이다.
 */
export default function BalanceEventsClient({ initialUserId, initialKind }: { initialUserId?: string; initialKind?: string }) {
  const { showToast } = useToast();
  const [kind, setKind] = useState<'all' | LedgerKind>(isKind(initialKind) ? initialKind : 'all');
  const [type, setType] = useState<'all' | BalanceType>('all');
  const [period, setPeriod] = useState<PeriodFilter | 'all'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [userId, setUserId] = useState(initialUserId ?? '');
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<BalanceEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // 기간 설정은 날짜를 고르고 조회를 눌러야 적용한다
    if (period === 'custom' && !customRange) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const r = await getBalanceEvents({
        kind,
        type,
        userId: userId || undefined,
        period: period === 'all' ? undefined : period,
        startDate: customRange?.start,
        endDate: customRange?.end,
        page,
        limit: PAGE_SIZE,
      });
      if (!r.ok || !r.data) {
        setError(r.error);
        return;
      }
      setEvents(r.data.events);
      setTotal(r.data.total);
    } catch {
      setError('원장을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [kind, type, userId, period, customRange, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const changePeriod = (p: PeriodFilter | 'all') => {
    setPeriod(p);
    setCustomRange(null);
    setPage(1);
  };

  const filterUser = events.find((e) => e.from?.id === userId)?.from ?? events.find((e) => e.to?.id === userId)?.to ?? null;

  // 적립 청구 참고: 이 페이지에 보이는 적립만 합한다
  const issues = events.filter((e) => e.kind === 'issue');
  const issueAmount = issues.reduce((sum, e) => sum + e.count * (e.toPrice ?? 0), 0);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      showToast('이벤트 id를 복사했습니다.', 'info');
    } catch {
      showToast(id, 'info');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">건수 원장</h1>
        <p className="text-sm text-slate-500 mt-1">적립·판매·회수·전환·조정과 발주 차감·반환 기록입니다. 원장은 수정·삭제되지 않습니다.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {PERIOD_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => changePeriod(o.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${period === o.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={selectClass} />
            <span className="text-sm text-slate-400">~</span>
            <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className={selectClass} />
            <button
              onClick={() => { setCustomRange({ start: startDate, end: endDate }); setPage(1); }}
              disabled={!startDate || !endDate}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40"
            >
              조회
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
          <select className={selectClass} value={kind} onChange={(e) => { setKind(e.target.value as 'all' | LedgerKind); setPage(1); }}>
            {LEDGER_KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className={selectClass} value={type} onChange={(e) => { setType(e.target.value as 'all' | BalanceType); setPage(1); }}>
            <option value="all">전체 상품 유형</option>
            {BALANCE_TYPES.map((t) => <option key={t} value={t}>{BALANCE_TYPE_SHORT_LABELS[t]}</option>)}
          </select>
          {userId && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-lg">
              계정: {filterUser ? `${filterUser.name} (${filterUser.loginId})` : userId.slice(0, 8)}
              <button onClick={() => { setUserId(''); setPage(1); }} className="ml-1 text-blue-400 hover:text-blue-700" aria-label="계정 필터 해제">✕</button>
            </span>
          )}
          <span className="text-xs text-slate-400 ml-auto">총 {total.toLocaleString()}건</span>
        </div>

        {issues.length > 0 && (
          <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-800">
            이 페이지 적립 {issues.length}건 · {issues.reduce((n, e) => n + e.count, 0).toLocaleString()}건수 · 청구 참고 금액{' '}
            <span className="font-semibold">{issueAmount.toLocaleString()}원</span>
            {total > events.length && <span className="text-indigo-500"> (다른 페이지는 포함하지 않음)</span>}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">일시</th>
                <th className="px-4 py-2.5 text-left font-medium">종류</th>
                <th className="px-4 py-2.5 text-left font-medium">상품 유형</th>
                <th className="px-4 py-2.5 text-right font-medium">건수</th>
                <th className="px-4 py-2.5 text-left font-medium">보낸 쪽</th>
                <th className="px-4 py-2.5 text-left font-medium">받은 쪽</th>
                <th className="px-4 py-2.5 text-left font-medium">단가 / 플랫폼</th>
                <th className="px-4 py-2.5 text-left font-medium">처리</th>
                <th className="px-4 py-2.5 text-left font-medium">메모</th>
                <th className="px-4 py-2.5 text-left font-medium">id</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">불러오는 중...</td></tr>
              ) : period === 'custom' && !customRange ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">기간을 고르고 조회를 눌러 주세요</td></tr>
              ) : error ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">내역이 없습니다</td></tr>
              ) : events.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(e.createdAt)}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {EVENT_KIND_LABELS[e.kind] ?? e.kind}
                    {e.belowCostConfirmed && <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-700">역전 판매</span>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{BALANCE_TYPE_SHORT_LABELS[e.type]}</td>
                  <td className="px-4 py-2.5 text-right font-medium whitespace-nowrap">{countText(e)}</td>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap"><AccountCell account={e.from} empty={emptyLabel(e, 'from')} /></td>
                  <td className="px-4 py-2.5 text-xs whitespace-nowrap"><AccountCell account={e.to} empty={emptyLabel(e, 'to')} /></td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    {priceText(e)}
                    <span className="text-slate-400"> / {e.platformPrice.toLocaleString()}원</span>
                    {e.kind === 'issue' && e.toPrice != null && <span className="block text-indigo-600">청구 {(e.count * e.toPrice).toLocaleString()}원</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{ACTOR_TYPE_LABELS[e.actorType] ?? e.actorType}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[14rem] truncate" title={e.memo ?? ''}>
                    {e.memo ?? ''}
                    {e.orderId && <span className="block text-slate-400">발주 {e.orderId.slice(0, 8)}</span>}
                    {e.sourceEventId && <span className="block text-slate-400">원 판매 {e.sourceEventId.slice(0, 8)}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <button onClick={() => copyId(e.id)} className="font-mono text-slate-400 hover:text-blue-600" title={`${e.id} (복사)`}>{e.id.slice(0, 8)}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </div>
  );
}
