'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
  DashboardData,
  PeriodFilter,
  PERIOD_LABELS,
  TYPE_COLORS,
  TYPE_LABELS,
  STATUS_META,
} from '../types/dashboard';

// 검색 입력 분리 (리렌더링 방지)
function TableSearchInput({ onSearch, onClear, hasApplied, placeholder }: { onSearch: (v: string) => void; onClear: () => void; hasApplied: boolean; placeholder?: string }) {
  const [value, setValue] = useState('');
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSearch(value); }}
        placeholder={placeholder ?? '검색'}
        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
      />
      <button
        onClick={() => onSearch(value)}
        className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
      >
        검색
      </button>
      {hasApplied && (
        <button
          onClick={() => { setValue(''); onClear(); }}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          초기화
        </button>
      )}
    </div>
  );
}

const PERIOD_OPTIONS: { key: PeriodFilter; label: string }[] = [
  { key: 'today', label: '오늘' },
  { key: 'yesterday', label: '어제' },
  { key: 'week', label: '이번주' },
  { key: 'month', label: '이번달' },
  { key: 'all', label: '전체' },
  { key: 'custom', label: '기간 설정' },
];

function f(n: number): string {
  return n.toLocaleString('ko-KR');
}

function fmtWon(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

function fmtDur(s: number): string {
  const sec = Math.round(s % 60);
  return s >= 60 ? `${Math.floor(s / 60)}분 ${sec}초` : `${Math.round(s)}초`;
}

function getPeriodRangeText(period: PeriodFilter, startDate?: string, endDate?: string): string {
  const now = new Date();
  const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  switch (period) {
    case 'today': return fmt(now);
    case 'yesterday': { const y = new Date(now); y.setDate(now.getDate() - 1); return fmt(y); }
    case 'week': {
      const dow = now.getDay();
      const mon = new Date(now); mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return `${fmt(mon)} ~ ${fmt(sun)}`;
    }
    case 'month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${fmt(first)} ~ ${fmt(last)}`;
    }
    case 'all': return '전체 기간';
    case 'custom': return startDate && endDate ? `${startDate} ~ ${endDate}` : '기간을 선택하세요';
  }
}

interface DashboardClientProps {
  data: DashboardData | null;
  error: string | null;
  period: PeriodFilter;
}

export default function DashboardClient({ data, error, period }: DashboardClientProps) {
  const router = useRouter();
  const { refreshToken } = useAuth();
  const searchParams = useSearchParams();
  const [customStartDate, setCustomStartDate] = useState(searchParams.get('startDate') || '');
  const [ordererSearchApplied, setOrdererSearchApplied] = useState('');
  const [ordererPage, setOrdererPage] = useState(1);
  const [ordererSort, setOrdererSort] = useState<{ key: 'orders' | 'target' | 'revenue'; dir: 'asc' | 'desc' } | null>(null);
  const [mediaSearchApplied, setMediaSearchApplied] = useState('');
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaSort, setMediaSort] = useState<{ key: 'completed' | 'share' | 'timeoutRate'; dir: 'asc' | 'desc' } | null>(null);
  const [customEndDate, setCustomEndDate] = useState(searchParams.get('endDate') || '');

  const filteredOrderers = useMemo(() => {
    let list = (data?.orderers ?? []).filter(o => !ordererSearchApplied || o.name.includes(ordererSearchApplied));
    if (ordererSort) {
      list = [...list].sort((a, b) => {
        let av: number, bv: number;
        if (ordererSort.key === 'revenue') {
          av = a.revenue;
          bv = b.revenue;
        } else {
          av = a[ordererSort.key];
          bv = b[ordererSort.key];
        }
        return ordererSort.dir === 'asc' ? av - bv : bv - av;
      });
    }
    return list;
  }, [data?.orderers, ordererSearchApplied, ordererSort]);

  const filteredMedia = useMemo(() => {
    let list = (data?.media ?? []).filter(m => !mediaSearchApplied || m.name.includes(mediaSearchApplied));
    if (mediaSort) {
      list = [...list].sort((a, b) => {
        const av = a[mediaSort.key];
        const bv = b[mediaSort.key];
        return mediaSort.dir === 'asc' ? av - bv : bv - av;
      });
    }
    return list;
  }, [data?.media, mediaSearchApplied, mediaSort]);

  const mediaTotalPages = Math.ceil(filteredMedia.length / 4);
  const pagedMedia = filteredMedia.slice((mediaPage - 1) * 4, mediaPage * 4);

  const ordererTotalPages = Math.ceil(filteredOrderers.length / 4);
  const pagedOrderers = filteredOrderers.slice((ordererPage - 1) * 4, ordererPage * 4);

  const periodRangeText = useMemo(
    () => getPeriodRangeText(period, searchParams.get('startDate') || undefined, searchParams.get('endDate') || undefined),
    [period, searchParams]
  );

  const handlePeriodChange = (newPeriod: PeriodFilter) => {
    if (newPeriod === 'custom') {
      if (period !== 'custom') {
        const params = new URLSearchParams();
        params.set('period', 'custom');
        if (customStartDate && customEndDate) {
          params.set('startDate', customStartDate);
          params.set('endDate', customEndDate);
        }
        router.push(`/dashboard?${params.toString()}`);
      }
      return;
    }
    const params = new URLSearchParams();
    if (newPeriod !== 'today') params.set('period', newPeriod);
    router.push(`/dashboard${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleCustomSearch = () => {
    if (!customStartDate || !customEndDate) return;
    const params = new URLSearchParams();
    params.set('period', 'custom');
    params.set('startDate', customStartDate);
    params.set('endDate', customEndDate);
    router.push(`/dashboard?${params.toString()}`);
  };

  const errorMessage = error;

  const hasData = !!data?.hero;
  const emptyData: DashboardData = {
    hero: { orders: 0, target: 0, completed: 0, timeout: 0 },
    userStats: { newUsers: 0, dailyActiveUsers: 0, avgExecutions: 0 },
    orderAgg: { orders: 0, target: 0, revenue: 0 },
    orderers: [],
    media: [],
    status: { completed: 0, progress: 0, timeout: 0, skipped: 0, failed: 0, total: 0 },
    types: [
      { key: 'save', completed: 0, target: 0, avgDuration: 0 },
      { key: 'quiz1', completed: 0, target: 0, avgDuration: 0 },
      { key: 'quiz2', completed: 0, target: 0, avgDuration: 0 },
      { key: 'direction', completed: 0, target: 0, avgDuration: 0 },
    ],
    topRankers: [],
  };

  const d = data ?? emptyData;
  const { hero, orderAgg, status } = d;
  const types = d.types ?? [
    { key: 'save', completed: 0, target: 0, avgDuration: 0 },
    { key: 'quiz1', completed: 0, target: 0, avgDuration: 0 },
    { key: 'quiz2', completed: 0, target: 0, avgDuration: 0 },
    { key: 'direction', completed: 0, target: 0, avgDuration: 0 },
  ];
  const unknownText = '알수없음';
  const v = (n: number | undefined, formatter?: (n: number) => string) => {
    if (!hasData || n === undefined || n === null) return unknownText;
    return formatter ? formatter(n) : f(n);
  };
  const mediaTotal = (d.media ?? []).reduce((a, m) => a + m.completed, 0);
  const heroRate = (hero?.target ?? 0) > 0 ? Math.round(((hero?.completed ?? 0) / (hero?.target ?? 1)) * 100) : 0;
  const rateColor = heroRate >= 100 ? '#27c499' : heroRate >= 70 ? '#5b8cff' : '#f6b73c';
  const toRate = ((hero?.timeout ?? 0) / ((hero?.completed ?? 0) + (hero?.timeout ?? 1)) * 100).toFixed(1);
  const finalTotal = STATUS_META.reduce((a, s) => a + ((status as unknown as Record<string, number>)?.[s[0]] ?? 0), 0);
  const maxStatusCount = Math.max(...STATUS_META.map(s => (status as unknown as Record<string, number>)?.[s[0]] ?? 0), 1);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">관리자 대시보드</h1>
              <button
                onClick={() => { refreshToken(); router.refresh(); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="새로고침"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">{periodRangeText}</p>
          </div>
        </div>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.key}
                onClick={() => handlePeriodChange(option.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  period === option.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 커스텀 날짜 */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-[140px]" />
          <span className="text-sm text-slate-400">~</span>
          <input type="date" value={customEndDate} min={customStartDate || undefined} onChange={(e) => setCustomEndDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-[140px]" />
          <button onClick={handleCustomSearch} disabled={!customStartDate || !customEndDate}
            className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            조회
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {errorMessage}
        </div>
      )}
      <p className="text-xs text-slate-400">기간을 선택하면 아래 모든 집계가 한 번에 바뀝니다.</p>

      {/* ① 유저 진척 */}
      <section>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3">
          <span className="inline-flex w-5 h-5 items-center justify-center bg-slate-100 border border-slate-200 rounded-md text-blue-600 text-[10px] font-bold">1</span>
          유저 진척
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-400 flex items-center gap-1">신규 가입자
              <span className="relative group">
                <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">선택한 기간 내 신규 가입한 유저 수</span>
              </span>
            </p>
            <p className="text-3xl font-extrabold text-slate-800 mt-2">{v(d.userStats?.newUsers)}{hasData && <span className="text-sm font-semibold text-slate-400 ml-1">명</span>}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-400 flex items-center gap-1">일일 유입자
              <span className="relative group">
                <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">선택한 기간 내 활성 유저 수 (DAU)</span>
              </span>
            </p>
            <p className="text-3xl font-extrabold text-slate-800 mt-2">{v(d.userStats?.dailyActiveUsers)}{hasData && <span className="text-sm font-semibold text-slate-400 ml-1">명</span>}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-400 flex items-center gap-1">평균 수행치
              <span className="relative group">
                <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">유저 1인당 평균 수행 건수</span>
              </span>
            </p>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">{hasData ? (d.userStats?.avgExecutions ?? 0) : unknownText}{hasData && <span className="text-sm font-semibold text-slate-400 ml-1">건/명</span>}</p>
          </div>
        </div>
      </section>

      {/* ② 물량 진척 */}
      <section>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3">
          <span className="inline-flex w-5 h-5 items-center justify-center bg-slate-100 border border-slate-200 rounded-md text-blue-600 text-[10px] font-bold">2</span>
          물량 진척 <span className="text-amber-500 text-[10px]">★ 최우선</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-400 flex items-center gap-1">발주 건수
              <span className="relative group">
                <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">선택한 기간 내 활성 발주 수</span>
              </span>
            </p>
            <p className="text-3xl font-extrabold text-slate-800 mt-2">{v(hero?.orders)}{hasData && <span className="text-sm font-semibold text-slate-400 ml-1">건</span>}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-400 flex items-center gap-1">목표 물량
              <span className="relative group">
                <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">일일 목표 수행 수의 합계</span>
              </span>
            </p>
            <p className="text-3xl font-extrabold text-slate-800 mt-2">{v(hero?.target)}{hasData && <span className="text-sm font-semibold text-slate-400 ml-1">건</span>}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-400 flex items-center gap-1">소화 물량
              <span className="relative group">
                <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">완료된 수행 건수</span>
              </span>
            </p>
            <p className="text-3xl font-extrabold mt-2" style={{ color: '#27c499' }}>{v(hero?.completed)}{hasData && <span className="text-sm font-semibold text-slate-400 ml-1">건</span>}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-xs text-slate-400 flex items-center gap-1">진척률
              <span className="relative group">
                <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">소화 물량 / 목표 물량 비율</span>
              </span>
            </p>
            <p className="text-3xl font-extrabold mt-2" style={{ color: rateColor }}>{hasData ? heroRate : unknownText}{hasData && <span className="text-sm font-semibold text-slate-400 ml-1">%</span>}</p>
            <div className="h-2 bg-slate-100 rounded-full mt-3 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(heroRate, 100)}%`, background: rateColor }} />
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 mt-3 flex flex-wrap gap-5 text-xs text-slate-500">
          {hasData ? (
            <>
              <span>잔여 물량 <b className="text-slate-700">{f(Math.max((hero?.target ?? 0) - (hero?.completed ?? 0), 0))}건</b></span>
              <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#ff5e7a' }} />타임오버 <b className="text-slate-700">{f(hero?.timeout ?? 0)}건 ({toRate}%)</b></span>
              <span>
                {heroRate < 70
                  ? <><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#f6b73c' }} />진척률 70% 미만 — 마감 페이스 점검 필요</>
                  : <><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#27c499' }} />정상 페이스</>
                }
              </span>
            </>
          ) : (
            <span className="text-slate-400">알수없음</span>
          )}
        </div>
      </section>

      {/* ③ 발주 집계 + ④ 앱사 소화량 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* 발주 집계 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-4">
            <span className="inline-flex w-5 h-5 items-center justify-center bg-slate-100 border border-slate-200 rounded-md text-blue-600 text-[10px] font-bold">2</span>
            발주 집계 <span className="text-slate-400 font-normal">· {PERIOD_LABELS[period]}</span>
          </div>
          <div className="flex gap-6 flex-wrap pb-3 border-b border-slate-100 mb-3">
            <div>
              <p className="text-xs text-slate-400 flex items-center gap-1">총 발주
                <span className="relative group">
                  <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">선택한 기간 내 총 발주 건수</span>
                </span>
              </p>
              <p className="text-xl font-extrabold text-slate-800 mt-1">{v(orderAgg?.orders)}{hasData && <span className="text-xs font-semibold text-slate-400 ml-1">건</span>}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 flex items-center gap-1">총 물량
                <span className="relative group">
                  <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">선택한 기간 내 총 수행 물량</span>
                </span>
              </p>
              <p className="text-xl font-extrabold text-slate-800 mt-1">{v(orderAgg?.target)}{hasData && <span className="text-xs font-semibold text-slate-400 ml-1">건</span>}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 flex items-center gap-1">총 매출
                <span className="relative group">
                  <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">선택한 기간 내 총 매출액 (Σ totalPrice)</span>
                </span>
              </p>
              <p className="text-xl font-extrabold text-slate-800 mt-1">{v(orderAgg?.revenue, fmtWon)}</p>
            </div>
          </div>
          <TableSearchInput
            placeholder="발주처 검색"
            onSearch={(v) => { setOrdererSearchApplied(v); setOrdererPage(1); }}
            onClear={() => { setOrdererSearchApplied(''); setOrdererPage(1); }}
            hasApplied={!!ordererSearchApplied}
          />
          <div>
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-slate-400 font-semibold uppercase">
              <th className="text-left py-2 px-1">발주처</th>
              {(['orders', 'target', 'revenue'] as const).map((key) => {
                const label = key === 'orders' ? '발주' : key === 'target' ? '물량' : '매출';
                const isActive = ordererSort?.key === key;
                return (
                  <th key={key}
                    className={`text-right py-2 px-1 cursor-pointer select-none transition-colors ${isActive ? 'text-blue-600' : 'hover:text-slate-600'}`}
                    onClick={() => {
                      if (isActive) {
                        setOrdererSort(ordererSort.dir === 'desc' ? { key, dir: 'asc' } : null);
                      } else {
                        setOrdererSort({ key, dir: 'desc' });
                      }
                      setOrdererPage(1);
                    }}
                  >
                    <span className="inline-flex items-center gap-0.5 justify-end">
                      {label}
                      <svg className={`w-3 h-3 transition-transform ${isActive ? 'opacity-100' : 'opacity-0'} ${isActive && ordererSort.dir === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </th>
                );
              })}
            </tr></thead>
            <tbody>
              {pagedOrderers.map((o, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="py-2 px-1 text-slate-700">{o.name}</td>
                  <td className="py-2 px-1 text-right tabular-nums">{f(o.orders)}</td>
                  <td className="py-2 px-1 text-right tabular-nums">{f(o.target)}</td>
                  <td className="py-2 px-1 text-right tabular-nums">{fmtWon(o.revenue)}</td>
                </tr>
              ))}
              {pagedOrderers.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-xs text-slate-400">{ordererSearchApplied ? '검색 결과가 없습니다' : '데이터가 없습니다'}</td></tr>
              )}
            </tbody>
          </table>
          {ordererTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-2">
              <button
                onClick={() => setOrdererPage(Math.max(1, ordererPage - 1))}
                disabled={ordererPage <= 1}
                className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              {Array.from({ length: ordererTotalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setOrdererPage(i + 1)}
                  className={`w-6 h-6 text-xs rounded transition-colors ${
                    ordererPage === i + 1 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setOrdererPage(Math.min(ordererTotalPages, ordererPage + 1))}
                disabled={ordererPage >= ordererTotalPages}
                className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          )}
          </div>
          <div className="flex gap-4 flex-wrap pt-3 border-t border-slate-100 mt-3">
            {(d.orderers ?? []).slice(0, 3).map((o, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-xl">{['🥇', '🥈', '🥉'][i]}</span>
                <div>
                  <p className="text-sm font-bold text-slate-800">{o.name}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">{f(o.orders)}건 · {fmtWon(o.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 앱사 소화량 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-4">
            <span className="inline-flex w-5 h-5 items-center justify-center bg-slate-100 border border-slate-200 rounded-md text-blue-600 text-[10px] font-bold">3</span>
            앱사(매체사)별 소화량
          </div>
          <div className="flex gap-6 flex-wrap pb-3 border-b border-slate-100 mb-3">
            <div>
              <p className="text-xs text-slate-400 flex items-center gap-1">총 소화량
                <span className="relative group">
                  <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">전체 앱사의 완료 수행 합계</span>
                </span>
              </p>
              <p className="text-xl font-extrabold text-slate-800 mt-1">{v(mediaTotal)}{hasData && <span className="text-xs font-semibold text-slate-400 ml-1">건</span>}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 flex items-center gap-1">평균 타임오버율
                <span className="relative group">
                  <svg className="w-3.5 h-3.5 text-slate-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[11px] text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">전체 앱사의 타임오버 비율 평균</span>
                </span>
              </p>
              {(() => {
                if (!hasData) return <p className="text-xl font-extrabold text-slate-400 mt-1">알수없음</p>;
                const allMedia = d.media ?? [];
                const avgTimeout = allMedia.length > 0 ? (allMedia.reduce((a, m) => a + m.timeoutRate, 0) / allMedia.length).toFixed(1) : '0.0';
                return <p className="text-xl font-extrabold text-red-500 mt-1">{avgTimeout}<span className="text-xs font-semibold text-slate-400 ml-1">%</span></p>;
              })()}
            </div>
          </div>
          <TableSearchInput
            placeholder="앱사 검색"
            onSearch={(v) => { setMediaSearchApplied(v); setMediaPage(1); }}
            onClear={() => { setMediaSearchApplied(''); setMediaPage(1); }}
            hasApplied={!!mediaSearchApplied}
          />
          <div>
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-slate-400 font-semibold uppercase">
              <th className="text-left py-2 px-1">앱사</th>
              {([['completed', '소화량', 'text-right'], ['share', '점유율', 'text-left pl-3'], ['timeoutRate', '타임오버', 'text-right']] as const).map(([key, label, align]) => {
                const isActive = mediaSort?.key === key;
                return (
                  <th key={key}
                    className={`${align} py-2 px-1 cursor-pointer select-none transition-colors ${isActive ? 'text-blue-600' : 'hover:text-slate-600'}`}
                    onClick={() => {
                      if (isActive) {
                        setMediaSort(mediaSort.dir === 'desc' ? { key, dir: 'asc' } : null);
                      } else {
                        setMediaSort({ key, dir: 'desc' });
                      }
                      setMediaPage(1);
                    }}
                  >
                    <span className={`inline-flex items-center gap-0.5 ${align.includes('right') ? 'justify-end' : ''}`}>
                      {label}
                      <svg className={`w-3 h-3 transition-transform ${isActive ? 'opacity-100' : 'opacity-0'} ${isActive && mediaSort.dir === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                  </th>
                );
              })}
            </tr></thead>
            <tbody>
              {pagedMedia.map((m, i) => {
                const maxShare = Math.max(...filteredMedia.map(x => x.share), 1);
                return (
                  <tr key={i} className="border-t border-slate-50">
                    <td className="py-2 px-1 text-slate-700">{m.name}</td>
                    <td className="py-2 px-1 text-right tabular-nums">{f(m.completed)}</td>
                    <td className="py-2 px-1 pl-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${(m.share / maxShare) * 100}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-slate-500">{m.share}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-1 text-right tabular-nums">{m.timeoutRate}%</td>
                  </tr>
                );
              })}
              {pagedMedia.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-xs text-slate-400">{mediaSearchApplied ? '검색 결과가 없습니다' : '데이터가 없습니다'}</td></tr>
              )}
            </tbody>
          </table>
          {mediaTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-2">
              <button onClick={() => setMediaPage(Math.max(1, mediaPage - 1))} disabled={mediaPage <= 1}
                className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
              {Array.from({ length: mediaTotalPages }, (_, i) => (
                <button key={i + 1} onClick={() => setMediaPage(i + 1)}
                  className={`w-6 h-6 text-xs rounded transition-colors ${mediaPage === i + 1 ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{i + 1}</button>
              ))}
              <button onClick={() => setMediaPage(Math.min(mediaTotalPages, mediaPage + 1))} disabled={mediaPage >= mediaTotalPages}
                className="px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded disabled:opacity-40 disabled:cursor-not-allowed">›</button>
            </div>
          )}
          </div>
          <div className="flex gap-4 flex-wrap pt-3 border-t border-slate-100 mt-3">
            {(d.media ?? []).slice(0, 3).map((m, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="text-xl">{['🥇', '🥈', '🥉'][i]}</span>
                <div>
                  <p className="text-sm font-bold text-slate-800">{m.name}</p>
                  <p className="text-[11px] text-slate-400 tabular-nums">{f(m.completed)}건 · {m.share}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ④ 타입별 + ⑤ 상태별 + 랭커 */}
      <section className={`grid grid-cols-1 gap-3 ${process.env.NEXT_PUBLIC_NODE_ENV === 'production' ? 'lg:grid-cols-2' : 'lg:grid-cols-[1fr_1fr_200px]'}`}>
        {/* 타입별 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-4">
            <span className="inline-flex w-5 h-5 items-center justify-center bg-slate-100 border border-slate-200 rounded-md text-blue-600 text-[10px] font-bold">4</span>
            타입별 수행 현황 <span className="text-slate-400 font-normal">· 수행 / 목표</span>
          </div>
          <div className="space-y-1">
            {types.map((t) => {
              const pct = hasData && t.target > 0 ? Math.round((t.completed / t.target) * 100) : 0;
              return (
                <div key={t.key} className="py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">{TYPE_LABELS[t.key] || t.key}</span>
                    <div className="tabular-nums">
                      {hasData ? (
                        <>
                          <b className="text-base text-slate-800">{f(t.completed)}</b>
                          <span className="text-xs text-slate-400"> / {f(t.target)}건</span>
                          <span className="text-xs text-slate-400 ml-2">{pct}%</span>
                        </>
                      ) : (
                        <span className="text-sm text-slate-400">{unknownText}</span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, background: TYPE_COLORS[t.key] || '#5b8cff' }} />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">평균 소요시간 {hasData ? <b className="text-slate-600">{fmtDur(t.avgDuration)}</b> : <span>{unknownText}</span>}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 상태별 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-4">
            <span className="inline-flex w-5 h-5 items-center justify-center bg-slate-100 border border-slate-200 rounded-md text-blue-600 text-[10px] font-bold">5</span>
            상태별 수행 현황 <span className="text-slate-400 font-normal">· 종료 {hasData ? `${f(finalTotal)}건` : unknownText} 대비</span>
          </div>
          <div className="space-y-1">
            {STATUS_META.map(([key, label, color]) => {
              const count = (status as unknown as Record<string, number>)?.[key] ?? 0;
              const pct = finalTotal > 0 ? (count / finalTotal * 100).toFixed(1) : '0.0';
              return (
                <div key={key} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <span className="w-16 text-xs text-slate-500">{label}</span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${hasData ? (count / maxStatusCount) * 100 : 0}%`, background: color }} />
                  </div>
                  <div className="w-24 text-right tabular-nums">
                    {hasData ? (
                      <>
                        <b className="text-sm text-slate-700">{f(count)}</b>
                        <span className="text-xs text-slate-400 ml-1">{pct}%</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">{unknownText}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {hasData ? (
            <div className={`mt-3 rounded-lg px-3 py-2 text-[11px] flex items-center gap-2 ${
              parseFloat(toRate) >= 5 ? 'bg-red-50 border border-red-100' : parseFloat(toRate) >= 3 ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'
            }`}>
              {parseFloat(toRate) >= 5 ? (
                <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : parseFloat(toRate) >= 3 ? (
                <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={parseFloat(toRate) >= 5 ? 'text-red-600' : parseFloat(toRate) >= 3 ? 'text-amber-600' : 'text-slate-500'}>
                타임오버율 <b>{toRate}%</b> (완료+타임오버 대비)
                {parseFloat(toRate) >= 5 ? ' — 즉시 점검 필요' : parseFloat(toRate) >= 3 ? ' — 주의 관찰' : ' — 정상 범위'}
              </span>
            </div>
          ) : (
            <div className="mt-3 rounded-lg px-3 py-2 text-[11px] flex items-center gap-2 bg-slate-50 border border-slate-100">
              <span className="text-slate-400">타임오버율: {unknownText}</span>
            </div>
          )}
        </div>

        {/* 상위 랭커 (프로덕션 제외) */}
        {process.env.NEXT_PUBLIC_NODE_ENV !== 'production' && <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-500 mb-3">🏆 상위 랭커</p>
          <div className="space-y-1">
            {(() => {
              const rankers = d.topRankers ?? [];
              const slots = Array.from({ length: 10 }, (_, i) => {
                const r = rankers.find(r => r.rank === i + 1);
                return { rank: i + 1, uname: r?.uname, completed: r?.completed };
              });
              return slots.map((r) => (
                <div key={r.rank} className="flex items-center gap-2 py-1.5">
                  <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                    r.rank === 1 ? 'bg-amber-100 text-amber-700' : r.rank === 2 ? 'bg-slate-200 text-slate-600' : r.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'
                  }`}>{r.rank}</span>
                  <span className="text-xs text-slate-700 truncate flex-1">{hasData ? (r.uname ?? '-') : unknownText}</span>
                  <span className="text-xs text-slate-500 tabular-nums font-semibold shrink-0">{hasData ? (r.completed !== undefined ? f(r.completed) : '-') : unknownText}</span>
                </div>
              ));
            })()}
          </div>
        </div>}
      </section>
    </div>
  );
}
