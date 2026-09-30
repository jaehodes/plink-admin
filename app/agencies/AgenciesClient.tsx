'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import CreateTier1Modal from './components/CreateTier1Modal';
import { StatusBadge, TierBadge } from './components/Badges';
import { BALANCE_TYPES, BALANCE_TYPE_SHORT_LABELS, formatDateTime, type AgencyUser } from '../types/agency';

interface AgenciesClientProps {
  users: AgencyUser[];
  total: number;
  error: string | null;
  pageSize: number;
}

const TIER_FILTERS = [
  { key: 'all', label: '전체' },
  { key: '1', label: 'tier-1' },
  { key: '2', label: 'tier-2' },
  { key: '3', label: 'tier-3' },
];

const BLOCKED_FILTERS = [
  { key: 'all', label: '전체 상태' },
  { key: 'false', label: '사용 중' },
  { key: 'true', label: '차단' },
];

export default function AgenciesClient({ users, total, error, pageSize }: AgenciesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);

  const currentTier = searchParams.get('tier') || 'all';
  const currentBlocked = searchParams.get('blocked') || 'all';
  const currentSearch = searchParams.get('searchWords') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10) || 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [searchWords, setSearchWords] = useState(currentSearch);

  const push = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === '' || v === 'all') params.delete(k);
      else params.set(k, v);
    }
    if (!('page' in changes)) params.delete('page');
    router.push(`/agencies?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">대리점 관리</h1>
          <button
            onClick={() => router.refresh()}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="새로고침"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          tier-1 계정 만들기
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {TIER_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => push({ tier: f.key })}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${currentTier === f.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={currentBlocked}
          onChange={(e) => push({ blocked: e.target.value })}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {BLOCKED_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <div className="flex items-center gap-2 flex-1 min-w-[16rem]">
          <input
            type="text"
            value={searchWords}
            onChange={(e) => setSearchWords(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') push({ searchWords: searchWords.trim() }); }}
            placeholder="로그인 ID 또는 이름"
            className="flex-1 max-w-xs px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
          />
          <button onClick={() => push({ searchWords: searchWords.trim() })} className="px-4 py-2 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded-lg">
            검색
          </button>
          {currentSearch && (
            <button onClick={() => { setSearchWords(''); push({ searchWords: null }); }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">
              초기화
            </button>
          )}
        </div>
        <span className="text-xs text-slate-400 ml-auto">총 {total.toLocaleString()}개</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">계정</th>
                <th className="px-4 py-3 text-left font-medium">등급</th>
                <th className="px-4 py-3 text-left font-medium">상위 계정</th>
                {BALANCE_TYPES.map((t) => (
                  <th key={t} className="px-4 py-3 text-right font-medium">{BALANCE_TYPE_SHORT_LABELS[t]}<span className="block text-[10px] font-normal">건수 / 단가</span></th>
                ))}
                <th className="px-4 py-3 text-left font-medium">상태</th>
                <th className="px-4 py-3 text-left font-medium">최근 로그인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {error ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-red-500">{error}</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">대리점이 없습니다</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/agencies/${u.id}`)}>
                  <td className="px-4 py-3">
                    <Link href={`/agencies/${u.id}`} className="font-medium text-slate-900 hover:text-blue-600" onClick={(e) => e.stopPropagation()}>{u.name}</Link>
                    <p className="text-xs text-slate-400">{u.loginId}</p>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={u.tier} /></td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {u.parent ? <>{u.parent.name}<span className="block text-slate-400">{u.parent.loginId}</span></> : <span className="text-slate-300">-</span>}
                  </td>
                  {BALANCE_TYPES.map((t) => (
                    <td key={t} className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-medium text-slate-900">{(u.availableCounts[t] ?? 0).toLocaleString()}</span>
                      <span className="block text-[11px] text-slate-400">{u.prices[t] != null ? `${u.prices[t]!.toLocaleString()}원` : '미정'}</span>
                    </td>
                  ))}
                  <td className="px-4 py-3"><StatusBadge user={u} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDateTime(u.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-center gap-2 text-sm">
            <button className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40" disabled={currentPage <= 1} onClick={() => push({ page: String(currentPage - 1) })}>이전</button>
            <span className="text-slate-500">{currentPage} / {totalPages}</span>
            <button className="px-3 py-1 rounded border border-slate-200 disabled:opacity-40" disabled={currentPage >= totalPages} onClick={() => push({ page: String(currentPage + 1) })}>다음</button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTier1Modal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => { setShowCreate(false); router.push(`/agencies/${id}`); }}
        />
      )}
    </div>
  );
}
