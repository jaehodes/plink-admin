'use client';

import { useEffect, useState } from 'react';
import { useEscRef } from '../hooks/useEscClose';
import {
  ExecutionDetail,
  EXECUTION_TYPE_LABELS,
  EXECUTION_STATUS_LABELS,
  EXECUTION_STATUS_COLORS,
} from '../types/execution';
import { getExecutionDetail } from './actions';

// Base64 디코딩 헬퍼
function decodeBase64(str: string): string {
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch {
    return str;
  }
}

// 날짜 포맷 헬퍼
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// 타입별 색상
const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  save: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  quiz1: { bg: 'bg-violet-50', text: 'text-violet-700' },
  quiz2: { bg: 'bg-purple-50', text: 'text-purple-700' },
  direction: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

// 탭 라벨
const TAB_LABELS: Record<string, string> = {
  home: '홈',
  news: '소식',
  menu: '메뉴',
  review: '리뷰',
  map: '지도',
  around: '주변',
  info: '정보',
};

// 힌트 종류 라벨
const CHOSUNG_RANGE_LABELS: Record<string, string> = {
  consonant: '자음',
  vowel: '모음',
};

interface ExecutionDetailModalProps {
  executionId: string | null;
  onClose: () => void;
}

export default function ExecutionDetailModal({ executionId, onClose }: ExecutionDetailModalProps) {
  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execModalRef = useEscRef(onClose);

  // 상세 정보 로드
  useEffect(() => {
    if (!executionId) {
      return;
    }

    let isCancelled = false;

    const fetchExecutionDetail = async () => {
      setIsLoading(true);

      const result = await getExecutionDetail(executionId);

      if (isCancelled) return;

      setIsLoading(false);

      if (result.success && result.execution) {
        setExecution(result.execution);
      } else {
        setError(result.error || '수행 정보를 불러올 수 없습니다.');
      }
    };

    fetchExecutionDetail();

    return () => {
      isCancelled = true;
    };
  }, [executionId]);

  // ESC 키로 모달 닫기
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
    if (executionId) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [executionId]);

  if (!executionId) return null;

  // 로딩 중
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="fixed inset-0 bg-black/50" />
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-500">수행 정보를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error || !execution) {
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
            <p className="text-slate-500 text-sm mb-4">{error || '수행 정보를 불러올 수 없습니다.'}</p>
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

  const typeStyle = TYPE_STYLES[execution.type] || TYPE_STYLES.save;

  return (
    <div ref={execModalRef} tabIndex={-1} className="fixed inset-0 z-50 overflow-y-auto outline-none">
      {/* 배경 오버레이 */}
      <div className="fixed inset-0 bg-black/50" />

      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  수행 상세
                </h2>
                <p className="text-slate-300 text-sm mt-1">
                  {decodeBase64(execution.placeName)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* 컨텐츠 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 상태/타입 뱃지 */}
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${EXECUTION_STATUS_COLORS[execution.status] || 'bg-slate-100 text-slate-600'}`}>
                {EXECUTION_STATUS_LABELS[execution.status] || execution.status}
              </span>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${typeStyle.bg} ${typeStyle.text}`}>
                {EXECUTION_TYPE_LABELS[execution.type]}
                {execution.subType && ` · ${execution.subType === 'car' ? '자동차' : '버스'}`}
              </span>
            </div>

            {/* 유저 정보 */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">유저 정보</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">uname</p>
                  <p className="text-sm font-medium text-slate-900">{execution.uname}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">소속</p>
                  <p className="text-sm font-medium text-slate-900">{decodeBase64(execution.affiliation)}</p>
                </div>
              </div>
            </div>

            {/* 수행 정보 */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">수행 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">플레이스</p>
                  <p className="text-sm font-medium text-slate-900">{decodeBase64(execution.placeName)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">플레이스 ID</p>
                  <p className="text-sm font-medium text-slate-900">{execution.placeId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">키워드</p>
                  <p className="text-sm font-medium text-slate-900">{decodeBase64(execution.keyword)}</p>
                </div>
              </div>

              {/* 플레이스 링크 */}
              {execution.placeId && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-2 font-semibold">플레이스 링크</p>
                  <div className="flex flex-wrap gap-3">
                    <a href={`https://map.naver.com/p/entry/place/${execution.placeId}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      네이버 플레이스
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <a href={`https://m.place.naver.com/place/${execution.placeId}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      모바일 플레이스
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              )}

              {/* 제출 URL (save, direction/bus만) */}
              {execution.submittedValue && (execution.type === 'save' || (execution.type === 'direction' && execution.subType === 'bus')) && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">제출한 URL</p>
                  <a
                    href={execution.submittedValue}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 break-all"
                  >
                    {execution.submittedValue}
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>

            {/* 퀴즈 정보 (quiz1, quiz2 타입일 때만) */}
            {(execution.type === 'quiz1' || execution.type === 'quiz2') && execution.quizzes && execution.quizzes.length > 0 && (
              <div className="bg-violet-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-violet-700 mb-3">퀴즈 정보 ({execution.quizzes.length}개)</h3>
                <div className="space-y-4">
                  {execution.quizzes.map((quiz, index) => (
                    <div key={index} className={`space-y-2 ${index > 0 ? 'pt-3 border-t border-violet-200' : ''}`}>
                      {execution.quizzes!.length > 1 && (
                        <p className="text-xs font-semibold text-violet-600">퀴즈 {index + 1}</p>
                      )}
                      <div>
                        <p className="text-xs text-violet-500">탭 위치</p>
                        <p className="text-sm font-medium text-violet-900">{TAB_LABELS[quiz.tab] || quiz.tab}</p>
                      </div>
                      <div>
                        <p className="text-xs text-violet-500">질문</p>
                        <p className="text-sm font-medium text-violet-900">{decodeBase64(quiz.question)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-violet-500">정답</p>
                        <p className="text-sm font-medium text-violet-900">{decodeBase64(quiz.answer)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 자동차 미션 정보 (direction/car) */}
            {execution.type === 'direction' && execution.subType === 'car' && execution.carMission && (
              <div className="bg-amber-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-amber-700 mb-3">자동차 미션 정보</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-amber-500">검색 위치</p>
                    <p className="text-sm font-medium text-amber-900">목적지</p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-500">힌트 종류</p>
                    <p className="text-sm font-medium text-amber-900">{CHOSUNG_RANGE_LABELS[execution.carMission.chosungRange] || execution.carMission.chosungRange}</p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-500">주차 정답</p>
                    <p className="text-sm font-medium text-amber-900">{decodeBase64(execution.carMission.parkingAnswer)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 버스/지하철 미션 정보 (direction/bus) */}
            {execution.type === 'direction' && execution.subType === 'bus' && (
              <div className="bg-amber-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-amber-700 mb-3">버스/지하철 미션 정보</h3>
                <div>
                  <p className="text-xs text-amber-500">도착지</p>
                  <p className="text-sm font-medium text-amber-900">{decodeBase64(execution.placeName)}</p>
                </div>
              </div>
            )}

            {/* 시간 정보 */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">시간 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">시작 시간</p>
                  <p className="text-sm font-medium text-slate-900">{formatDateTime(execution.startedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">완료 시간</p>
                  <p className="text-sm font-medium text-slate-900">
                    {execution.completedAt ? formatDateTime(execution.completedAt) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">생성일</p>
                  <p className="text-sm font-medium text-slate-900">{formatDateTime(execution.createdAt)}</p>
                </div>
                {execution.completedAt && execution.startedAt && (
                  <div>
                    <p className="text-xs text-slate-500">소요 시간</p>
                    <p className="text-sm font-medium text-slate-900">
                      {Math.round((new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime()) / 1000)}초
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 실패 사유 */}
            {execution.status === 'failed' && execution.failReason && (
              <div className="bg-red-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-red-700 mb-2">실패 사유</h3>
                <p className="text-sm text-red-600">{decodeBase64(execution.failReason)}</p>
              </div>
            )}

            {/* ID 정보 */}
            <div className="text-xs text-slate-400 pt-4 border-t border-slate-200">
              <p>수행 ID: {execution.id}</p>
              <p>발주 ID: {execution.orderId}</p>
            </div>
          </div>

          {/* 푸터 */}
          <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
