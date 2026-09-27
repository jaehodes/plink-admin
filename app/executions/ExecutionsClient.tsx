'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Execution,
  ExecutionType,
  ExecutionStatus,
  EXECUTION_TYPE_LABELS,
  EXECUTION_STATUS_LABELS,
  EXECUTION_STATUS_COLORS,
} from '../types/execution';
import ExecutionDetailModal from './ExecutionDetailModal';

const STATUS_TABS: { key: 'all' | ExecutionStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'progress', label: '진행중' },
  { key: 'completed', label: '완료' },
  { key: 'skipped', label: '포기' },
  { key: 'failed', label: '실패' },
  { key: 'timeout', label: '타임오버' },
];

const TYPE_BADGES: { key: 'all' | ExecutionType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'save', label: '플레이스 저장' },
  { key: 'quiz1', label: '유입미션(퀴즈1)' },
  { key: 'quiz2', label: '유입미션(퀴즈2)' },
  { key: 'direction', label: '길찾기 미션' },
];

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const PERIOD_OPTIONS: { key: PeriodFilter | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'yesterday', label: '어제' },
  { key: 'week', label: '이번주' },
  { key: 'month', label: '이번달' },
  { key: 'custom', label: '기간 설정' },
];

const EXECUTION_TYPE_COLORS: Record<string, string> = {
  save: 'bg-blue-100 text-blue-700',
  quiz1: 'bg-violet-100 text-violet-700',
  quiz2: 'bg-purple-100 text-purple-700',
  direction: 'bg-teal-100 text-teal-700',
};

function isValidType(type: string | null): type is 'all' | ExecutionType {
  return type !== null && ['all', 'save', 'quiz1', 'quiz2', 'direction'].includes(type);
}

function decodeBase64(str: string): string {
  try { return Buffer.from(str, 'base64').toString('utf-8'); }
  catch { return str; }
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

interface ExecutionsClientProps {
  initialExecutions: Execution[];
  initialTotal: number;
  initialError: string | null;
  period?: PeriodFilter;
}

export default function ExecutionsClient({ initialExecutions: executions, initialTotal: total, initialError: error, period }: ExecutionsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState(searchParams.get('startDate') || '');
  const [customEndDate, setCustomEndDate] = useState(searchParams.get('endDate') || '');

  const statusParam = searchParams.get('status');
  const typeParam = searchParams.get('type');
  const pageParam = searchParams.get('page');
  const currentSearchType = searchParams.get('searchType') || '';
  const currentSearchWords = searchParams.get('searchWords') || '';
  const isSearchMode = !!currentSearchType && !!currentSearchWords;
  const currentPeriod = period ?? 'all';

  const [searchType, setSearchType] = useState(currentSearchType || 'placeName');
  const [searchWords, setSearchWords] = useState(currentSearchWords);

  const statusFilter: 'all' | ExecutionStatus =
    statusParam === 'progress' || statusParam === 'completed' || statusParam === 'skipped' || statusParam === 'failed' || statusParam === 'timeout'
      ? statusParam : 'all';
  const typeFilter: 'all' | ExecutionType = isValidType(typeParam) ? typeParam : 'all';
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const limit = 20;

  const buildParams = useCallback((newStatus: 'all' | ExecutionStatus, newType: 'all' | ExecutionType, newPage: number) => {
    const params = new URLSearchParams();
    if (newStatus !== 'all') params.set('status', newStatus);
    if (newType !== 'all') params.set('type', newType);
    if (currentSearchType && currentSearchWords) {
      params.set('searchType', currentSearchType);
      params.set('searchWords', currentSearchWords);
    }
    if (currentPeriod !== 'all') {
      params.set('period', currentPeriod);
      if (currentPeriod === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', customStartDate);
        params.set('endDate', customEndDate);
      }
    }
    if (newPage > 1) params.set('page', newPage.toString());
    return params;
  }, [currentSearchType, currentSearchWords, currentPeriod, customStartDate, customEndDate]);

  const updateURL = useCallback((newStatus: 'all' | ExecutionStatus, newType: 'all' | ExecutionType, newPage: number) => {
    router.push(`/executions?${buildParams(newStatus, newType, newPage).toString()}`);
  }, [router, buildParams]);

  const handlePeriodChange = (newPeriod: PeriodFilter | 'all') => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (currentSearchType && currentSearchWords) {
      params.set('searchType', currentSearchType);
      params.set('searchWords', currentSearchWords);
    }
    if (newPeriod !== 'all') params.set('period', newPeriod);
    router.push(`/executions${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleCustomSearch = () => {
    if (!customStartDate || !customEndDate) return;
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (currentSearchType && currentSearchWords) {
      params.set('searchType', currentSearchType);
      params.set('searchWords', currentSearchWords);
    }
    params.set('period', 'custom');
    params.set('startDate', customStartDate);
    params.set('endDate', customEndDate);
    router.push(`/executions?${params.toString()}`);
  };

  const handleSearch = () => {
    if (!searchWords.trim()) return;
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (currentPeriod !== 'all') {
      params.set('period', currentPeriod);
      if (currentPeriod === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', customStartDate);
        params.set('endDate', customEndDate);
      }
    }
    params.set('searchType', searchType);
    params.set('searchWords', searchWords.trim());
    router.push(`/executions?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchWords('');
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (currentPeriod !== 'all') {
      params.set('period', currentPeriod);
      if (currentPeriod === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', customStartDate);
        params.set('endDate', customEndDate);
      }
    }
    router.push(`/executions${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const totalPages = Math.ceil(total / limit);

  const getPageNumbers = () => {
    const pages: number[] = [];
    const max = 5;
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const start = Math.max(1, page - 2);
      const end = Math.min(totalPages, start + max - 1);
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">수행목록</h1>
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
        <p className="text-sm text-gray-500 mt-1">미션 수행 내역을 조회합니다</p>
      </div>

      {/* 기간 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => handlePeriodChange(option.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                currentPeriod === option.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 기간 설정 날짜 입력 */}
      {currentPeriod === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-sm text-slate-400">~</span>
          <input type="date" value={customEndDate} min={customStartDate || undefined} onChange={(e) => setCustomEndDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={handleCustomSearch} disabled={!customStartDate || !customEndDate}
            className="px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            조회
          </button>
        </div>
      )}

      {/* 상태 탭 */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex gap-1 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => updateURL(tab.key, typeFilter, 1)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
              statusFilter === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 타입 필터 + 건수 */}
      <div className="flex flex-wrap items-center gap-2">
        {TYPE_BADGES.map((badge) => (
          <button
            key={badge.key}
            onClick={() => updateURL(statusFilter, badge.key, 1)}
            className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
              typeFilter === badge.key
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {badge.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-400">
          총 <span className="font-semibold text-slate-600">{total.toLocaleString()}</span>건
        </span>
      </div>

      {/* 검색 */}
      <div className="flex items-center gap-2">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="placeName">플레이스명</option>
          <option value="uname">닉네임</option>
          <option value="mname">매체사</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            value={searchWords}
            onChange={(e) => setSearchWords(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            placeholder="검색어를 입력하세요"
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300 pr-8"
          />
          {searchWords && (
            <button
              onClick={() => setSearchWords('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={!searchWords.trim()}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          검색
        </button>
        {isSearchMode && (
          <button
            onClick={handleClearSearch}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* 목록 */}
      {executions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
          <div className="text-slate-300 mb-3">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-slate-500">수행목록이 없습니다</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {executions.map((execution) => (
              <div
                key={execution.id}
                onClick={() => setSelectedExecutionId(execution.id)}
                className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer"
              >
                {/* 뱃지 행 */}
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${EXECUTION_TYPE_COLORS[execution.type] || 'bg-slate-100 text-slate-600'}`}>
                    {EXECUTION_TYPE_LABELS[execution.type]}
                    {execution.subType && ` · ${execution.subType === 'car' ? '자동차' : '버스'}`}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${EXECUTION_STATUS_COLORS[execution.status] || 'bg-slate-100 text-slate-600'}`}>
                    {EXECUTION_STATUS_LABELS[execution.status] || execution.status}
                  </span>
                </div>

                {/* 플레이스 + 키워드 */}
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-bold text-slate-800 truncate">{decodeBase64(execution.placeName)}</p>
                  <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded shrink-0">{decodeBase64(execution.keyword)}</span>
                </div>

                {/* 메타 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{execution.uname}</span>
                    <span>·</span>
                    <span>{decodeBase64(execution.mname)}</span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-slate-400">{formatDateTime(execution.startedAt)}</p>
                    {execution.completedAt && (
                      <p className="text-xs text-green-500 mt-0.5">{formatDateTime(execution.completedAt)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 페이지네이션 */}
          {totalPages >= 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <button
                onClick={() => updateURL(statusFilter, typeFilter, 1)}
                disabled={page === 1}
                className="px-2.5 py-1.5 text-sm font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                «
              </button>
              <button
                onClick={() => updateURL(statusFilter, typeFilter, Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                이전
              </button>

              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => updateURL(statusFilter, typeFilter, pageNum)}
                  className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => updateURL(statusFilter, typeFilter, Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                다음
              </button>
              <button
                onClick={() => updateURL(statusFilter, typeFilter, totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1.5 text-sm font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                »
              </button>
            </div>
          )}
        </>
      )}

      {/* 상세 모달 */}
      {selectedExecutionId && (
        <ExecutionDetailModal
          key={selectedExecutionId}
          executionId={selectedExecutionId}
          onClose={() => setSelectedExecutionId(null)}
        />
      )}
    </div>
  );
}
