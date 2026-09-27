'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { useEscRef } from '../hooks/useEscClose';
import {
  MissionReportSummary,
  MissionReportDetail,
  ReportStatus,
  MISSION_TYPE_LABELS,
  MISSION_SUB_TYPE_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_COLORS,
} from '../types/mission-report';
import { getReportDetail, resolveReport, toggleMissionActive } from './actions';
import { useToast } from '../components/Toast';

// 답변 옵션 (동적으로 생성)
interface AdminNoteOption {
  label: string;
  value: string;
}

function getAdminNoteOptions(report: MissionReportDetail | null): AdminNoteOption[] {
  const options: AdminNoteOption[] = [];

  // 퀴즈/주차장 문의일 때만 정답 안내 추가
  if (report && (report.missionType === 'quiz1' || report.missionType === 'quiz2' || (report.missionType === 'direction' && report.missionSubType === 'car'))) {
    const answer = report.quiz?.answer || report.carParking?.parkingAnswer || '';
    if (answer) {
      options.push({ label: `정상 작동 (정답: ${answer})`, value: `안녕하세요.\n\n확인 결과 정상적으로 작동하고 있습니다.\n정답은 '${answer}'(으)로 입력해야 합니다.\n\n감사합니다.` });
    } else {
      options.push({ label: '정상 작동', value: '안녕하세요.\n\n확인 결과 정상적으로 작동하고 있습니다.\n\n감사합니다.' });
    }
  } else {
    options.push({ label: '정상 작동', value: '안녕하세요.\n\n확인 결과 정상적으로 작동하고 있습니다.\n\n감사합니다.' });
  }

  options.push(
    { label: '오류 발견 → 리워드 지급', value: '안녕하세요.\n\n해당 문제의 오류가 발견되어 처리했습니다.\n그에 따른 소정의 리워드를 지급해 드리겠습니다.\n\n감사합니다.' },
    { label: '오류 발견', value: '안녕하세요.\n\n해당 문제의 오류가 발견되어 처리했습니다.\n\n감사합니다.' },
    { label: '서비스 장애 보상 → 리워드 지급', value: '안녕하세요.\n\n서비스 장애가 발생하여 이용에 불편을 드린 점 진심으로 사과드립니다.\n\n불편을 겪으신 것에 대한 작은 보상으로 소정의 리워드를 지급해 드릴 예정입니다.\n\n감사합니다.' },
    { label: '문제 미선택 안내', value: '안녕하세요.\n\n현재 문의 내용만으로는 어떤 문제에서 오류가 발생했는지 확인하기 어렵습니다.\n문제를 신고하실 때는 반드시 문제가 발생한 문제를 선택한 후 신고해 주시기 바랍니다.\n\n감사합니다.' },
    { label: '직접 입력', value: '직접 입력' },
  );

  return options;
}

const DEACTIVATE_REASONS = [
  '퀴즈 정답의 길이가 너무 깁니다.',
  '플레이스 방문없이 정답 맞출 수 있습니다.',
  '똑같은 문제가 이미 있습니다.',
  '플레이스에서 찾을 수 없습니다.',
  '질문이 이상합니다.',
  '정답이 틀렸습니다.',
  '기타 (직접 입력)',
];

const STATUS_OPTIONS: { key: ReportStatus | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '접수됨' },
  { key: 'resolved', label: '처리완료' },
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

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

// 제출값이 URL인지 판단
function isSubmittedValueUrl(report: MissionReportDetail): boolean {
  if (!report.submittedValue?.startsWith('https://')) return false;
  if (report.missionType === 'save') return true;
  if (report.missionType === 'direction' && report.missionSubType === 'bus') return true;
  return false;
}

function formatReward(amount: number, rewardName?: string): string {
  return `+${amount.toLocaleString()} ${rewardName ?? '-'}`;
}

const MISSION_TYPE_COLORS: Record<string, string> = {
  save: 'bg-blue-100 text-blue-700',
  quiz1: 'bg-violet-100 text-violet-700',
  quiz2: 'bg-purple-100 text-purple-700',
  direction: 'bg-teal-100 text-teal-700',
};

interface ReportsClientProps {
  initialReports: MissionReportSummary[];
  initialTotal: number;
  initialError: string | null;
  period?: PeriodFilter;
}

export default function ReportsClient({
  initialReports,
  initialTotal,
  initialError,
  period,
}: ReportsClientProps) {
  const router = useRouter();
  const { refreshToken } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [customStartDate, setCustomStartDate] = useState(searchParams.get('startDate') || '');
  const [customEndDate, setCustomEndDate] = useState(searchParams.get('endDate') || '');
  const currentPeriod = period ?? 'all';
  const [selectedReport, setSelectedReport] = useState<MissionReportDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const reportModalRef = useEscRef(() => setSelectedReport(null));
  const confirmModalRef = useEscRef(() => setShowConfirmModal(false));

  const [adminNoteSelect, setAdminNoteSelect] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [rewardRate, setRewardRate] = useState<0 | 20 | 50 | 100>(20);
  const [quizEnabled, setQuizEnabled] = useState(true);
  const [parkingEnabled, setParkingEnabled] = useState(true);

  // 비활성화 사유 모달
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{ type: 'quiz' | 'parking'; id: number } | null>(null);
  const [deactivateReasonSelect, setDeactivateReasonSelect] = useState('');
  const [deactivateReasonCustom, setDeactivateReasonCustom] = useState('');
  const deactivateModalRef = useEscRef(() => setShowDeactivateModal(false));

  const currentStatus = searchParams.get('status') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = initialTotal;
  const currentSearchType = searchParams.get('searchType') || '';
  const currentSearchWords = searchParams.get('searchWords') || '';
  const isSearchMode = !!currentSearchType && !!currentSearchWords;

  const [searchType, setSearchType] = useState(currentSearchType || 'uname');
  const [searchWords, setSearchWords] = useState(currentSearchWords);

  const buildBaseParams = (overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams();
    if (currentStatus !== 'all') params.set('status', currentStatus);
    if (currentSearchType && currentSearchWords) {
      params.set('searchType', currentSearchType);
      params.set('searchWords', currentSearchWords);
    }
    if (currentPeriod !== 'all') {
      params.set('period', currentPeriod);
      if (currentPeriod === 'custom') {
        const s = overrides.startDate ?? customStartDate;
        const e = overrides.endDate ?? customEndDate;
        if (s) params.set('startDate', s);
        if (e) params.set('endDate', e);
      }
    }
    Object.entries(overrides).forEach(([k, v]) => { if (!['startDate', 'endDate'].includes(k)) params.set(k, v); });
    return params;
  };

  const handleStatusChange = (status: ReportStatus | 'all') => {
    const params = buildBaseParams();
    if (status !== 'all') params.set('status', status); else params.delete('status');
    params.delete('page');
    router.push(`/reports${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handlePeriodChange = (newPeriod: PeriodFilter | 'all') => {
    const params = new URLSearchParams();
    if (currentStatus !== 'all') params.set('status', currentStatus);
    if (currentSearchType && currentSearchWords) {
      params.set('searchType', currentSearchType);
      params.set('searchWords', currentSearchWords);
    }
    if (newPeriod !== 'all') params.set('period', newPeriod);
    router.push(`/reports${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleCustomSearch = () => {
    if (!customStartDate || !customEndDate) return;
    const params = new URLSearchParams();
    if (currentStatus !== 'all') params.set('status', currentStatus);
    if (currentSearchType && currentSearchWords) {
      params.set('searchType', currentSearchType);
      params.set('searchWords', currentSearchWords);
    }
    params.set('period', 'custom');
    params.set('startDate', customStartDate);
    params.set('endDate', customEndDate);
    router.push(`/reports?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = buildBaseParams();
    params.set('page', String(page));
    router.push(`/reports?${params.toString()}`);
  };

  const handleSearch = () => {
    if (!searchWords.trim()) return;
    const params = new URLSearchParams();
    if (currentStatus !== 'all') params.set('status', currentStatus);
    if (currentPeriod !== 'all') {
      params.set('period', currentPeriod);
      if (currentPeriod === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', customStartDate);
        params.set('endDate', customEndDate);
      }
    }
    params.set('searchType', searchType);
    params.set('searchWords', searchWords.trim());
    router.push(`/reports?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchWords('');
    const params = new URLSearchParams();
    if (currentStatus !== 'all') params.set('status', currentStatus);
    if (currentPeriod !== 'all') {
      params.set('period', currentPeriod);
      if (currentPeriod === 'custom' && customStartDate && customEndDate) {
        params.set('startDate', customStartDate);
        params.set('endDate', customEndDate);
      }
    }
    router.push(`/reports${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handleOpenReport = async (reportId: number) => {
    setIsDetailLoading(true);
    setSelectedReport(null);
    const result = await getReportDetail(reportId);
    setIsDetailLoading(false);
    if (result.success && result.detail) {
      setSelectedReport(result.detail);
      setQuizEnabled(result.detail.quiz?.isActive ?? true);
      setParkingEnabled(result.detail.carParking?.isActive ?? true);
      const options = getAdminNoteOptions(result.detail);
      setAdminNoteSelect(options[0].value);
      setRewardRate(options[0].value === '직접 입력' ? 0 : 20);
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleResolve = async () => {
    if (!selectedReport) return;
    const finalNote = adminNoteSelect === '직접 입력' ? adminNote : adminNoteSelect;
    if (!finalNote.trim()) return;
    const options = getAdminNoteOptions(selectedReport);
    const isRewardOption = adminNoteSelect === options[1].value || adminNoteSelect === options[3].value;
    const isDirect = adminNoteSelect === '직접 입력';
    const finalRewardRate = (isRewardOption || isDirect) ? rewardRate : 0;
    setIsProcessing(true);
    const result = await resolveReport(
      selectedReport.id, finalNote, finalRewardRate,
    );
    setIsProcessing(false);
    if (result.success) {
      showToast(result.message);
      setSelectedReport(null);
      setAdminNote('');      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">문의 목록</h1>
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
        <p className="text-sm text-gray-500 mt-1">미션 신고 내역을 관리합니다</p>
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

      {/* 상태 필터 */}
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
      </div>

      {/* 검색 */}
      <div className="flex items-center gap-2">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="uname">닉네임</option>
          <option value="mname">매체사</option>
          <option value="orderer">발주사</option>
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
      {initialError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {initialError}
        </div>
      )}

      {/* 목록 */}
      {!initialError && (
        <div className="space-y-3">
          {initialReports.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
              <div className="text-slate-300 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">문의 내역이 없습니다</p>
            </div>
          ) : (
            initialReports.map((report) => (
              <div
                key={report.id}
                onClick={() => handleOpenReport(report.id)}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer"
              >
                {/* 뱃지 행 */}
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${MISSION_TYPE_COLORS[report.missionType] || 'bg-slate-100 text-slate-600'}`}>
                    {MISSION_TYPE_LABELS[report.missionType]}
                    {report.missionSubType && ` · ${MISSION_SUB_TYPE_LABELS[report.missionSubType]}`}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${REPORT_STATUS_COLORS[report.status]}`}>
                    {REPORT_STATUS_LABELS[report.status]}
                  </span>
                  {report.rewardAmount !== undefined && report.rewardAmount > 0 && (
                    <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                      {formatReward(report.rewardAmount, report.rewardName)}
                    </span>
                  )}
                  {report.status === 'resolved' && report.isReadByUser !== undefined && (
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${report.isReadByUser ? 'bg-slate-100 text-slate-400' : 'bg-orange-100 text-orange-600'}`}>
                      {report.isReadByUser ? '유저 읽음' : '유저 안읽음'}
                    </span>
                  )}
                </div>

                {/* 플레이스명 + 사유 */}
                {report.placeName && (
                  <p className="text-xs text-slate-500 mb-1">{report.placeName}</p>
                )}
                <p className="text-sm font-medium text-slate-800 mb-2 line-clamp-2">{report.reason}</p>

                {/* 메타 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {report.uname && <span><span className="text-slate-400">닉네임:</span> {report.uname}</span>}
                    {report.uname && report.orderer && <span>·</span>}
                    {report.orderer && <span><span className="text-slate-400">발주사:</span> {report.orderer}</span>}
                    {(report.uname || report.orderer) && report.mname && <span>·</span>}
                    {report.mname && <span><span className="text-slate-400">매체사:</span> {report.mname}</span>}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-slate-400">{formatDateTime(report.createdAt)}</p>
                    {report.status === 'resolved' && report.resolvedAt && (
                      <p className="text-xs text-green-500 mt-0.5">처리 {formatDateTime(report.resolvedAt)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* 페이지네이션 */}
          {totalPages >= 1 && (
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
        </div>
      )}

      {/* 로딩 */}
      {isDetailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl px-8 py-6 text-center">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {selectedReport && !isDetailLoading && (
        <div ref={reportModalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">

            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${REPORT_STATUS_COLORS[selectedReport.status]}`}>
                  {REPORT_STATUS_LABELS[selectedReport.status]}
                </span>
                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${MISSION_TYPE_COLORS[selectedReport.missionType] || 'bg-slate-100 text-slate-600'}`}>
                  {MISSION_TYPE_LABELS[selectedReport.missionType]}
                  {selectedReport.missionSubType && ` · ${MISSION_SUB_TYPE_LABELS[selectedReport.missionSubType]}`}
                </span>
                <span className="text-xs text-slate-400 font-mono">#{selectedReport.id}</span>
              </div>
              <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto">
              {/* 미션 정보 */}
              {selectedReport.placeName && (
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{selectedReport.placeName}</p>
                      {selectedReport.orderer && (
                        <span className="text-xs text-slate-400 shrink-0">{selectedReport.orderer}</span>
                      )}
                    </div>
                    {selectedReport.placeUrl && (() => {
                      const mobileUrl = selectedReport.placeUrl
                        .replace('https://map.naver.com/p/entry/place/', 'https://m.place.naver.com/place/')
                        .replace('https://map.naver.com/v5/entry/place/', 'https://m.place.naver.com/place/');
                      return (
                        <a href={mobileUrl} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium ml-2">
                          플레이스 보기
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      );
                    })()}
                  </div>

                  {/* 퀴즈 */}
                  {(selectedReport.missionType === 'quiz1' || selectedReport.missionType === 'quiz2') && selectedReport.quiz && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500">퀴즈 #{selectedReport.quiz.id}</p>
                        <button
                          onClick={async () => {
                            if (quizEnabled) {
                              setDeactivateTarget({ type: 'quiz', id: selectedReport.quiz!.id });
                              setDeactivateReasonSelect('');
                              setDeactivateReasonCustom('');
                              setShowDeactivateModal(true);
                            } else {
                              const result = await toggleMissionActive('quiz', selectedReport.quiz!.id, true);
                              if (result.success) { setQuizEnabled(true); showToast(result.message); }
                              else showToast(result.message, 'error');
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                            quizEnabled ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${quizEnabled ? 'bg-red-400' : 'bg-green-500'}`} />
                          {quizEnabled ? '비활성화' : '활성화'}
                        </button>
                      </div>
                      <div className={`grid grid-cols-2 gap-2 transition-opacity ${!quizEnabled ? 'opacity-30' : ''}`}>
                        <div className="bg-white rounded-xl px-3.5 py-3 border border-slate-200">
                          <p className="text-xs text-slate-400 mb-1">질문</p>
                          <p className="text-sm text-slate-700">{selectedReport.quiz.question}</p>
                        </div>
                        <div className="bg-white rounded-xl px-3.5 py-3 border border-slate-200">
                          <p className="text-xs text-slate-400 mb-1">정답</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedReport.quiz.answer}</p>
                        </div>
                      </div>
                      {!quizEnabled && selectedReport.quiz.reason && (
                        <div className="bg-red-50 rounded-xl px-3.5 py-2.5 border border-red-100 mt-2">
                          <p className="text-xs text-red-400 mb-0.5">비활성화 사유</p>
                          <p className="text-sm text-red-600">{selectedReport.quiz.reason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 주차장 */}
                  {selectedReport.missionType === 'direction' && selectedReport.missionSubType === 'car' && selectedReport.carParking && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-500">주차장 문제 #{selectedReport.carParking.id}</p>
                        <button
                          onClick={async () => {
                            if (parkingEnabled) {
                              setDeactivateTarget({ type: 'parking', id: selectedReport.carParking!.id });
                              setDeactivateReasonSelect('');
                              setDeactivateReasonCustom('');
                              setShowDeactivateModal(true);
                            } else {
                              const result = await toggleMissionActive('parking', selectedReport.carParking!.id, true);
                              if (result.success) { setParkingEnabled(true); showToast(result.message); }
                              else showToast(result.message, 'error');
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                            parkingEnabled ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${parkingEnabled ? 'bg-red-400' : 'bg-green-500'}`} />
                          {parkingEnabled ? '비활성화' : '활성화'}
                        </button>
                      </div>
                      <div className={`grid grid-cols-3 gap-2 transition-opacity ${!parkingEnabled ? 'opacity-30' : ''}`}>
                        <div className="bg-white rounded-xl px-3.5 py-3 border border-slate-200">
                          <p className="text-xs text-slate-400 mb-1">검색 위치</p>
                          <p className="text-sm font-semibold text-slate-800">목적지</p>
                        </div>
                        <div className="bg-white rounded-xl px-3.5 py-3 border border-slate-200">
                          <p className="text-xs text-slate-400 mb-1">힌트 종류</p>
                          <p className="text-sm font-semibold text-slate-800">
                            {{'consonant':'자음','vowel':'모음'}[selectedReport.carParking.chosungRange] || selectedReport.carParking.chosungRange}
                          </p>
                        </div>
                        <div className="bg-white rounded-xl px-3.5 py-3 border border-slate-200">
                          <p className="text-xs text-slate-400 mb-1">주차 정답</p>
                          <p className="text-sm font-semibold text-slate-800">{selectedReport.carParking.parkingAnswer}</p>
                        </div>
                      </div>
                      {!parkingEnabled && selectedReport.carParking.reason && (
                        <div className="bg-red-50 rounded-xl px-3.5 py-2.5 border border-red-100 mt-2">
                          <p className="text-xs text-red-400 mb-0.5">비활성화 사유</p>
                          <p className="text-sm text-red-600">{selectedReport.carParking.reason}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="px-6 py-5 space-y-5">
                {/* 신고 정보 */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">신고 사유</p>
                    <p className="text-sm text-slate-800 leading-relaxed">{selectedReport.reason}</p>
                  </div>
                  {selectedReport.submittedValue && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">제출한 값</p>
                      {isSubmittedValueUrl(selectedReport) ? (
                        <a href={selectedReport.submittedValue} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-mono bg-blue-50 px-3.5 py-2.5 rounded-xl break-all">
                          {selectedReport.submittedValue}
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        <p className="text-sm text-slate-800 font-mono bg-slate-50 px-3.5 py-2.5 rounded-xl break-all">{selectedReport.submittedValue}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100" />

                {/* 메타 정보 */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedReport.uname && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 mb-0.5">신고자</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedReport.uname}</p>
                    </div>
                  )}
                  {selectedReport.mname && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 mb-0.5">매체사</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedReport.mname}{selectedReport.midx !== undefined && ` (${selectedReport.midx})`}</p>
                    </div>
                  )}
                  {selectedReport.rewardName && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 mb-0.5">리워드 단위</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedReport.rewardName}</p>
                    </div>
                  )}
                  {selectedReport.rewardPerUnit !== undefined && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 mb-0.5">리워드 단가</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedReport.rewardPerUnit.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">접수일</p>
                    <p className="text-sm font-semibold text-slate-700">{formatDateTime(selectedReport.createdAt)}</p>
                  </div>
                  {selectedReport.resolvedAt && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 mb-0.5">처리일</p>
                      <p className="text-sm font-semibold text-slate-700">{formatDateTime(selectedReport.resolvedAt)}</p>
                    </div>
                  )}
                  {selectedReport.resolvedBy && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 mb-0.5">처리자</p>
                      <p className="text-sm font-semibold text-slate-700">{selectedReport.resolvedBy}</p>
                    </div>
                  )}
                  {selectedReport.status === 'resolved' && selectedReport.isReadByUser !== undefined && (
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-400 mb-0.5">유저 확인</p>
                      <p className={`text-sm font-semibold ${selectedReport.isReadByUser ? 'text-slate-500' : 'text-orange-500'}`}>
                        {selectedReport.isReadByUser ? '읽음' : '안읽음'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 처리완료: 리워드 + 답변 */}
                {selectedReport.status === 'resolved' && (
                  <div className="space-y-3">
                    <div className="border-t border-slate-100" />
                    {selectedReport.rewardAmount && selectedReport.rewardAmount > 0 ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3.5">
                        <p className="text-xs font-semibold text-green-600">지급된 리워드</p>
                        <p className="text-base font-bold text-green-700">{formatReward(selectedReport.rewardAmount, selectedReport.rewardName)}</p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5">
                        <p className="text-xs font-semibold text-slate-400">지급된 리워드</p>
                        <p className="text-sm text-slate-400">없음</p>
                      </div>
                    )}
                    {selectedReport.adminNote && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-blue-600">관리자 답변</p>
                          {selectedReport.isReadByUser !== undefined && (
                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${selectedReport.isReadByUser ? 'bg-slate-100 text-slate-400' : 'bg-orange-100 text-orange-500'}`}>
                              {selectedReport.isReadByUser ? '읽음' : '안읽음'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">{selectedReport.adminNote}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 접수됨: 답변 + 리워드 입력 */}
                {selectedReport.status === 'pending' && (
                  <div className="space-y-4">
                    <div className="border-t border-slate-100" />
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">답변</label>
                        <select
                          value={adminNoteSelect}
                          onChange={(e) => {
                            const val = e.target.value;
                            const opts = getAdminNoteOptions(selectedReport);
                            setAdminNoteSelect(val);
                            if (val !== '직접 입력') setAdminNote('');
                            if (val === opts[1].value || val === opts[3].value) setRewardRate(100);
                            else if (val === '직접 입력') setRewardRate(0);
                            else setRewardRate(0);
                          }}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {getAdminNoteOptions(selectedReport).map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      {(() => {
                        const isCustom = adminNoteSelect === '직접 입력';
                        const displayValue = isCustom ? adminNote : adminNoteSelect;
                        return (
                          <div>
                            {isCustom && (
                              <div className="flex justify-end mb-1">
                                <span className={`text-xs font-medium ${adminNote.length >= 270 ? 'text-red-500' : 'text-slate-400'}`}>
                                  {adminNote.length}/300
                                </span>
                              </div>
                            )}
                            <textarea
                              value={displayValue}
                              onChange={(e) => { if (isCustom && e.target.value.length <= 300) setAdminNote(e.target.value); }}
                              readOnly={!isCustom}
                              placeholder={isCustom ? '처리 결과를 입력해주세요 (줄바꿈 가능)' : ''}
                              className={`w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none transition-shadow ${
                                isCustom ? 'focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300' : 'bg-slate-50 text-slate-600 cursor-default'
                              }`}
                              rows={Math.max(3, (displayValue.match(/\n/g) || []).length + 2)}
                            />
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">리워드 지급</label>
                      {(() => {
                        const options = getAdminNoteOptions(selectedReport);
                        const isRewardOption = adminNoteSelect === options[1].value || adminNoteSelect === options[3].value;
                        const isDirect = adminNoteSelect === '직접 입력';
                        const max = selectedReport.rewardPerUnit ?? 0;
                        if (!isRewardOption && !isDirect) {
                          return (
                            <div className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm">
                              <span className="text-slate-500">지급 안함</span>
                            </div>
                          );
                        }
                        if (isRewardOption) {
                          return (
                            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
                              <span className="font-semibold text-green-700">
                                {max.toLocaleString()} {selectedReport.rewardName ?? '-'}
                              </span>
                              <span className="text-xs text-green-500">100% 지급</span>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setRewardRate(0)}
                                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                                  rewardRate === 0
                                    ? 'bg-slate-500 text-white border-slate-500'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                                }`}
                              >
                                안함
                              </button>
                              {([20, 50, 100] as const).map((rate) => (
                                <button
                                  key={rate}
                                  onClick={() => setRewardRate(rate)}
                                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                                    rewardRate === rate
                                      ? 'bg-green-600 text-white border-green-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:border-green-400 hover:text-green-600'
                                  }`}
                                >
                                  {rate}%
                                </button>
                              ))}
                            </div>
                            <div className="px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-sm">
                              {rewardRate === 0 ? (
                                <span className="text-slate-500">지급 안함</span>
                              ) : (
                                <>
                                  <span className="font-semibold text-slate-700">
                                    {Math.round(max * (rewardRate / 100)).toLocaleString()} {selectedReport.rewardName ?? '-'}
                                  </span>
                                  <span className="text-xs text-slate-400 ml-1">(최대 {max.toLocaleString()}의 {rewardRate}%)</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-slate-400">
                      미션 ID <span className="font-semibold text-slate-500">#{selectedReport.missionId}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 하단 */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button onClick={() => setSelectedReport(null)}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors">
                닫기
              </button>
              {selectedReport.status === 'pending' && (
                <button onClick={() => setShowConfirmModal(true)}
                  disabled={isProcessing || !adminNoteSelect || (adminNoteSelect === '직접 입력' && !adminNote.trim())}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  처리하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 처리 확인 모달 */}
      {showConfirmModal && selectedReport && (
        <div ref={confirmModalRef} tabIndex={-1} className="fixed inset-0 z-[60] overflow-y-auto outline-none">
          <div className="fixed inset-0 bg-black/50" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
              <h3 className="text-base font-bold text-slate-800 mb-2">처리 완료 확인</h3>
              <p className="text-sm text-slate-500 mb-5">아래 내용으로 처리 완료하시겠습니까?</p>

              <div className="space-y-3 mb-6">
                <div className="bg-slate-50 rounded-xl p-3.5">
                  <p className="text-xs text-slate-400 mb-1">답변</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{adminNoteSelect === '직접 입력' ? adminNote : adminNoteSelect}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3.5 flex items-center justify-between">
                  <p className="text-xs text-slate-400">리워드</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {(() => {
                      const opts = getAdminNoteOptions(selectedReport);
                      const is2nd = adminNoteSelect === opts[1].value || adminNoteSelect === opts[3].value;
                      const isDirect = adminNoteSelect === '직접 입력';
                      const rate = (is2nd || isDirect) ? rewardRate : 0;
                      const reward = Math.round((selectedReport.rewardPerUnit ?? 0) * (rate / 100));
                      return reward > 0
                        ? `${reward.toLocaleString()} ${selectedReport.rewardName ?? '-'} (${rate}%)`
                        : '없음';
                    })()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => { setShowConfirmModal(false); handleResolve(); }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isProcessing ? '처리중...' : '확인'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 비활성화 사유 모달 */}
      {showDeactivateModal && deactivateTarget && (
        <div ref={deactivateModalRef} tabIndex={-1} className="fixed inset-0 z-[70] flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {deactivateTarget.type === 'quiz' ? '퀴즈' : '주차장 문제'} 비활성화
            </h3>
            <p className="text-sm text-slate-500 mb-2">비활성화 사유를 선택해주세요.</p>

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
                {DEACTIVATE_REASONS.map((reason) => (
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
                onClick={async () => {
                  const reason = deactivateReasonSelect === '기타 (직접 입력)'
                    ? deactivateReasonCustom.trim()
                    : deactivateReasonSelect;
                  if (!reason) { showToast('사유를 선택해주세요.', 'error'); return; }

                  const result = await toggleMissionActive(deactivateTarget.type, deactivateTarget.id, false, reason);
                  if (result.success) {
                    if (deactivateTarget.type === 'quiz') {
                      setQuizEnabled(false);
                      setSelectedReport((prev) => prev && prev.quiz ? { ...prev, quiz: { ...prev.quiz, isActive: false, reason } } : prev);
                    } else {
                      setParkingEnabled(false);
                      setSelectedReport((prev) => prev && prev.carParking ? { ...prev, carParking: { ...prev.carParking, isActive: false, reason } } : prev);
                    }
                    showToast(result.message, 'warning');

                  } else {
                    showToast(result.message, 'error');
                  }
                  setShowDeactivateModal(false);
                }}
                disabled={!deactivateReasonSelect || (deactivateReasonSelect === '기타 (직접 입력)' && !deactivateReasonCustom.trim())}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                비활성화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
