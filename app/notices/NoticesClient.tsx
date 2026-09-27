'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEscRef } from '../hooks/useEscClose';
import ConfirmModal from '../components/ConfirmModal';
import { Notice } from '../types/notice';
import { createNotice, updateNotice, deleteNotice, toggleNoticeActive } from './actions';
import { useToast } from '../components/Toast';

const FILTER_OPTIONS: { key: string; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'true', label: '중요' },
  { key: 'false', label: '일반' },
];

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface NoticesClientProps {
  pinnedNotices: Notice[];
  initialNotices: Notice[];
  initialTotal: number;
  initialError: string | null;
}

export default function NoticesClient({
  pinnedNotices,
  initialNotices,
  initialTotal,
  initialError,
}: NoticesClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newIsImportant, setNewIsImportant] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editIsImportant, setEditIsImportant] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [openedFromDetail, setOpenedFromDetail] = useState(false);

  const noticeModalRef = useEscRef(() => setSelectedNotice(null));
  const createModalRef = useEscRef(() => setShowCreateModal(false));
  const editModalRef = useEscRef(() => { setShowEditModal(false); if (!openedFromDetail) setSelectedNotice(null); });

  const currentFilter = searchParams.get('isImportant') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(initialTotal / 7);

  const openEditModal = () => {
    if (!selectedNotice) return;
    setEditTitle(selectedNotice.title);
    setEditContent(selectedNotice.content);
    setEditIsImportant(selectedNotice.isImportant ?? false);
    setShowEditModal(true);
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsSubmitting(true);
    const result = await createNotice(newTitle, newContent, newIsImportant);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setShowCreateModal(false);
      setNewTitle(''); setNewContent(''); setNewIsImportant(false);
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleUpdate = async () => {
    if (!selectedNotice || !editTitle.trim() || !editContent.trim()) return;
    setIsSubmitting(true);
    const result = await updateNotice(selectedNotice.id, editTitle, editContent, editIsImportant);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setShowEditModal(false); setSelectedNotice(null);
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedNotice) return;
    setIsSubmitting(true);
    const result = await deleteNotice(selectedNotice.id);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setSelectedNotice(null);
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleToggleActive = async () => {
    if (!selectedNotice) return;
    const nextActive = !(selectedNotice.isActive ?? true);
    setIsSubmitting(true);
    const result = await toggleNoticeActive(selectedNotice.id, nextActive);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setSelectedNotice({ ...selectedNotice, isActive: nextActive });
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('isImportant', filter);
    router.push(`/notices${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/notices?${params.toString()}`);
  };

  // 공지 카드 렌더
  const renderNoticeCard = (notice: Notice, isPinned: boolean) => (
    <div
      key={notice.id}
      onClick={() => setSelectedNotice(notice)}
      className={`bg-white rounded-xl border overflow-hidden transition-all cursor-pointer hover:shadow-sm ${
        notice.isActive === false
          ? 'opacity-50 border-slate-200'
          : isPinned
            ? 'border-red-200 hover:border-red-300'
            : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="px-5 py-4">
        {/* 뱃지 + 제목 */}
        <div className="flex items-center gap-2 mb-2">
          {notice.isActive === false && (
            <span className="shrink-0 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-400">
              비활성
            </span>
          )}
          {isPinned && (
            <span className="shrink-0 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-600">
              고정
            </span>
          )}
          {!isPinned && notice.isImportant && (
            <span className="shrink-0 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-600">
              중요
            </span>
          )}
          <h3 className="text-sm font-bold text-slate-800 truncate">{notice.title}</h3>
        </div>

        {/* 내용 미리보기 */}
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-3">{notice.content}</p>

        {/* 메타 정보 */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{formatDateTime(notice.createdAt)}</span>
          {notice.createdBy && (
            <>
              <span>·</span>
              <span>{notice.createdBy}</span>
            </>
          )}
          {notice.updatedAt && (
            <>
              <span>·</span>
              <span>수정 {formatDateTime(notice.updatedAt)}</span>
              {notice.updatedBy && <span>({notice.updatedBy})</span>}
            </>
          )}
        </div>
      </div>
    </div>
  );

  // 등록/수정 폼 공통 렌더
  const renderNoticeForm = (mode: 'create' | 'edit') => {
    const title = mode === 'create' ? newTitle : editTitle;
    const setTitle = mode === 'create' ? setNewTitle : setEditTitle;
    const content = mode === 'create' ? newContent : editContent;
    const setContent = mode === 'create' ? setNewContent : setEditContent;
    const isImportant = mode === 'create' ? newIsImportant : editIsImportant;
    const setIsImportant = mode === 'create' ? setNewIsImportant : setEditIsImportant;

    return (
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="공지사항 제목을 입력하세요"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300 transition-shadow"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">내용</label>
            <span className={`text-xs font-medium ${content.length >= 270 ? 'text-red-500' : 'text-slate-400'}`}>
              {content.length}/300
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => { if (e.target.value.length <= 300) setContent(e.target.value); }}
            placeholder="공지사항 내용을 입력하세요 (줄바꿈 가능)"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300 transition-shadow"
            rows={7}
          />
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 rounded-xl px-4 py-3">
          <input
            type="checkbox"
            checked={isImportant}
            onChange={(e) => setIsImportant(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-500"
          />
          <span className="text-sm font-medium text-slate-700">중요 공지로 설정</span>
        </label>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공지사항</h1>
          <p className="text-sm text-gray-500 mt-1">앱 공지사항을 관리합니다</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          공지 등록
        </button>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.key}
            onClick={() => handleFilterChange(option.key)}
            className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
              currentFilter === option.key
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {option.label}
          </button>
        ))}
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
          {/* 고정 공지 */}
          {pinnedNotices.length > 0 && (
            pinnedNotices.map((notice) => renderNoticeCard(notice, true))
          )}

          {/* 일반 공지 */}
          {initialNotices.length === 0 && pinnedNotices.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
              <div className="text-slate-300 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">등록된 공지사항이 없습니다</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                첫 공지 등록하기
              </button>
            </div>
          ) : (
            initialNotices.map((notice) => renderNoticeCard(notice, false))
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

      {/* 상세 모달 */}
      {selectedNotice && !showEditModal && !showDeleteConfirm && (
        <div ref={noticeModalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">

            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedNotice.isActive === false && (
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-400">
                    비활성
                  </span>
                )}
                {selectedNotice.isImportant && (
                  <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-600">
                    중요
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">#{selectedNotice.id}</span>
              </div>
              <button onClick={() => setSelectedNotice(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 leading-relaxed mb-2">{selectedNotice.title}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{formatDateTime(selectedNotice.createdAt)}</span>
                  {selectedNotice.createdBy && (
                    <>
                      <span>·</span>
                      <span>{selectedNotice.createdBy}</span>
                    </>
                  )}
                </div>
                {selectedNotice.updatedAt && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>수정 {formatDateTime(selectedNotice.updatedAt)}</span>
                    {selectedNotice.updatedBy && (
                      <>
                        <span>·</span>
                        <span>{selectedNotice.updatedBy}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100" />

              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4">
                {selectedNotice.content}
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button
                onClick={() => setSelectedNotice(null)}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={handleToggleActive}
                disabled={isSubmitting}
                className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${
                  (selectedNotice.isActive ?? true)
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                    : 'text-green-600 bg-green-50 hover:bg-green-100'
                }`}
              >
                {(selectedNotice.isActive ?? true) ? '비활성화' : '활성화'}
              </button>
              <button
                onClick={() => { setOpenedFromDetail(true); openEditModal(); }}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50"
              >
                수정
              </button>
              <button
                onClick={() => { setOpenedFromDetail(true); setShowDeleteConfirm(true); }}
                disabled={isSubmitting}
                className="px-4 py-2.5 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공지 등록 모달 */}
      {showCreateModal && (
        <div ref={createModalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">공지 등록</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {renderNoticeForm('create')}

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !newTitle.trim() || !newContent.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '등록중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {showEditModal && selectedNotice && (
        <div ref={editModalRef} tabIndex={-1} className="fixed inset-0 z-[60] flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">공지 수정</h3>
                <span className="text-xs text-slate-400 font-mono">#{selectedNotice.id}</span>
              </div>
              <button onClick={() => { setShowEditModal(false); if (!openedFromDetail) setSelectedNotice(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {renderNoticeForm('edit')}

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <button
                onClick={() => { setShowEditModal(false); if (!openedFromDetail) setSelectedNotice(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdate}
                disabled={isSubmitting || !editTitle.trim() || !editContent.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '수정중...' : '수정'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {showDeleteConfirm && (
        <ConfirmModal
          message="이 공지사항을 삭제하시겠습니까?"
          confirmText="삭제"
          onConfirm={() => { setShowDeleteConfirm(false); handleDelete(); }}
          onCancel={() => { setShowDeleteConfirm(false); if (!openedFromDetail) setSelectedNotice(null); }}
          danger
        />
      )}
    </div>
  );
}
