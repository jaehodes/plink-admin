'use client';

import { useEffect, useState, useRef } from 'react';
import { useEscRef } from '../hooks/useEscClose';
import {
  Order,
  ORDER_TYPE_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
} from '../types/order';
import { cancelOrder, getOrderDetail, uploadThumbnail, replaceQuizzes } from './actions';
import { toggleMissionActive } from '../reports/actions';
import * as XLSX from 'xlsx';
import { useToast } from '../components/Toast';

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
    month: 'long',
    day: 'numeric',
  });
}

// 탭 라벨
const DEACTIVATE_REASONS = [
  '퀴즈 정답의 길이가 너무 깁니다.',
  '플레이스 방문없이 정답 맞출 수 있습니다.',
  '똑같은 문제가 이미 있습니다.',
  '플레이스에서 찾을 수 없습니다.',
  '질문이 이상합니다.',
  '정답이 틀렸습니다.',
  '기타 (직접 입력)',
];

const TAB_LABELS: Record<string, string> = {
  home: '홈',
  news: '소식',
  menu: '메뉴',
  review: '리뷰',
  map: '지도',
  around: '주변',
  info: '정보',
};

// 타입별 색상
const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  save: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  mission: { bg: 'bg-violet-50', text: 'text-violet-700' },
  direction: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

interface OrderDetailModalProps {
  orderId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OrderDetailModal({ orderId, onClose, onSuccess }: OrderDetailModalProps) {
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const quizFileInputRef = useRef<HTMLInputElement>(null);
  const [isReplacingQuizzes, setIsReplacingQuizzes] = useState(false);
  const [showQuizPreview, setShowQuizPreview] = useState(false);
  const [previewQuizzes, setPreviewQuizzes] = useState<{ tab: string; question: string; answer: string }[]>([]);
  const [previewTabFilter, setPreviewTabFilter] = useState('all');
  const [showDeferredQuizzes, setShowDeferredQuizzes] = useState(false);

  const [quizTabFilter, setQuizTabFilter] = useState<string>('all');
  const [quizActiveFilter, setQuizActiveFilter] = useState<'active' | 'inactive'>('active');
  const [showBulkDeactivateModal, setShowBulkDeactivateModal] = useState(false);
  const [bulkDeactivateReasonSelect, setBulkDeactivateReasonSelect] = useState('');
  const [bulkDeactivateReasonCustom, setBulkDeactivateReasonCustom] = useState('');
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);

  // 비활성화 사유 모달
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<{ type: 'quiz' | 'parking'; id: number } | null>(null);
  const [deactivateReasonSelect, setDeactivateReasonSelect] = useState('');
  const [deactivateReasonCustom, setDeactivateReasonCustom] = useState('');

  // ESC 키로 모달 닫기
  const orderModalRef = useEscRef(onClose);
  const cancelModalRef = useEscRef(() => setShowCancelModal(false));
  const deactivateModalRef = useEscRef(() => setShowDeactivateModal(false));
  const bulkDeactivateModalRef = useEscRef(() => setShowBulkDeactivateModal(false));
  const quizPreviewModalRef = useEscRef(() => setShowQuizPreview(false));

  // 상세 정보 로드
  useEffect(() => {
    if (!orderId) {
      return;
    }

    let isCancelled = false;

    const fetchOrderDetail = async () => {
      setIsLoading(true);

      const result = await getOrderDetail(orderId);

      if (isCancelled) return;

      setIsLoading(false);

      if (result.success && result.order) {
        setOrder(result.order);
      } else {
        setError(result.error || '발주 정보를 불러올 수 없습니다.');
      }
    };

    fetchOrderDetail();

    return () => {
      isCancelled = true;
    };
  }, [orderId]);

  // 썸네일 변경 처리
  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setIsUploadingThumbnail(true);
      const result = await uploadThumbnail(order.id, base64);
      setIsUploadingThumbnail(false);
      if (result.success) {
        showToast(result.message);
        setThumbnailError(false);
        // 상세 다시 로드
        const detail = await getOrderDetail(order.id);
        if (detail.success && detail.order) setOrder(detail.order);
        onSuccess?.();
      } else {
        showToast(result.message, 'error');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 발주 취소 처리
  const handleCancel = async () => {
    if (!order) return;

    setIsCancelling(true);

    const result = await cancelOrder(order.id);

    setIsCancelling(false);

    if (result.success) {
      setShowCancelModal(false);
      showToast(result.message);
      onSuccess?.();
      onClose();
    } else {
      showToast(result.message, 'error');
    }
  };



  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 스크롤 방지
  useEffect(() => {
    if (orderId) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [orderId]);

  if (!orderId) return null;

  // 로딩 중
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500">발주 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error || !order) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-slate-700 font-medium mb-2">오류 발생</p>
            <p className="text-slate-500 text-sm mb-4">{error || '발주 정보를 불러올 수 없습니다.'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 rounded-lg transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.min((order.completedCount / order.totalCount) * 100, 100);
  const typeStyle = TYPE_STYLES[order.type] || TYPE_STYLES.save;

  return (
    <div ref={orderModalRef} tabIndex={-1} className="fixed inset-0 z-50 overflow-y-auto outline-none">
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/50" />

      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                {order.thumbnail && !thumbnailError ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={order.thumbnail}
                    alt={decodeBase64(order.placeName)}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-white/20"
                    onError={() => setThumbnailError(true)}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-500 border-2 border-white/20 flex items-center justify-center">
                    <span className="text-white/60 text-xs">없음</span>
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {decodeBase64(order.placeName)}
                  </h2>
                  <p className="text-slate-300 text-sm mt-0.5">
                    {order.category ? decodeBase64(order.category) : '알수없음'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-300 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 상태 & 타입 뱃지 */}
            <div className="flex items-center gap-2 mt-4">
              <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                {ORDER_TYPE_LABELS[order.type]}
              </span>
            </div>
          </div>

          {/* 내용 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* 진행률 카드 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500">진행률</span>
                    <span className="text-sm font-bold text-blue-600">{progressPercent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm border-l border-blue-200 pl-4">
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">완료</p>
                    <p className="font-bold text-slate-700">{order.completedCount.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">목표</p>
                    <p className="font-bold text-slate-700">{order.totalCount.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400 text-xs">일일</p>
                    <p className="font-bold text-slate-700">{order.totalDailyCount.toLocaleString()}</p>
                    {order.deferredChanges?.totalDailyCount !== undefined && (
                      <p className="text-xs text-amber-600 mt-0.5">예정: {order.deferredChanges.totalDailyCount.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 기본 정보 그리드 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium mb-1">기간</p>
                <p className="text-sm font-semibold text-slate-700">{formatDate(order.startDate)} ~ {formatDate(order.endDate)}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {Math.ceil((new Date(order.endDate).getTime() - new Date(order.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}일
                </p>
                {order.deferredChanges?.endDate && (
                  <p className="text-xs text-amber-600 mt-1">예정: ~ {formatDate(order.deferredChanges.endDate)}</p>
                )}
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium mb-1">발주일</p>
                <p className="text-sm font-semibold text-slate-700">{formatDate(order.createdAt)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 font-medium mb-1">플레이스 ID</p>
                <p className="text-sm font-mono text-slate-600">{order.placeId}</p>
              </div>
            </div>

            {/* 발주사 */}
            {order.orderer && (
              <div className="bg-slate-50 rounded-xl p-4 text-sm">
                <p className="text-xs text-slate-400">발주사</p>
                <p className="font-semibold text-slate-700">{decodeBase64(order.orderer)}</p>
              </div>
            )}

            {/* 취소 정보 */}
            {order.status === 'cancelled' && (order.cancelledBy || order.cancelledAt) && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <p className="text-xs font-medium text-red-500 mb-2">취소 정보</p>
                <div className="flex items-center gap-4 text-sm">
                  {order.cancelledBy && (
                    <div>
                      <span className="text-red-400 text-xs">취소 처리자</span>
                      <p className="font-semibold text-red-700">{decodeBase64(order.cancelledBy)}</p>
                    </div>
                  )}
                  {order.cancelledAt && (
                    <div>
                      <span className="text-red-400 text-xs">취소일</span>
                      <p className="font-semibold text-red-700">{formatDate(order.cancelledAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 플레이스 URL */}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 font-medium mb-2">플레이스 링크</p>
              <div className="flex flex-col gap-2">
                <a
                  href={order.placeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <span>네이버 플레이스</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href={order.mobileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                >
                  <span>모바일 플레이스</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* 키워드 목록 */}
            {order.keywords && order.keywords.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    키워드
                    <span className="text-xs font-normal text-slate-400">({order.keywords.length}개)</span>
                  </h3>
                  <button
                    onClick={() => {
                      const wsData = [
                        ['키워드', '순위', '일일 수량', '완료', '목표'],
                        ...order.keywords!.map(kw => [
                          decodeBase64(kw.keyword),
                          kw.rank || '',
                          kw.dailyCount,
                          kw.completedCount,
                          kw.totalCount,
                        ]),
                      ];
                      const ws = XLSX.utils.aoa_to_sheet(wsData);
                      ws['!cols'] = [{ wch: 30 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 8 }];
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, '키워드');
                      XLSX.writeFile(wb, `키워드_${decodeBase64(order.placeName)}.xlsx`);
                    }}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    키워드 다운로드
                  </button>
                </div>
                <div className={`space-y-2 ${order.keywords.length >= 7 ? 'max-h-[380px] overflow-y-auto pr-1' : ''}`}>
                  {order.keywords.map((keyword, index) => {
                    const kwPercent = Math.min((keyword.completedCount / keyword.totalCount) * 100, 100);
                    return (
                      <div key={index} className="bg-white border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {keyword.rank && (
                              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded">
                                {keyword.rank}위
                              </span>
                            )}
                            <span className="font-medium text-slate-700 text-sm">{decodeBase64(keyword.keyword)}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>일일 {keyword.dailyCount}건</span>
                            <span>{keyword.completedCount} / {keyword.totalCount}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{ width: `${kwPercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 퀴즈 목록 */}
            {order.quizzes && order.quizzes.length > 0 && (() => {
              const tabs = Array.from(new Set(order.quizzes!.map(q => q.tab)));
              const byTab = quizTabFilter === 'all'
                ? order.quizzes!
                : order.quizzes!.filter(q => q.tab === quizTabFilter);
              const filtered = byTab.filter(q =>
                quizActiveFilter === 'active' ? q.isActive !== false : q.isActive === false
              );
              const activeCount = byTab.filter(q => q.isActive !== false).length;
              const inactiveCount = byTab.filter(q => q.isActive === false).length;

              return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <span className="w-1 h-4 bg-violet-500 rounded-full"></span>
                    퀴즈
                    <span className="text-xs font-normal text-slate-400">({order.quizzes!.length}개)</span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <div className="flex bg-slate-100 rounded-lg p-0.5 mr-1">
                      <button
                        onClick={() => setQuizActiveFilter('active')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          quizActiveFilter === 'active' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        활성 ({activeCount})
                      </button>
                      <button
                        onClick={() => setQuizActiveFilter('inactive')}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          quizActiveFilter === 'inactive' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        비활성 ({inactiveCount})
                      </button>
                    </div>
                    <input
                      ref={quizFileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file || !order) return;
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          const data = ev.target?.result;
                          if (!data) return;
                          try {
                            const workbook = XLSX.read(data, { type: 'array' });
                            const sheet = workbook.Sheets[workbook.SheetNames[0]];
                            const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                            // 헤더 찾기: 질문 | 정답 | 탭
                            const headerIdx = rows.findIndex(r => {
                              const c0 = String(r[0] ?? '').trim();
                              const c1 = String(r[1] ?? '').trim();
                              const c2 = String(r[2] ?? '').trim();
                              return (c0 === '질문' || c0.toLowerCase() === 'question') &&
                                     (c1 === '정답' || c1.toLowerCase() === 'answer') &&
                                     (c2 === '탭' || c2.toLowerCase() === 'tab');
                            });
                            if (headerIdx < 0) {
                              showToast('올바른 형식이 아닙니다. (질문, 정답, 탭 헤더 필요)', 'error');
                              return;
                            }
                            const dataRows = rows.slice(headerIdx + 1).filter(r => r[0] && r[1] && r[2]);
                            if (dataRows.length === 0) {
                              showToast('퀴즈 데이터가 없습니다.', 'error');
                              return;
                            }

                            // 한글 탭 → 영문 변환
                            const tabMap: Record<string, string> = {
                              '홈': 'home', '소식': 'news', '뉴스': 'news', '메뉴': 'menu',
                              '리뷰': 'review', '지도': 'map', '주변': 'around', '정보': 'info',
                              'home': 'home', 'news': 'news', 'menu': 'menu',
                              'review': 'review', 'map': 'map', 'around': 'around', 'info': 'info',
                            };

                            const quizList = dataRows.map(r => ({
                              question: String(r[0]).trim(),
                              answer: String(r[1]).trim(),
                              tab: tabMap[String(r[2]).trim()] || String(r[2]).trim(),
                            }));

                            const validTabs = ['home', 'news', 'menu', 'review', 'map', 'around', 'info'];
                            const invalidTab = quizList.find(q => !validTabs.includes(q.tab));
                            if (invalidTab) {
                              showToast(`올바르지 않은 탭: "${String(rows.slice(headerIdx + 1)[quizList.indexOf(invalidTab)]?.[2] ?? invalidTab.tab)}"`, 'error');
                              return;
                            }

                            setPreviewQuizzes(quizList);
                            setPreviewTabFilter('all');
                            setShowQuizPreview(true);
                          } catch {
                            showToast('엑셀 파일 읽기에 실패했습니다.', 'error');
                          }
                        };
                        reader.readAsArrayBuffer(file);
                        if (quizFileInputRef.current) quizFileInputRef.current.value = '';
                      }}
                    />
                    {order.deferredQuizzes && order.deferredQuizzes.length > 0 && (
                      <button
                        onClick={() => { setShowDeferredQuizzes(!showDeferredQuizzes); setQuizTabFilter('all'); }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          showDeferredQuizzes ? 'text-violet-700 bg-violet-100' : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                        }`}
                      >
                        {showDeferredQuizzes ? `기존 퀴즈 (${order.quizzes!.length})` : `변경 예정 (${order.deferredQuizzes.length})`}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const activeQuizzes = order.quizzes!.filter(q => q.isActive !== false);
                        if (activeQuizzes.length === 0) {
                          showToast('활성화된 퀴즈가 없습니다.', 'error');
                          return;
                        }
                        const wsData = [
                          ['질문', '정답', '탭'],
                          ...activeQuizzes.map(q => [decodeBase64(q.question), decodeBase64(q.answer), TAB_LABELS[q.tab] || q.tab]),
                        ];
                        const ws = XLSX.utils.aoa_to_sheet(wsData);
                        ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 10 }];
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, '퀴즈');
                        XLSX.writeFile(wb, `퀴즈_${decodeBase64(order.placeName)}_활성.xlsx`);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                      퀴즈 다운로드
                    </button>
                    <button
                      onClick={() => quizFileInputRef.current?.click()}
                      disabled={isReplacingQuizzes}
                      className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isReplacingQuizzes ? '교체중...' : '퀴즈 교체 (엑셀)'}
                    </button>
                  </div>
                </div>
                {!showDeferredQuizzes && tabs.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <button
                      onClick={() => setQuizTabFilter('all')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                        quizTabFilter === 'all' ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                      }`}
                    >
                      전체
                    </button>
                    {tabs.map(tab => (
                      <button
                        key={tab}
                        onClick={() => setQuizTabFilter(tab)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                          quizTabFilter === tab ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-600 hover:bg-violet-100'
                        }`}
                      >
                        {TAB_LABELS[tab] || tab}
                      </button>
                    ))}
                    {quizTabFilter !== 'all' && (
                      <div className="ml-auto flex gap-1.5">
                        {filtered.some(q => q.isActive === false) && (
                          <button
                            onClick={async () => {
                              const inactiveQuizzes = filtered.filter(q => q.isActive === false);
                              if (inactiveQuizzes.length === 0) return;
                              setIsBulkDeactivating(true);
                              let successCount = 0;
                              for (const quiz of inactiveQuizzes) {
                                const result = await toggleMissionActive('quiz', quiz.id, true);
                                if (result.success) successCount++;
                              }
                              setIsBulkDeactivating(false);
                              if (successCount > 0) {
                                showToast(`${successCount}개 퀴즈가 활성화되었습니다.`);
                                const detail = await getOrderDetail(order.id);
                                if (detail.success && detail.order) setOrder(detail.order);
                                onSuccess?.();
                              }
                            }}
                            disabled={isBulkDeactivating}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isBulkDeactivating ? '처리중...' : `${TAB_LABELS[quizTabFilter] || quizTabFilter} 일괄 활성화`}
                          </button>
                        )}
                        {filtered.some(q => q.isActive !== false) && (
                          <button
                            onClick={() => {
                              setBulkDeactivateReasonSelect('');
                              setBulkDeactivateReasonCustom('');
                              setShowBulkDeactivateModal(true);
                            }}
                            disabled={isBulkDeactivating}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {isBulkDeactivating ? '처리중...' : `${TAB_LABELS[quizTabFilter] || quizTabFilter} 일괄 비활성화`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* 변경 예정 퀴즈 (토글) */}
                {showDeferredQuizzes && order.deferredQuizzes && order.deferredQuizzes.length > 0 && (() => {
                  const dTabs = Array.from(new Set(order.deferredQuizzes!.map(q => q.tab)));
                  const dFiltered = quizTabFilter === 'all'
                    ? order.deferredQuizzes!
                    : order.deferredQuizzes!.filter(q => q.tab === quizTabFilter);

                  return (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-amber-600 mb-2">다음날부터 반영됩니다</p>
                      {dTabs.length > 1 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <button
                            onClick={() => setQuizTabFilter('all')}
                            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                              quizTabFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            }`}
                          >
                            전체
                          </button>
                          {dTabs.map(tab => (
                            <button
                              key={tab}
                              onClick={() => setQuizTabFilter(tab)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                                quizTabFilter === tab ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              }`}
                            >
                              {TAB_LABELS[tab] || tab}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {dFiltered.map((quiz, index) => (
                          <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                                {TAB_LABELS[quiz.tab] || quiz.tab}
                              </span>
                            </div>
                            <p className="text-sm text-slate-800 mb-0.5">
                              <span className="text-violet-600 font-semibold">Q.</span> {decodeBase64(quiz.question)}
                            </p>
                            <p className="text-sm">
                              <span className="text-emerald-600 font-semibold">A.</span>{' '}
                              <span className="text-emerald-700 font-medium">{decodeBase64(quiz.answer)}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 기존 퀴즈 목록 */}
                {!showDeferredQuizzes && (
                <div className="space-y-2">
                  {filtered.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-6">
                      {quizActiveFilter === 'active' ? '활성화된 퀴즈가 없습니다' : '비활성화된 퀴즈가 없습니다'}
                    </p>
                  )}
                  {filtered.map((quiz, index) => (
                    <div key={index} className="bg-violet-50 border border-violet-100 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded">
                            {TAB_LABELS[quiz.tab] || quiz.tab}
                          </span>
                          {quiz.isActive === false && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded">비활성</span>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            if (quiz.isActive !== false) {
                              setDeactivateTarget({ type: 'quiz', id: quiz.id });
                              setDeactivateReasonSelect('');
                              setDeactivateReasonCustom('');
                              setShowDeactivateModal(true);
                            } else {
                              const result = await toggleMissionActive('quiz', quiz.id, true);
                              if (result.success) {
                                showToast(result.message);
                                const detail = await getOrderDetail(order.id);
                                if (detail.success && detail.order) setOrder(detail.order);
                                onSuccess?.();
                              } else {
                                showToast(result.message, 'error');
                              }
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                            quiz.isActive !== false ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${quiz.isActive !== false ? 'bg-red-400' : 'bg-green-500'}`} />
                          {quiz.isActive !== false ? '비활성화' : '활성화'}
                        </button>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">
                        <span className="text-violet-600 font-semibold">Q.</span> {decodeBase64(quiz.question)}
                      </p>
                      <p className="text-sm">
                        <span className="text-emerald-600 font-semibold">A.</span>{' '}
                        <span className="text-emerald-700 font-medium">{decodeBase64(quiz.answer)}</span>
                      </p>
                      {quiz.isActive === false && quiz.reason && (
                        <div className="mt-2 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                          <p className="text-xs text-red-400 mb-0.5">비활성화 사유</p>
                          <p className="text-xs text-red-600">{decodeBase64(quiz.reason)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                )}
              </div>
              );
            })()}


            {/* 자동차 미션 */}
            {order.carMissions && order.carMissions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                  자동차 미션
                </h3>
                <div className="space-y-2">
                  {order.carMissions.map((mission) => (
                    <div key={mission.id} className={`bg-amber-50 border border-amber-100 rounded-lg p-4 ${mission.isActive === false ? 'opacity-40' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          {mission.isActive === false && (
                            <span className="inline-block px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded">비활성</span>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            if (mission.isActive !== false) {
                              setDeactivateTarget({ type: 'parking', id: mission.id });
                              setDeactivateReasonSelect('');
                              setDeactivateReasonCustom('');
                              setShowDeactivateModal(true);
                            } else {
                              const result = await toggleMissionActive('parking', mission.id, true);
                              if (result.success) {
                                showToast(result.message);
                                const detail = await getOrderDetail(order.id);
                                if (detail.success && detail.order) setOrder(detail.order);
                                onSuccess?.();
                              } else {
                                showToast(result.message, 'error');
                              }
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                            mission.isActive !== false ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${mission.isActive !== false ? 'bg-red-400' : 'bg-green-500'}`} />
                          {mission.isActive !== false ? '비활성화' : '활성화'}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-slate-400 text-xs mb-0.5">검색 위치</p>
                          <p className="text-slate-700 font-medium">목적지</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs mb-0.5">주차 정답</p>
                          <p className="text-slate-700 font-medium">{decodeBase64(mission.parkingAnswer)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs mb-0.5">힌트 종류</p>
                          <p className="text-slate-700 font-medium">{{'consonant':'자음','vowel':'모음'}[mission.chosungRange] || mission.chosungRange}</p>
                        </div>
                      </div>
                      {mission.isActive === false && mission.reason && (
                        <div className="mt-2 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                          <p className="text-xs text-red-400 mb-0.5">비활성화 사유</p>
                          <p className="text-xs text-red-600">{decodeBase64(mission.reason)}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 버스/지하철 미션 */}
            {order.type === 'direction' && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                  버스/지하철 미션
                </h3>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 text-sm">
                  <p className="text-slate-400 text-xs mb-1">도착지</p>
                  <span className="px-2 py-1 bg-emerald-100 rounded text-emerald-700 text-xs font-medium">
                    {decodeBase64(order.placeName)}
                  </span>
                </div>
              </div>
            )}

            {/* 미션 비율 */}
            {order.missionRatio && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-slate-400 rounded-full"></span>
                  미션 비율
                </h3>
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-amber-600 font-medium">자동차</span>
                        <span className="text-slate-600 font-semibold">{order.missionRatio.car}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-amber-500 h-2 rounded-full"
                          style={{ width: `${order.missionRatio.car}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-emerald-600 font-medium">버스</span>
                        <span className="text-slate-600 font-semibold">{order.missionRatio.bus}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${order.missionRatio.bus}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 하단 고정 버튼 영역 */}
          <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 bg-slate-50">
            <div className="flex justify-between">
              <button
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={isUploadingThumbnail}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
              >
                {isUploadingThumbnail ? '변경중...' : '썸네일 변경'}
              </button>
              {(order.status === 'pending' || order.status === 'progress') && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                >
                  발주 취소
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 발주 취소 확인 모달 */}
      {showCancelModal && (
        <div ref={cancelModalRef} tabIndex={-1} className="fixed inset-0 z-[60] flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">발주 취소</h3>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              정말로 이 발주를 취소하시겠습니까?
            </p>
            <p className="text-sm text-slate-500 mb-4">
              <span className="font-medium text-slate-700">{decodeBase64(order.placeName)}</span>
              <br />
              <span className="text-red-500 text-xs">※ 취소된 발주는 복구할 수 없습니다.</span>
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              >
                아니오
              </button>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? '처리중...' : '취소하기'}
              </button>
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
                    showToast(result.message, 'warning');
                    const detail = await getOrderDetail(order!.id);
                    if (detail.success && detail.order) setOrder(detail.order);
                    onSuccess?.();
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

      {/* 퀴즈 교체 미리보기 모달 */}
      {showQuizPreview && previewQuizzes.length > 0 && order && (
        <div ref={quizPreviewModalRef} tabIndex={-1} className="fixed inset-0 z-[70] flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">퀴즈 교체 미리보기</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  기존 {order.quizzes?.length ?? 0}개 → 새 {previewQuizzes.length}개로 교체됩니다
                </p>
              </div>
              <button onClick={() => setShowQuizPreview(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 탭 필터 */}
            <div className="px-6 pt-4 pb-3 flex flex-wrap gap-1.5 border-b border-slate-100">
              {(() => {
                const tabs = Array.from(new Set(previewQuizzes.map(q => q.tab)));
                return [
                  <button
                    key="all"
                    onClick={() => setPreviewTabFilter('all')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                      previewTabFilter === 'all' ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    전체 ({previewQuizzes.length})
                  </button>,
                  ...tabs.map(tab => (
                    <button
                      key={tab}
                      onClick={() => setPreviewTabFilter(tab)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                        previewTabFilter === tab ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {TAB_LABELS[tab] || tab} ({previewQuizzes.filter(q => q.tab === tab).length})
                    </button>
                  ))
                ];
              })()}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {(() => {
                const filtered = previewTabFilter === 'all' ? previewQuizzes : previewQuizzes.filter(q => q.tab === previewTabFilter);
                const tabs = previewTabFilter === 'all'
                  ? Array.from(new Set(filtered.map(q => q.tab)))
                  : [previewTabFilter];

                return tabs.map(tab => {
                  const tabQuizzes = filtered.filter(q => q.tab === tab);
                  return (
                    <div key={tab}>
                      {previewTabFilter === 'all' && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg bg-violet-100 text-violet-700">
                            {TAB_LABELS[tab] || tab}
                          </span>
                          <span className="text-xs text-slate-400">{tabQuizzes.length}개</span>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {tabQuizzes.map((q, i) => (
                          <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
                            <p className="text-sm text-slate-800 mb-0.5">
                              <span className="text-violet-600 font-semibold">Q.</span> {q.question}
                            </p>
                            <p className="text-sm">
                              <span className="text-emerald-600 font-semibold">A.</span>{' '}
                              <span className="text-emerald-700 font-medium">{q.answer}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <p className="text-xs text-red-500">기존 퀴즈는 모두 삭제됩니다</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuizPreview(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    setIsReplacingQuizzes(true);
                    const result = await replaceQuizzes(order.id, previewQuizzes);
                    setIsReplacingQuizzes(false);
                    if (result.success) {
                      showToast(`${previewQuizzes.length}개 퀴즈로 교체되었습니다.`);
                      setShowQuizPreview(false);
                      const detail = await getOrderDetail(order.id);
                      if (detail.success && detail.order) setOrder(detail.order);
                      onSuccess?.();
                    } else {
                      showToast(result.message, 'error');
                    }
                  }}
                  disabled={isReplacingQuizzes}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isReplacingQuizzes ? '교체중...' : '교체하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 일괄 비활성화 사유 모달 */}
      {showBulkDeactivateModal && order && (
        <div ref={bulkDeactivateModalRef} tabIndex={-1} className="fixed inset-0 z-[70] flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {TAB_LABELS[quizTabFilter] || '전체'} 탭 일괄 비활성화
            </h3>
            <p className="text-sm text-slate-500 mb-4">비활성화 사유를 선택해주세요.</p>

            <div className="space-y-3 mb-5">
              <select
                value={bulkDeactivateReasonSelect}
                onChange={(e) => {
                  setBulkDeactivateReasonSelect(e.target.value);
                  if (e.target.value !== '기타 (직접 입력)') setBulkDeactivateReasonCustom('');
                }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">사유를 선택하세요</option>
                {DEACTIVATE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>

              {bulkDeactivateReasonSelect === '기타 (직접 입력)' && (
                <div>
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs ${bulkDeactivateReasonCustom.length >= 90 ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                      {bulkDeactivateReasonCustom.length}/100
                    </span>
                  </div>
                  <textarea
                    value={bulkDeactivateReasonCustom}
                    onChange={(e) => { if (e.target.value.length <= 100) setBulkDeactivateReasonCustom(e.target.value); }}
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
                onClick={() => setShowBulkDeactivateModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={async () => {
                  const reason = bulkDeactivateReasonSelect === '기타 (직접 입력)'
                    ? bulkDeactivateReasonCustom.trim()
                    : bulkDeactivateReasonSelect;
                  if (!reason) { showToast('사유를 선택해주세요.', 'error'); return; }

                  const byTab = quizTabFilter === 'all'
                    ? order.quizzes!
                    : order.quizzes!.filter(q => q.tab === quizTabFilter);
                  const activeQuizzes = byTab.filter(q => q.isActive !== false);
                  if (activeQuizzes.length === 0) return;

                  setIsBulkDeactivating(true);
                  setShowBulkDeactivateModal(false);
                  let successCount = 0;
                  for (const quiz of activeQuizzes) {
                    const result = await toggleMissionActive('quiz', quiz.id, false, reason);
                    if (result.success) successCount++;
                  }
                  setIsBulkDeactivating(false);
                  if (successCount > 0) {
                    showToast(`${successCount}개 퀴즈가 비활성화되었습니다.`, 'warning');
                    const detail = await getOrderDetail(order.id);
                    if (detail.success && detail.order) setOrder(detail.order);
                    onSuccess?.();
                  }
                }}
                disabled={isBulkDeactivating || !bulkDeactivateReasonSelect || (bulkDeactivateReasonSelect === '기타 (직접 입력)' && !bulkDeactivateReasonCustom.trim())}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isBulkDeactivating ? '처리중...' : '일괄 비활성화'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
