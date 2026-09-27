'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEscRef } from '../hooks/useEscClose';
import { QuizItem, ParkingItem, QUIZ_TAB_LABELS, CHOSUNG_RANGE_LABELS, MissionProblemType } from '../types/quiz';
import { toggleMissionProblemActive, batchToggleMissionProblemActive, fetchAllFilteredIds } from './actions';
import { useToast } from '../components/Toast';

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const PERIOD_OPTIONS: { key: PeriodFilter | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'today', label: '오늘' },
  { key: 'yesterday', label: '어제' },
  { key: 'week', label: '이번주' },
  { key: 'month', label: '이번달' },
  { key: 'custom', label: '기간 설정' },
];

const TAB_OPTIONS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  ...Object.entries(QUIZ_TAB_LABELS).map(([key, label]) => ({ key, label })),
];

const STATUS_OPTIONS = [
  { key: 'all', label: '전체' },
  { key: 'true', label: '활성' },
  { key: 'false', label: '비활성' },
];

const DEACTIVATE_REASONS_QUIZ = [
  '퀴즈 정답의 길이가 너무 깁니다.',
  '플레이스 방문없이 정답 맞출 수 있습니다.',
  '똑같은 문제가 이미 있습니다.',
  '플레이스에서 찾을 수 없습니다.',
  '질문이 이상합니다.',
  '정답이 틀렸습니다.',
  '기타 (직접 입력)',
];

const DEACTIVATE_REASONS_PARKING = [
  '플레이스에서 찾을 수 없습니다.',
  '정답의 길이가 너무 깁니다.',
  '똑같은 문제가 있습니다.',
  '플레이스 방문없이 정답을 맞출 수 있습니다.',
  '기타 (직접 입력)',
];

interface QuizzesClientProps {
  mode: 'quiz' | 'parking';
  initialQuizzes: QuizItem[];
  initialParkings: ParkingItem[];
  initialTotal: number;
  initialError: string | null;
  period?: PeriodFilter;
}

export default function QuizzesClient({
  mode,
  initialQuizzes: quizzes,
  initialParkings: parkings,
  initialTotal: total,
  initialError: error,
  period,
}: QuizzesClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [customStartDate, setCustomStartDate] = useState(searchParams.get('startDate') || '');
  const [customEndDate, setCustomEndDate] = useState(searchParams.get('endDate') || '');
  const currentPeriod = period ?? 'all';

  // 비활성화 사유 모달
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTargetId, setDeactivateTargetId] = useState<number | null>(null);
  const [deactivateTargetType, setDeactivateTargetType] = useState<MissionProblemType>('quiz');
  const [deactivateReasonSelect, setDeactivateReasonSelect] = useState('');
  const [deactivateReasonCustom, setDeactivateReasonCustom] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const deactivateModalRef = useEscRef(() => setShowDeactivateModal(false));

  // 일괄 처리
  const [showBatchDeactivateModal, setShowBatchDeactivateModal] = useState(false);
  const [batchReasonSelect, setBatchReasonSelect] = useState('');
  const [batchReasonCustom, setBatchReasonCustom] = useState('');
  const [showBatchConfirm, setShowBatchConfirm] = useState<'activate' | null>(null);
  const batchDeactivateModalRef = useEscRef(() => setShowBatchDeactivateModal(false));
  const batchConfirmModalRef = useEscRef(() => setShowBatchConfirm(null));

  // 검색
  const currentSearchType = searchParams.get('searchType') || '';
  const currentSearchWords = searchParams.get('searchWords') || '';
  const isSearchMode = !!currentSearchType && !!currentSearchWords;
  const [searchType, setSearchType] = useState(currentSearchType || (mode === 'quiz' ? 'question' : 'parkingAnswer'));
  const [searchWords, setSearchWords] = useState(currentSearchWords);

  const currentTab = searchParams.get('tab') || 'all';
  const currentStatus = searchParams.get('isActive') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(total / 20);

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const m = overrides.mode ?? mode;
    const tab = overrides.tab ?? currentTab;
    const isActive = overrides.isActive ?? currentStatus;
    const sType = overrides.searchType ?? (overrides.clearSearch ? undefined : currentSearchType);
    const sWords = overrides.searchWords ?? (overrides.clearSearch ? undefined : currentSearchWords);
    const page = overrides.page ?? '1';
    const p = overrides.clearPeriod ? 'all' : (overrides.period ?? currentPeriod);
    const sDate = overrides.startDate ?? customStartDate;
    const eDate = overrides.endDate ?? customEndDate;

    if (m === 'parking') params.set('mode', 'parking');
    if (m === 'quiz' && tab !== 'all') params.set('tab', tab);
    if (isActive !== 'all') params.set('isActive', isActive);
    if (sType && sWords) {
      params.set('searchType', sType);
      params.set('searchWords', sWords);
    }
    if (p !== 'all') {
      params.set('period', p);
      if (p === 'custom' && sDate && eDate) {
        params.set('startDate', sDate);
        params.set('endDate', eDate);
      }
    }
    if (page !== '1') params.set('page', page);
    return `/quizzes${params.toString() ? `?${params.toString()}` : ''}`;
  };

  const handlePeriodChange = (newPeriod: PeriodFilter | 'all') => {
    router.push(buildUrl({ period: newPeriod === 'all' ? undefined : newPeriod, clearPeriod: newPeriod === 'all' ? 'true' : undefined }));
  };

  const handleCustomSearch = () => {
    if (!customStartDate || !customEndDate) return;
    router.push(buildUrl({ period: 'custom', startDate: customStartDate, endDate: customEndDate }));
  };

  const handleModeChange = (newMode: string) => {
    setSearchWords('');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchType(newMode === 'quiz' ? 'question' : 'parkingAnswer');
    router.push(buildUrl({ mode: newMode, tab: 'all', isActive: 'all', clearSearch: 'true', clearPeriod: 'true', page: '1' } as Record<string, string>));
  };

  const handleTabChange = (tab: string) => router.push(buildUrl({ tab }));
  const handleStatusChange = (isActive: string) => router.push(buildUrl({ isActive }));
  const handlePageChange = (page: number) => router.push(buildUrl({ page: String(page) }));

  const handleSearch = () => {
    if (!searchWords.trim()) return;
    router.push(buildUrl({ searchType, searchWords: searchWords.trim() }));
  };

  const handleClearSearch = () => {
    setSearchWords('');
    router.push(buildUrl({ clearSearch: 'true' } as Record<string, string>));
  };

  const openDeactivateModal = (type: MissionProblemType, id: number) => {
    setDeactivateTargetType(type);
    setDeactivateTargetId(id);
    setDeactivateReasonSelect('');
    setDeactivateReasonCustom('');
    setShowDeactivateModal(true);
  };

  const handleDeactivate = async () => {
    if (!deactivateTargetId) return;
    const reason = deactivateReasonSelect === '기타 (직접 입력)'
      ? deactivateReasonCustom.trim()
      : deactivateReasonSelect;
    if (!reason) { showToast('사유를 선택해주세요.', 'error'); return; }

    setIsProcessing(true);
    const result = await toggleMissionProblemActive(deactivateTargetType, deactivateTargetId, false, reason);
    setIsProcessing(false);
    if (result.success) {
      showToast(result.message, 'warning');
      setShowDeactivateModal(false);
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleActivate = async (type: MissionProblemType, id: number) => {
    setIsProcessing(true);
    const result = await toggleMissionProblemActive(type, id, true);
    setIsProcessing(false);
    if (result.success) {
      showToast(result.message);
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  // 상태가 활성/비활성 선택 + (퀴즈모드면 탭이 전체가 아니거나, 검색모드일 때) 일괄 허용
  const hasFilter = (currentStatus === 'true' || currentStatus === 'false')
    && (mode === 'parking' || currentTab !== 'all' || isSearchMode);

  // 현재 페이지 기준 일괄 처리 대상 ID
  const pageActiveIds = hasFilter
    ? (mode === 'quiz' ? quizzes.filter(q => q.isActive).map(q => q.id) : parkings.filter(p => p.isActive).map(p => p.id))
    : [];
  const pageInactiveIds = hasFilter
    ? (mode === 'quiz' ? quizzes.filter(q => !q.isActive).map(q => q.id) : parkings.filter(p => !p.isActive).map(p => p.id))
    : [];

  // 검색모드: 서버에서 전체 ID 가져오기 / 필터모드: 현재 페이지 ID 사용
  const getFilterParams = () => ({
    tab: currentTab,
    isActive: currentStatus,
    searchType: currentSearchType || undefined,
    searchWords: currentSearchWords || undefined,
    period: currentPeriod !== 'all' ? currentPeriod : undefined,
    startDate: customStartDate || undefined,
    endDate: customEndDate || undefined,
  });

  const handleBatchDeactivate = async () => {
    const reason = batchReasonSelect === '기타 (직접 입력)' ? batchReasonCustom.trim() : batchReasonSelect;
    if (!reason) { showToast('사유를 선택해주세요.', 'error'); return; }
    setIsProcessing(true);

    let targetIds: number[];
    if (isSearchMode) {
      const { activeIds } = await fetchAllFilteredIds(mode, getFilterParams());
      targetIds = activeIds;
    } else {
      targetIds = pageActiveIds;
    }

    if (targetIds.length === 0) {
      showToast('비활성화할 항목이 없습니다.', 'error');
      setIsProcessing(false);
      return;
    }
    const result = await batchToggleMissionProblemActive(mode === 'quiz' ? 'quiz' : 'parking', targetIds, false, reason);
    setIsProcessing(false);
    if (result.success) {
      showToast(result.message, 'warning');
      setShowBatchDeactivateModal(false);
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleBatchActivate = async () => {
    setIsProcessing(true);

    let targetIds: number[];
    if (isSearchMode) {
      const { inactiveIds } = await fetchAllFilteredIds(mode, getFilterParams());
      targetIds = inactiveIds;
    } else {
      targetIds = pageInactiveIds;
    }

    if (targetIds.length === 0) {
      showToast('활성화할 항목이 없습니다.', 'error');
      setIsProcessing(false);
      return;
    }
    const result = await batchToggleMissionProblemActive(mode === 'quiz' ? 'quiz' : 'parking', targetIds, true);
    setIsProcessing(false);
    if (result.success) {
      showToast(result.message);
      setShowBatchConfirm(null);
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const deactivateReasons = deactivateTargetType === 'quiz' ? DEACTIVATE_REASONS_QUIZ : DEACTIVATE_REASONS_PARKING;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">퀴즈/주차장 관리</h1>
        <p className="text-sm text-gray-500 mt-1">퀴즈와 주차장 문제의 활성/비활성 상태를 관리합니다</p>
      </div>

      {/* 퀴즈/주차장 모드 전환 */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1.5">
        <button
          onClick={() => handleModeChange('quiz')}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            mode === 'quiz' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          퀴즈
        </button>
        <button
          onClick={() => handleModeChange('parking')}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            mode === 'parking' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          주차장 문제
        </button>
      </div>

      {/* 탭 필터 (퀴즈 모드에서만) */}
      {mode === 'quiz' && (
        <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex gap-1 overflow-x-auto">
          {TAB_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => handleTabChange(option.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                currentTab === option.key
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

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

      {/* 상태 필터 + 건수 */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => handleStatusChange(option.key)}
            className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
              currentStatus === option.key
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-slate-400">
            총 <span className="font-semibold text-slate-600">{total.toLocaleString()}</span>개
          </span>
          {pageActiveIds.length > 0 && (
            <button
              onClick={() => {
                setBatchReasonSelect('');
                setBatchReasonCustom('');
                setShowBatchDeactivateModal(true);
              }}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSearchMode ? `전체 일괄 비활성화 (${total.toLocaleString()})` : `일괄 비활성화 (${pageActiveIds.length})`}
            </button>
          )}
          {pageInactiveIds.length > 0 && (
            <button
              onClick={() => setShowBatchConfirm('activate')}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSearchMode ? `전체 일괄 활성화 (${total.toLocaleString()})` : `일괄 활성화 (${pageInactiveIds.length})`}
            </button>
          )}
        </div>
      </div>

      {/* 검색 */}
      <div className="flex items-center gap-2">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {mode === 'quiz' ? (
            <>
              <option value="question">질문</option>
              <option value="answer">정답</option>
              <option value="placeName">플레이스명</option>
            </>
          ) : (
            <>
              <option value="parkingAnswer">주차 정답</option>
              <option value="placeName">플레이스명</option>
            </>
          )}
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

      {/* 퀴즈 목록 */}
      {!error && mode === 'quiz' && (
        <div className="space-y-3">
          {quizzes.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
              <div className="text-slate-300 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">퀴즈가 없습니다</p>
            </div>
          ) : (
            quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className={`bg-white rounded-xl border border-slate-200 overflow-hidden transition-all ${!quiz.isActive ? 'opacity-60' : ''}`}
              >
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-100 text-violet-700">
                        {QUIZ_TAB_LABELS[quiz.tab] || quiz.tab}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        quiz.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {quiz.isActive ? '활성' : '비활성'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">#{quiz.id}</span>
                    </div>
                    <button
                      onClick={() => quiz.isActive ? openDeactivateModal('quiz', quiz.id) : handleActivate('quiz', quiz.id)}
                      disabled={isProcessing}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-50 ${
                        quiz.isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${quiz.isActive ? 'bg-red-400' : 'bg-green-500'}`} />
                      {quiz.isActive ? '비활성화' : '활성화'}
                    </button>
                  </div>
                  <div className="mb-2">
                    <p className="text-sm text-slate-800 mb-1">
                      <span className="text-violet-600 font-semibold">Q.</span> {quiz.question}
                    </p>
                    <p className="text-sm">
                      <span className="text-emerald-600 font-semibold">A.</span>{' '}
                      <span className="text-emerald-700 font-medium">{quiz.answer}</span>
                    </p>
                  </div>
                  {quiz.placeName && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{quiz.placeName}</span>
                      {quiz.placeUrl && (
                        <a href={quiz.placeUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:text-blue-600">PC</a>
                      )}
                      {quiz.mobileUrl && (
                        <a href={quiz.mobileUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:text-blue-600">모바일</a>
                      )}
                    </div>
                  )}
                  {!quiz.isActive && quiz.reason && (
                    <div className="mt-2 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                      <p className="text-xs text-red-400 mb-0.5">비활성화 사유</p>
                      <p className="text-xs text-red-600">{quiz.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 주차장 목록 */}
      {!error && mode === 'parking' && (
        <div className="space-y-3">
          {parkings.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
              <div className="text-slate-300 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">주차장 문제가 없습니다</p>
            </div>
          ) : (
            parkings.map((parking) => (
              <div
                key={parking.id}
                className={`bg-white rounded-xl border border-slate-200 overflow-hidden transition-all ${!parking.isActive ? 'opacity-60' : ''}`}
              >
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 text-amber-700">
                        주차장
                      </span>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        parking.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {parking.isActive ? '활성' : '비활성'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">#{parking.id}</span>
                    </div>
                    <button
                      onClick={() => parking.isActive ? openDeactivateModal('parking', parking.id) : handleActivate('parking', parking.id)}
                      disabled={isProcessing}
                      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-colors disabled:opacity-50 ${
                        parking.isActive ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${parking.isActive ? 'bg-red-400' : 'bg-green-500'}`} />
                      {parking.isActive ? '비활성화' : '활성화'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-slate-400 mb-0.5">주차 정답</p>
                      <p className="font-semibold text-slate-700">{parking.parkingAnswer}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-slate-400 mb-0.5">힌트 종류</p>
                      <p className="font-semibold text-slate-700">{CHOSUNG_RANGE_LABELS[parking.chosungRange] || parking.chosungRange}</p>
                    </div>
                  </div>
                  {parking.placeName && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                      <span>{parking.placeName}</span>
                      {parking.placeUrl && (
                        <a href={parking.placeUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:text-blue-600">PC</a>
                      )}
                      {parking.mobileUrl && (
                        <a href={parking.mobileUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:text-blue-600">모바일</a>
                      )}
                    </div>
                  )}
                  {!parking.isActive && parking.reason && (
                    <div className="mt-2 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                      <p className="text-xs text-red-400 mb-0.5">비활성화 사유</p>
                      <p className="text-xs text-red-600">{parking.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 페이지네이션 */}
      {!error && totalPages >= 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            이전
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) pageNum = i + 1;
            else if (currentPage <= 3) pageNum = i + 1;
            else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
            else pageNum = currentPage - 2 + i;
            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            다음
          </button>
        </div>
      )}

      {/* 비활성화 사유 모달 */}
      {showDeactivateModal && deactivateTargetId && (
        <div ref={deactivateModalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {deactivateTargetType === 'quiz' ? '퀴즈' : '주차장 문제'} 비활성화
            </h3>
            <p className="text-sm text-slate-500 mb-4">비활성화 사유를 선택해주세요.</p>

            <div className="space-y-3 mb-5">
              <select
                value={deactivateReasonSelect}
                onChange={(e) => {
                  setDeactivateReasonSelect(e.target.value);
                  if (e.target.value !== '기타 (직접 입력)') setDeactivateReasonCustom('');
                }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">사유를 선택하세요</option>
                {deactivateReasons.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>

              {deactivateReasonSelect === '기타 (직접 입력)' && (
                <div>
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs ${deactivateReasonCustom.length >= 90 ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      {deactivateReasonCustom.length}/100
                    </span>
                  </div>
                  <textarea
                    value={deactivateReasonCustom}
                    onChange={(e) => { if (e.target.value.length <= 100) setDeactivateReasonCustom(e.target.value); }}
                    placeholder="사유를 직접 입력하세요"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
                    rows={3}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeactivate}
                disabled={isProcessing || !deactivateReasonSelect || (deactivateReasonSelect === '기타 (직접 입력)' && !deactivateReasonCustom.trim())}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? '처리중...' : '비활성화'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 비활성화 사유 모달 */}
      {showBatchDeactivateModal && (
        <div ref={batchDeactivateModalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {mode === 'quiz' ? '퀴즈' : '주차장 문제'} 일괄 비활성화
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {isSearchMode ? '검색 조건에 맞는 전체 활성 항목을 일괄 비활성화합니다.' : `현재 페이지의 활성 항목 ${pageActiveIds.length}개를 일괄 비활성화합니다.`}
            </p>

            <div className="space-y-3 mb-5">
              <select
                value={batchReasonSelect}
                onChange={(e) => {
                  setBatchReasonSelect(e.target.value);
                  if (e.target.value !== '기타 (직접 입력)') setBatchReasonCustom('');
                }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">사유를 선택하세요</option>
                {(mode === 'quiz' ? DEACTIVATE_REASONS_QUIZ : DEACTIVATE_REASONS_PARKING).map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>

              {batchReasonSelect === '기타 (직접 입력)' && (
                <div>
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs ${batchReasonCustom.length >= 90 ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      {batchReasonCustom.length}/100
                    </span>
                  </div>
                  <textarea
                    value={batchReasonCustom}
                    onChange={(e) => { if (e.target.value.length <= 100) setBatchReasonCustom(e.target.value); }}
                    placeholder="사유를 직접 입력하세요"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
                    rows={3}
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowBatchDeactivateModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleBatchDeactivate}
                disabled={isProcessing || !batchReasonSelect || (batchReasonSelect === '기타 (직접 입력)' && !batchReasonCustom.trim())}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? '처리중...' : '전체 비활성화'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 활성화 확인 모달 */}
      {showBatchConfirm === 'activate' && (
        <div ref={batchConfirmModalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-800 mb-2">
              {mode === 'quiz' ? '퀴즈' : '주차장 문제'} 일괄 활성화
            </h3>
            <p className="text-sm text-slate-500 mb-5">
              {isSearchMode ? '검색 조건에 맞는 전체 비활성 항목을 일괄 활성화하시겠습니까?' : `현재 페이지의 비활성 항목 ${pageInactiveIds.length}개를 일괄 활성화하시겠습니까?`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBatchConfirm(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleBatchActivate}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isProcessing ? '처리중...' : '전체 활성화'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
