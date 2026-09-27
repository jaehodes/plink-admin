'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEscRef } from '../hooks/useEscClose';
import ConfirmModal from '../components/ConfirmModal';
import { FaqItem, FaqCategory } from '../types/faq';
import { createFaq, updateFaq, deleteFaq, createCategory, updateCategory, deleteCategory } from './actions';
import { useToast } from '../components/Toast';

interface FaqClientProps {
  categories: FaqCategory[];
  initialFaqs: FaqItem[];
  initialTotal: number;
  initialError: string | null;
}

export default function FaqClient({
  categories,
  initialFaqs,
  initialTotal,
  initialError,
}: FaqClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const searchParams = useSearchParams();

  // FAQ 상태
  const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [openedFromDetail, setOpenedFromDetail] = useState(false);

  // 카테고리 관리 상태
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatId, setNewCatId] = useState('');
  const [newCatLabel, setNewCatLabel] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatLabel, setEditingCatLabel] = useState('');
  const [showCatDeleteConfirm, setShowCatDeleteConfirm] = useState<string | null>(null);

  // FAQ 등록 폼
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // FAQ 수정 폼
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editCategory, setEditCategory] = useState('');

  // ESC 닫기
  const faqModalRef = useEscRef(() => setSelectedFaq(null));
  const createModalRef = useEscRef(() => setShowCreateModal(false));
  const editModalRef = useEscRef(() => { setShowEditModal(false); if (!openedFromDetail) setSelectedFaq(null); });
  const categoryModalRef = useEscRef(() => setShowCategoryModal(false));

  // 필터/페이지네이션
  const currentCategory = searchParams.get('category') || 'all';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = initialTotal;

  const filterOptions: { id: string; label: string }[] = [
    { id: 'all', label: '전체' },
    ...categories,
  ];

  const getCategoryLabel = (id: string): string => {
    const found = categories.find((c) => c.id === id);
    return found ? found.label : id;
  };

  const getCategoryColor = (id: string): string => {
    const colors: Record<string, string> = {
      mission: 'bg-blue-100 text-blue-700',
      reward: 'bg-emerald-100 text-emerald-700',
      account: 'bg-violet-100 text-violet-700',
      etc: 'bg-slate-100 text-slate-600',
    };
    return colors[id] || 'bg-slate-100 text-slate-600';
  };

  const handleFilterChange = (category: string) => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    router.push(`/faq${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`/faq?${params.toString()}`);
  };

  // FAQ CRUD
  const openEditModal = () => {
    if (!selectedFaq) return;
    setEditQuestion(selectedFaq.question);
    setEditAnswer(selectedFaq.answer);
    setEditCategory(selectedFaq.category);
    setShowEditModal(true);
  };

  const handleCreate = async () => {
    if (!newQuestion.trim() || !newAnswer.trim() || !newCategory) return;
    setIsSubmitting(true);
    const result = await createFaq(newQuestion, newAnswer, newCategory);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setShowCreateModal(false);
      setNewQuestion(''); setNewAnswer(''); setNewCategory('');
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleUpdate = async () => {
    if (!selectedFaq || !editQuestion.trim() || !editAnswer.trim() || !editCategory) return;
    setIsSubmitting(true);
    const result = await updateFaq(selectedFaq.id, editQuestion, editAnswer, editCategory);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setShowEditModal(false); setSelectedFaq(null);
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedFaq) return;
    setIsSubmitting(true);
    const result = await deleteFaq(selectedFaq.id);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setSelectedFaq(null);
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  // 카테고리 CRUD
  const handleCreateCategory = async () => {
    if (!newCatId.trim() || !newCatLabel.trim()) return;
    setIsSubmitting(true);
    const result = await createCategory(newCatId.trim().toLowerCase(), newCatLabel.trim());
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setNewCatId(''); setNewCatLabel('');
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCatLabel.trim()) return;
    setIsSubmitting(true);
    const result = await updateCategory(id, editingCatLabel.trim());
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setEditingCatId(null); setEditingCatLabel('');
      router.refresh();
    } else {
      showToast(result.message, 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setIsSubmitting(true);
    const result = await deleteCategory(id);
    setIsSubmitting(false);
    if (result.success) {
      showToast(result.message);
      setShowCatDeleteConfirm(null);
      router.refresh();
    } else {
      showToast(result.message, 'error');
      setShowCatDeleteConfirm(null);
    }
  };

  // 등록/수정 폼 공통 렌더
  const renderFaqForm = (mode: 'create' | 'edit') => {
    const question = mode === 'create' ? newQuestion : editQuestion;
    const setQuestion = mode === 'create' ? setNewQuestion : setEditQuestion;
    const answer = mode === 'create' ? newAnswer : editAnswer;
    const setAnswer = mode === 'create' ? setNewAnswer : setEditAnswer;
    const category = mode === 'create' ? newCategory : editCategory;
    const setCategory = mode === 'create' ? setNewCategory : setEditCategory;

    return (
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">카테고리</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <button
                key={cat.id ?? i}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-3.5 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                  category === cat.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* 질문 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">질문</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="자주 묻는 질문을 입력하세요"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300 transition-shadow"
          />
        </div>

        {/* 답변 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">답변</label>
            <span className={`text-xs font-medium ${answer.length >= 270 ? 'text-red-500' : 'text-slate-400'}`}>
              {answer.length}/300
            </span>
          </div>
          <textarea
            value={answer}
            onChange={(e) => { if (e.target.value.length <= 300) setAnswer(e.target.value); }}
            placeholder="답변을 입력하세요 (줄바꿈 가능)"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300 transition-shadow"
            rows={7}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FAQ 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            자주 묻는 질문을 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
          >
            카테고리 관리
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            FAQ 등록
          </button>
        </div>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions.map((option, index) => (
          <button
            key={option.id ?? index}
            onClick={() => handleFilterChange(option.id)}
            className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
              currentCategory === option.id
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

      {/* FAQ 목록 - 아코디언 스타일 */}
      {!initialError && (
        <div className="space-y-3">
          {initialFaqs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-16">
              <div className="text-slate-300 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">등록된 FAQ가 없습니다</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                첫 FAQ 등록하기
              </button>
            </div>
          ) : (
            initialFaqs.map((faq, index) => (
                <div
                  key={faq.id ?? index}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-sm"
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-3 mb-2">
                      <span className={`shrink-0 inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg mt-0.5 ${getCategoryColor(faq.category)}`}>
                        {getCategoryLabel(faq.category)}
                      </span>
                      <p className="flex-1 text-sm font-semibold text-slate-800">{faq.question}</p>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap ml-0.5">
                      {faq.answer}
                    </p>
                  </div>
                  <div className="border-t border-slate-100 px-5 py-2.5 flex items-center justify-end gap-2 bg-slate-50/50">
                    <button
                      onClick={() => setSelectedFaq(faq)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      상세보기
                    </button>
                    <button
                      onClick={() => { setSelectedFaq(faq); setOpenedFromDetail(false); openEditModalDirect(faq); }}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => { setSelectedFaq(faq); setOpenedFromDetail(false); setShowDeleteConfirm(true); }}
                      className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      삭제
                    </button>
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

      {/* FAQ 상세 모달 */}
      {selectedFaq && !showEditModal && !showDeleteConfirm && (
        <div ref={faqModalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg ${getCategoryColor(selectedFaq.category)}`}>
                  {getCategoryLabel(selectedFaq.category)}
                </span>
                <span className="text-xs text-slate-400 font-mono">#{selectedFaq.id}</span>
              </div>
              <button onClick={() => setSelectedFaq(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">질문</p>
                <h2 className="text-base font-bold text-slate-800 leading-relaxed">{selectedFaq.question}</h2>
              </div>
              <div className="border-t border-slate-100" />
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">답변</p>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 rounded-xl p-4">
                  {selectedFaq.answer}
                </div>
              </div>
            </div>

            {/* 하단 */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <button
                onClick={() => setSelectedFaq(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                닫기
              </button>
              <button
                onClick={() => { setOpenedFromDetail(true); openEditModal(); }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                수정
              </button>
              <button
                onClick={() => { setOpenedFromDetail(true); setShowDeleteConfirm(true); }}
                className="px-4 py-2.5 text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ 등록 모달 */}
      {showCreateModal && (
        <div ref={createModalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">FAQ 등록</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {renderFaqForm('create')}

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !newQuestion.trim() || !newAnswer.trim() || !newCategory}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '등록중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ 수정 모달 */}
      {showEditModal && selectedFaq && (
        <div ref={editModalRef} tabIndex={-1} className="fixed inset-0 z-[60] flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-800">FAQ 수정</h3>
                <span className="text-xs text-slate-400 font-mono">#{selectedFaq.id}</span>
              </div>
              <button onClick={() => { setShowEditModal(false); if (!openedFromDetail) setSelectedFaq(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {renderFaqForm('edit')}

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <button
                onClick={() => { setShowEditModal(false); if (!openedFromDetail) setSelectedFaq(null); }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUpdate}
                disabled={isSubmitting || !editQuestion.trim() || !editAnswer.trim() || !editCategory}
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
          message="이 FAQ를 삭제하시겠습니까?"
          confirmText="삭제"
          onConfirm={() => { setShowDeleteConfirm(false); handleDelete(); }}
          onCancel={() => { setShowDeleteConfirm(false); if (!openedFromDetail) setSelectedFaq(null); }}
          danger
        />
      )}

      {/* 카테고리 삭제 확인 */}
      {showCatDeleteConfirm && (
        <ConfirmModal
          message="이 카테고리를 삭제하시겠습니까?"
          confirmText="삭제"
          onConfirm={() => handleDeleteCategory(showCatDeleteConfirm)}
          onCancel={() => setShowCatDeleteConfirm(null)}
          danger
        />
      )}

      {/* 카테고리 관리 모달 */}
      {showCategoryModal && (
        <div ref={categoryModalRef} tabIndex={-1} className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">카테고리 관리</h3>
                <p className="text-xs text-slate-400 mt-0.5">{categories.length}개 카테고리</p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {/* 기존 카테고리 목록 */}
              {categories.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">카테고리가 없습니다</p>
              ) : (
                categories.map((cat, index) => (
                  <div key={cat.id ?? index} className="group">
                    {editingCatId === cat.id ? (
                      <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-200">
                        <span className="inline-flex text-xs text-blue-500 font-mono bg-blue-100 px-2 py-0.5 rounded">{cat.id}</span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingCatLabel}
                            onChange={(e) => setEditingCatLabel(e.target.value)}
                            className="flex-1 px-3 py-2.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateCategory(cat.id); if (e.key === 'Escape') { setEditingCatId(null); setEditingCatLabel(''); } }}
                          />
                          <button
                            onClick={() => handleUpdateCategory(cat.id)}
                            disabled={isSubmitting || !editingCatLabel.trim()}
                            className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => { setEditingCatId(null); setEditingCatLabel(''); }}
                            className="px-3 py-2.5 text-xs font-medium text-slate-500 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
                        <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded shrink-0">{cat.id}</span>
                        <span className="flex-1 text-sm font-medium text-slate-700">{cat.label}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingCatId(cat.id); setEditingCatLabel(cat.label); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="수정"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowCatDeleteConfirm(cat.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* 새 카테고리 추가 (하단 고정) */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
              <p className="text-xs font-semibold text-slate-500">새 카테고리</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatId}
                  onChange={(e) => setNewCatId(e.target.value.replace(/[^a-z0-9]/g, ''))}
                  placeholder="ID (영문)"
                  className="w-28 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300 bg-white"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory(); }}
                />
                <input
                  type="text"
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  placeholder="표시명"
                  className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300 bg-white"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCategory(); }}
                />
                <button
                  onClick={handleCreateCategory}
                  disabled={isSubmitting || !newCatId.trim() || !newCatLabel.trim()}
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  추가
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 아코디언에서 직접 수정 모달 열기
  function openEditModalDirect(faq: FaqItem) {
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
    setEditCategory(faq.category);
    setShowEditModal(true);
  }
}
