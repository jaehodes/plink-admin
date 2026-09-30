'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAgencyPriceHistory, type AgencyDetail } from '../actions';
import { selectClass } from '../../components/Modal';
import { StatusBadge, TierBadge } from '../components/Badges';
import BlockModal from '../components/BlockModal';
import ConvertModal from '../components/ConvertModal';
import CountModal, { type CountMode } from '../components/CountModal';
import LedgerTable from '../components/LedgerTable';
import Pagination from '../components/Pagination';
import PriceHistoryTable from '../components/PriceHistoryTable';
import {
  ACTOR_TYPE_LABELS,
  BALANCE_TYPES,
  BALANCE_TYPE_LABELS,
  BALANCE_TYPE_SHORT_LABELS,
  formatCount,
  formatDateTime,
  formatPrice,
  type BalanceType,
  type PriceHistory,
  type Prices,
} from '../../types/agency';

interface AgencyDetailClientProps {
  detail: AgencyDetail;
  platformPrices: Prices;
}

type ModalState = { kind: 'count'; mode: CountMode } | { kind: 'convert' } | { kind: 'block' } | null;

const PRICE_PAGE_SIZE = 20;

const actionButtonClass = 'px-3 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

export default function AgencyDetailClient({ detail, platformPrices }: AgencyDetailClientProps) {
  const router = useRouter();
  const { user, children, blockHistory } = detail;
  const [modal, setModal] = useState<ModalState>(null);
  const [tab, setTab] = useState<'ledger' | 'prices' | 'blocks'>('ledger');
  const [reloadKey, setReloadKey] = useState(0);

  const isTier1 = user.tier === 1;
  const closeModal = useCallback(() => setModal(null), []);
  const afterChange = () => {
    setModal(null);
    setReloadKey((k) => k + 1);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div>
        <Link href="/agencies" className="text-xs text-slate-500 hover:text-blue-600">← 대리점 목록</Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          <span className="text-sm text-slate-400">{user.loginId}</span>
          <TierBadge tier={user.tier} />
          <StatusBadge user={user} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
          <span>
            상위 계정:{' '}
            {user.parent ? (
              <Link href={`/agencies/${user.parent.id}`} className="text-blue-600 hover:underline">{user.parent.name} ({user.parent.loginId})</Link>
            ) : '없음 (관리자 직속)'}
          </span>
          <span>생성 {formatDateTime(user.createdAt)}</span>
          <span>최근 로그인 {formatDateTime(user.lastLoginAt)}</span>
          <Link href={`/balance-events?userId=${user.id}`} className="text-blue-600 hover:underline">원장 이벤트 보기</Link>
        </div>
        {user.blocked && (
          <p className="mt-2 text-xs text-red-600">
            {formatDateTime(user.blockedAt)} {user.blockedByType ? ACTOR_TYPE_LABELS[user.blockedByType] : ''} 차단
            {user.blockedReason && ` — ${user.blockedReason}`}
          </p>
        )}
        {!user.blocked && user.blockedByAncestor && <p className="mt-2 text-xs text-amber-700">상위 계정이 차단되어 이 계정도 로그인·발주·판매가 막혀 있습니다.</p>}
      </div>

      {/* 유형별 건수·단가 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BALANCE_TYPES.map((t) => {
          const count = user.availableCounts[t] ?? 0;
          const price = user.prices[t];
          return (
            <div key={t} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500">{BALANCE_TYPE_LABELS[t]}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{formatCount(count)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {isTier1 ? '플랫폼 단가' : '단가'} {formatPrice(price)}
                {price != null && count > 0 && <span className="text-slate-400"> · 참고 {(count * price).toLocaleString()}원</span>}
              </p>
              {!isTier1 && platformPrices[t] != null && <p className="text-[11px] text-slate-400">플랫폼 단가 {formatPrice(platformPrices[t])}</p>}
            </div>
          );
        })}
      </div>

      {/* 작업 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-2">
        <button
          className={`${actionButtonClass} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`}
          disabled={!isTier1 || user.blocked}
          title={!isTier1 ? '적립은 tier-1만 받을 수 있습니다' : user.blocked ? '차단된 계정에는 적립할 수 없습니다' : undefined}
          onClick={() => setModal({ kind: 'count', mode: 'issue' })}
        >
          적립
        </button>
        <button
          className={`${actionButtonClass} border-slate-300 text-slate-700 hover:bg-slate-50`}
          disabled={!user.parent}
          title={!user.parent ? 'tier-1은 부모가 없어 회수할 수 없습니다' : undefined}
          onClick={() => setModal({ kind: 'count', mode: 'reclaim' })}
        >
          회수 (→ 상위 계정)
        </button>
        <button className={`${actionButtonClass} border-slate-300 text-slate-700 hover:bg-slate-50`} onClick={() => setModal({ kind: 'convert' })}>
          유형 전환
        </button>
        <button className={`${actionButtonClass} border-slate-300 text-slate-700 hover:bg-slate-50`} onClick={() => setModal({ kind: 'count', mode: 'adjust' })}>
          수동 조정
        </button>
        <div className="flex-1" />
        <button
          className={`${actionButtonClass} ${user.blocked ? 'border-green-600 text-green-700 hover:bg-green-50' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
          onClick={() => setModal({ kind: 'block' })}
        >
          {user.blocked ? '차단 해제' : '차단'}
        </button>
      </div>

      {/* 하위 계정 */}
      {user.tier < 3 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center">
            <h3 className="text-sm font-semibold text-slate-800">하위 계정 (tier-{user.tier + 1})</h3>
            <span className="text-xs text-slate-400 ml-auto">{children.length}개</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">계정</th>
                  {BALANCE_TYPES.map((t) => (
                    <th key={t} className="px-4 py-2.5 text-right font-medium">{BALANCE_TYPE_SHORT_LABELS[t]} 건수 / 단가</th>
                  ))}
                  <th className="px-4 py-2.5 text-left font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {children.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">하위 계정이 없습니다</td></tr>
                ) : children.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/agencies/${c.id}`)}>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-slate-900">{c.name}</span>
                      <span className="ml-1 text-xs text-slate-400">{c.loginId}</span>
                    </td>
                    {BALANCE_TYPES.map((t) => {
                      const inverted = c.prices[t] != null && user.prices[t] != null && c.prices[t]! < user.prices[t]!;
                      return (
                        <td key={t} className="px-4 py-2.5 text-right whitespace-nowrap">
                          {(c.availableCounts[t] ?? 0).toLocaleString()}
                          <span className={`ml-1 text-xs ${inverted ? 'text-amber-600 font-medium' : 'text-slate-400'}`} title={inverted ? '부모 단가보다 낮음(역전)' : undefined}>
                            / {formatPrice(c.prices[t])}{inverted && ' ⚠'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2.5"><StatusBadge user={c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 이력 탭 */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6">
          {([
            ['ledger', '잔액 변동'],
            ['prices', '단가 이력'],
            ['blocks', `차단 이력 (${blockHistory.length})`],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`py-2.5 px-1 border-b-2 text-sm font-medium transition-colors ${tab === key ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'ledger' && <LedgerTable userId={user.id} reloadKey={reloadKey} />}
      {tab === 'prices' && <PriceHistorySection userId={user.id} isTier1={isTier1} />}
      {tab === 'blocks' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">일시</th>
                <th className="px-4 py-2.5 text-left font-medium">처리</th>
                <th className="px-4 py-2.5 text-left font-medium">처리자</th>
                <th className="px-4 py-2.5 text-left font-medium">사유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {blockHistory.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">이력이 없습니다</td></tr>
              ) : blockHistory.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(h.createdAt)}</td>
                  <td className={`px-4 py-2.5 font-medium ${h.action === 'block' ? 'text-red-600' : 'text-green-600'}`}>{h.action === 'block' ? '차단' : '해제'}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{ACTOR_TYPE_LABELS[h.actorType] ?? h.actorType}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{h.reason ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-[11px] text-slate-400 border-t border-slate-100">최근 20건</p>
        </div>
      )}

      {modal?.kind === 'count' && (
        <CountModal mode={modal.mode} user={user} platformPrices={platformPrices} onClose={closeModal} onDone={afterChange} />
      )}
      {modal?.kind === 'convert' && <ConvertModal user={user} platformPrices={platformPrices} onClose={closeModal} onDone={afterChange} />}
      {modal?.kind === 'block' && <BlockModal user={user} onClose={closeModal} onDone={afterChange} />}
    </div>
  );
}

/** 계정 단가 이력. tier-1은 플랫폼 단가를 쓰므로 비어 있다 */
function PriceHistorySection({ userId, isTier1 }: { userId: string; isTier1: boolean }) {
  const [type, setType] = useState<'all' | BalanceType>('all');
  const [page, setPage] = useState(1);
  const [prices, setPrices] = useState<PriceHistory[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const r = await getAgencyPriceHistory(userId, { type, page, limit: PRICE_PAGE_SIZE });
        if (cancelled) return;
        if (!r.ok || !r.data) setError(r.error);
        else { setPrices(r.data.prices); setTotal(r.data.total); }
      } catch {
        if (!cancelled) setError('단가 이력을 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, type, page]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-800 mr-2">단가 이력</h3>
        <select className={selectClass} value={type} onChange={(e) => { setType(e.target.value as 'all' | BalanceType); setPage(1); }}>
          <option value="all">전체 유형</option>
          {BALANCE_TYPES.map((t) => <option key={t} value={t}>{BALANCE_TYPE_SHORT_LABELS[t]}</option>)}
        </select>
        {isTier1 && <span className="text-xs text-slate-400">tier-1은 플랫폼 단가를 씁니다. <Link href="/order-prices" className="text-blue-600 hover:underline">플랫폼 단가 이력</Link></span>}
        <span className="text-xs text-slate-400 ml-auto">총 {total.toLocaleString()}건</span>
      </div>
      <PriceHistoryTable prices={prices} isLoading={isLoading} error={error} />
      <Pagination page={page} total={total} pageSize={PRICE_PAGE_SIZE} onChange={setPage} />
    </div>
  );
}
