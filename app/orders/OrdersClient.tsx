'use client';

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Order,
  OrderType,
  OrderStatus,
  ORDER_TYPE_LABELS,
} from '../types/order';
import OrderDetailModal from './OrderDetailModal';

// 썸네일 컴포넌트 (표시 전용)
function Thumbnail({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
        <span className="text-gray-400 text-xs">없음</span>
      </div>
    );
  }

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={src}
      alt={alt}
      className="w-10 h-10 rounded object-cover"
      onError={() => setError(true)}
    />
  );
}

// Base64 디코딩 헬퍼
function decodeBase64(str: string): string {
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch {
    return str;
  }
}

// 날짜 포맷 헬퍼
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const PERIOD_OPTIONS: { key: PeriodFilter | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'yesterday', label: '어제' },
  { key: 'week', label: '이번주' },
  { key: 'month', label: '이번달' },
  { key: 'custom', label: '기간 설정' },
];

// 상태 탭 정의
const STATUS_TABS: { key: 'all' | OrderStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기중' },
  { key: 'progress', label: '진행중' },
  { key: 'completed', label: '완료' },
  { key: 'cancelled', label: '취소' },
];

// 타입 뱃지 정의
const TYPE_BADGES: { key: 'all' | OrderType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'save', label: '플레이스 저장' },
  { key: 'quiz1', label: '유입미션(퀴즈1)' },
  { key: 'quiz2', label: '유입미션(퀴즈2)' },
  { key: 'direction', label: '길찾기 미션' },
];

// 유효한 상태값인지 확인
function isValidStatus(status: string | null): status is 'all' | OrderStatus {
  return status !== null && ['all', 'pending', 'progress', 'completed', 'cancelled'].includes(status);
}

// 유효한 타입값인지 확인
function isValidType(type: string | null): type is 'all' | OrderType {
  return type !== null && ['all', 'save', 'quiz1', 'quiz2', 'direction'].includes(type);
}

interface OrdersClientProps {
  initialOrders: Order[];
  initialTotal: number;
  initialError: string | null;
  period?: PeriodFilter;
}

export default function OrdersClient({ initialOrders: orders, initialTotal: total, initialError: error, period }: OrdersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState(searchParams.get('startDate') || '');
  const [customEndDate, setCustomEndDate] = useState(searchParams.get('endDate') || '');

  // URL에서 초기값 가져오기
  const statusParam = searchParams.get('status');
  const typeParam = searchParams.get('type');
  const pageParam = searchParams.get('page');
  const currentSearchType = searchParams.get('searchType') || '';
  const currentSearchWords = searchParams.get('searchWords') || '';
  const isSearchMode = !!currentSearchType && !!currentSearchWords;
  const currentPeriod = period ?? 'all';

  const [searchType, setSearchType] = useState(currentSearchType || 'placeName');
  const [searchWords, setSearchWords] = useState(currentSearchWords);

  const statusFilter: 'all' | OrderStatus = isValidStatus(statusParam) ? statusParam : 'all';
  const typeFilter: 'all' | OrderType = isValidType(typeParam) ? typeParam : 'all';
  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
  const limit = 20;

  const buildParams = useCallback((newStatus: 'all' | OrderStatus, newType: 'all' | OrderType, newPage: number) => {
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

  // URL 업데이트 함수
  const updateURL = useCallback((newStatus: 'all' | OrderStatus, newType: 'all' | OrderType, newPage: number) => {
    router.push(`/orders?${buildParams(newStatus, newType, newPage).toString()}`);
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
    router.push(`/orders${params.toString() ? `?${params.toString()}` : ''}`);
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
    router.push(`/orders?${params.toString()}`);
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
    router.push(`/orders?${params.toString()}`);
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
    router.push(`/orders${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const totalPages = Math.ceil(total / limit);

  // 페이지 번호 배열 생성
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, page - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  // 상태 탭 변경
  const handleStatusChange = (newStatus: 'all' | OrderStatus) => {
    updateURL(newStatus, typeFilter, 1);
  };

  // 타입 필터 변경
  const handleTypeChange = (newType: 'all' | OrderType) => {
    updateURL(statusFilter, newType, 1);
  };

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    updateURL(statusFilter, typeFilter, newPage);
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">발주 목록</h1>
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
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleStatusChange(tab.key)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                statusFilter === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 타입 뱃지 필터 */}
      <div className="flex flex-wrap gap-2">
        {TYPE_BADGES.map((badge) => (
          <button
            key={badge.key}
            onClick={() => handleTypeChange(badge.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              typeFilter === badge.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {badge.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500 self-center">
          총 {total.toLocaleString()}건
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
          <option value="orderer">발주사</option>
          <option value="placeId">플레이스 ID</option>
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

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 테이블 */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500">발주 목록이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      플레이스
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      발주사
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      타입
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      기간
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      일일
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      진행률
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      발주일
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Thumbnail src={order.thumbnail} alt={decodeBase64(order.placeName)} />
                          <div>
                            <div className="font-medium text-gray-900 text-sm">
                              {decodeBase64(order.placeName)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {order.category ? decodeBase64(order.category) : '알수없음'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {decodeBase64(order.orderer)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                          order.type === 'save'
                            ? 'bg-green-100 text-green-800'
                            : order.type === 'quiz1' || order.type === 'quiz2'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {ORDER_TYPE_LABELS[order.type] || order.type}
                        </span>
                        {order.type === 'direction' && order.missionRatio && (
                          <span className="ml-1.5 text-xs text-slate-400">
                            차 {order.missionRatio.car}% / 버스 {order.missionRatio.bus}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        <div>{formatDate(order.startDate)}</div>
                        <div className="text-gray-500">~ {formatDate(order.endDate)}</div>
                        {order.deferredChanges?.endDate && (
                          <div className="text-xs text-amber-600 mt-1">
                            예정: ~ {formatDate(order.deferredChanges.endDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {order.totalDailyCount.toLocaleString()}건
                        {order.deferredChanges?.totalDailyCount !== undefined && (
                          <div className="text-xs text-amber-600 mt-0.5">
                            예정: {order.deferredChanges.totalDailyCount.toLocaleString()}건
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-500">
                          {order.completedCount.toLocaleString()} / {order.totalCount.toLocaleString()}
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min((order.completedCount / order.totalCount) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : order.status === 'progress'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'pending' ? '대기중' :
                           order.status === 'progress' ? '진행중' :
                           order.status === 'completed' ? '완료' : '취소'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 페이지네이션 */}
          {totalPages >= 1 && (
            <div className="flex justify-center items-center gap-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={page === 1}
                className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                «
              </button>
              <button
                onClick={() => handlePageChange(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹
              </button>

              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 text-sm rounded ${
                    page === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ›
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                »
              </button>
            </div>
          )}
        </>
      )}

      {/* 상세 모달 */}
      {selectedOrderId && (
        <OrderDetailModal
          key={selectedOrderId}
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onSuccess={() => router.refresh()}
        />
      )}
    </div>
  );
}
