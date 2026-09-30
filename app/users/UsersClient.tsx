'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEscRef } from '../hooks/useEscClose';
import ConfirmModal from '../components/ConfirmModal';
import { User, UserNotification, USER_BLOCKED_LABELS, USER_BLOCKED_COLORS, APP_USER_KIND_LABELS } from '../types/user';
import { toggleUserBlock, getUserNotifications, sendNotification, updateUserMemo } from './actions';
import { useToast } from '../components/Toast';

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

interface UsersClientProps {
  initialUsers: User[];
  initialTotal: number;
  initialError: string | null;
}

export default function UsersClient({
  initialUsers,
  initialTotal,
  initialError,
}: UsersClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalTab, setModalTab] = useState<'info' | 'notifications'>('info');
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [notiTitle, setNotiTitle] = useState('');
  const [notiMessage, setNotiMessage] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [isEditingMemo, setIsEditingMemo] = useState(false);

  const userModalRef = useEscRef(() => setSelectedUser(null));
  const sendModalRef = useEscRef(() => setShowSendModal(false));

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentStatus = searchParams.get('status') || 'all';
  const totalPages = Math.ceil(initialTotal / 10);
  const currentSearchType = searchParams.get('searchType') || '';
  const currentSearchWords = searchParams.get('searchWords') || '';
  const isSearchMode = !!currentSearchType && !!currentSearchWords;

  const [searchType, setSearchType] = useState(currentSearchType || 'uname');
  const [searchWords, setSearchWords] = useState(currentSearchWords);

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    router.push(`/users?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/users?${params.toString()}`);
  };

  const handleSearch = () => {
    if (!searchWords.trim()) return;
    const params = new URLSearchParams();
    if (currentStatus !== 'all') params.set('status', currentStatus);
    params.set('searchType', searchType);
    params.set('searchWords', searchWords.trim());
    router.push(`/users?${params.toString()}`);
  };

  const handleClearSearch = () => {
    setSearchWords('');
    router.push('/users');
  };

  const handleLoadNotifications = async (uid: string) => {
    setNotificationsLoading(true);
    const result = await getUserNotifications(uid);
    setNotificationsLoading(false);
    if (result.success) setNotifications(result.notifications);
    else showToast(result.message, 'error');
  };

  const handleSendNotification = async () => {
    if (!selectedUser || !notiTitle.trim() || !notiMessage.trim()) return;
    setIsSubmitting(true);
    const result = await sendNotification(selectedUser.uid, notiTitle, notiMessage);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setShowSendModal(false);
      setNotiTitle(''); setNotiMessage('');
      handleLoadNotifications(selectedUser.uid);
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleSaveMemo = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    const result = await updateUserMemo(selectedUser.uid, editMemo);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setSelectedUser({ ...selectedUser, memo: editMemo });
      setIsEditingMemo(false);
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleToggleBlock = async () => {
    if (!selectedUser) return;
    const nextBlocked = !selectedUser.isBlocked;
    setIsSubmitting(true);
    const result = await toggleUserBlock(selectedUser.uid, nextBlocked);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setSelectedUser({ ...selectedUser, isBlocked: nextBlocked });
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const openUserModal = (user: User) => {
    setSelectedUser(user);
    setModalTab('info');
    setNotifications([]);
    setEditMemo(user.memo || '');
    setIsEditingMemo(false);
  };

  const statusFilters = [
    { key: 'all', label: '전체' },
    { key: 'normal', label: '정상' },
    { key: 'blocked', label: '정지' },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">회원관리</h1>
        <p className="text-sm text-gray-500 mt-1">회원 정보를 조회하고 관리합니다</p>
      </div>

      {/* 필터 + 검색 통합 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {/* 상태 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((opt) => (
            <button
              key={opt.key}
              onClick={() => handleStatusChange(opt.key)}
              className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                currentStatus === opt.key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {opt.label}
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
            <option value="uid">ID</option>
            <option value="uname">닉네임</option>
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

      </div>

      {/* 에러 */}
      {initialError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {initialError}
        </div>
      )}

      {/* 회원 목록 */}
      {!initialError && (
        <div className="space-y-3">
          {initialUsers.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
              <div className="text-slate-300 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">
                {isSearchMode ? '검색 결과가 없습니다' : '회원이 없습니다'}
              </p>
            </div>
          ) : (
            <>
              {/* 카드 목록 */}
              <div className="grid gap-3">
                {initialUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => openUserModal(user)}
                    className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm hover:border-slate-300 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${USER_BLOCKED_COLORS[String(user.isBlocked)] || 'bg-gray-100 text-gray-800'}`}>
                            {USER_BLOCKED_LABELS[String(user.isBlocked)] || '알수없음'}
                          </span>
                          <span className="text-sm font-bold text-slate-800 truncate">{user.uname}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="font-mono">{user.uid}</span>
                          <span className="text-slate-300">|</span>
                          <span>{user.affiliation}</span>
                        </div>
                      </div>

                      <svg className="w-4 h-4 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

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
            </>
          )}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedUser && (
        <div ref={userModalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">

            {/* 헤더 - 유저 프로필 */}
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-800">{selectedUser.uname}</span>
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${USER_BLOCKED_COLORS[String(selectedUser.isBlocked)] || 'bg-gray-100 text-gray-800'}`}>
                      {USER_BLOCKED_LABELS[String(selectedUser.isBlocked)] || '알수없음'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedUser.uid}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 탭 */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setModalTab('info')}
                  className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                    modalTab === 'info' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  회원정보
                </button>
                <button
                  onClick={() => { setModalTab('notifications'); handleLoadNotifications(selectedUser.uid); }}
                  className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                    modalTab === 'notifications' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  알림내역
                </button>
              </div>
            </div>

            {/* 본문 - 회원정보 */}
            {modalTab === 'info' && (
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* 기본 정보 카드 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3.5">
                    <p className="text-xs text-slate-400 mb-1">구분</p>
                    <p className="text-sm font-semibold text-slate-700">{APP_USER_KIND_LABELS[selectedUser.kind] ?? selectedUser.kind}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3.5">
                    <p className="text-xs text-slate-400 mb-1">소속</p>
                    <p className="text-sm font-semibold text-slate-700">{selectedUser.affiliation}</p>
                  </div>
                </div>

                {/* 메모 */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-semibold text-slate-600">관리자 메모</p>
                    {!isEditingMemo ? (
                      <button
                        onClick={() => { setEditMemo(selectedUser.memo || ''); setIsEditingMemo(true); }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        {selectedUser.memo ? '수정' : '작성'}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsEditingMemo(false)}
                          className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          onClick={handleSaveMemo}
                          disabled={isSubmitting}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {isSubmitting ? '저장중...' : '저장'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    {isEditingMemo ? (
                      <textarea
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        placeholder="메모를 입력하세요"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
                        rows={3}
                        autoFocus
                      />
                    ) : (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[2rem]">
                        {selectedUser.memo || <span className="text-slate-300">메모 없음</span>}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 본문 - 알림내역 */}
            {modalTab === 'notifications' && (
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 max-h-[360px]">
                {notificationsLoading ? (
                  <div className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-400">불러오는 중...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p className="text-sm text-slate-400">알림 내역이 없습니다</p>
                  </div>
                ) : (
                  notifications.map((noti) => (
                    <div key={noti.id} className={`rounded-xl border p-4 transition-colors ${
                      noti.isRead ? 'bg-white border-slate-200' : 'bg-blue-50/70 border-blue-200'
                    }`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className={`text-sm font-bold ${noti.isRead ? 'text-slate-700' : 'text-blue-800'}`}>{noti.title}</p>
                        <span className={`shrink-0 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          noti.isRead ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {noti.isRead ? '읽음' : '안읽음'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed mb-2 whitespace-pre-wrap">{noti.message}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        {noti.sentBy && <span className="font-medium">{noti.sentBy}</span>}
                        {noti.sentBy && <span>·</span>}
                        <span>{formatDateTime(noti.createdAt)}</span>
                        {noti.readAt && (
                          <>
                            <span>·</span>
                            <span>읽음 {formatDateTime(noti.readAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                닫기
              </button>
              {modalTab === 'info' && (
                <button
                  onClick={() => {
                    if (!selectedUser.isBlocked) setShowBlockConfirm(true);
                    else handleToggleBlock();
                  }}
                  disabled={isSubmitting}
                  className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 ${
                    !selectedUser.isBlocked
                      ? 'text-red-600 bg-red-50 hover:bg-red-100'
                      : 'text-green-600 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  {isSubmitting ? '처리중...' : selectedUser.isBlocked ? '차단 해제' : '차단'}
                </button>
              )}
              {modalTab === 'notifications' && (
                <button
                  onClick={() => setShowSendModal(true)}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  알림 보내기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 알림 전송 모달 */}
      {showSendModal && selectedUser && (
        <div ref={sendModalRef} tabIndex={-1} className="fixed inset-0 z-[60] flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">

            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">알림 보내기</h3>
              <button onClick={() => setShowSendModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-slate-700">{selectedUser.uname}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedUser.uid}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">제목</label>
                <input
                  type="text"
                  value={notiTitle}
                  onChange={(e) => setNotiTitle(e.target.value)}
                  placeholder="알림 제목을 입력하세요"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">내용</label>
                  <span className={`text-xs font-medium ${notiMessage.length >= 270 ? 'text-red-500' : 'text-slate-400'}`}>
                    {notiMessage.length}/300
                  </span>
                </div>
                <textarea
                  value={notiMessage}
                  onChange={(e) => { if (e.target.value.length <= 300) setNotiMessage(e.target.value); }}
                  placeholder="알림 내용을 입력하세요 (줄바꿈 가능)"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
                  rows={5}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <button
                onClick={() => setShowSendModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSendNotification}
                disabled={isSubmitting || !notiTitle.trim() || !notiMessage.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '전송중...' : '전송'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 차단 확인 모달 */}
      {showBlockConfirm && selectedUser && (
        <ConfirmModal
          message={`${selectedUser.uname}님을 차단하시겠습니까?`}
          confirmText="차단"
          onConfirm={() => { setShowBlockConfirm(false); handleToggleBlock(); }}
          onCancel={() => setShowBlockConfirm(false)}
          danger
        />
      )}
    </div>
  );
}
