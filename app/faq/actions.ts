'use server';

import { externalApiPost, externalApiPut, externalApiDelete } from '../lib/external-api';
import { EncodeBase64 } from '../utils/base64Utils';

interface ApiResponse {
  ret: number;
  message: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * 카테고리 등록
 */
export async function createCategory(
  id: string,
  label: string,
): Promise<ActionResult> {
  const response = await externalApiPost<ApiResponse>(
    '/api/admin-app/faq/categories',
    { id, label }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || '카테고리가 등록되었습니다.' };
  return { success: false, message: response.data?.message || '카테고리 등록에 실패했습니다.' };
}

/**
 * 카테고리 수정
 */
export async function updateCategory(
  id: string,
  label: string,
): Promise<ActionResult> {
  const response = await externalApiPut<ApiResponse>(
    `/api/admin-app/faq/categories/${id}`,
    { label }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || '카테고리가 수정되었습니다.' };
  return { success: false, message: response.data?.message || '카테고리 수정에 실패했습니다.' };
}

/**
 * 카테고리 삭제
 */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const response = await externalApiDelete<ApiResponse>(
    `/api/admin-app/faq/categories/${encodeURIComponent(id)}`
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || '카테고리가 삭제되었습니다.' };
  return { success: false, message: response.data?.message || '카테고리 삭제에 실패했습니다.' };
}

/**
 * FAQ 등록
 */
export async function createFaq(
  question: string,
  answer: string,
  category: string,
): Promise<ActionResult> {
  const response = await externalApiPost<ApiResponse>(
    '/api/admin-app/faq',
    { question: EncodeBase64(question), answer: EncodeBase64(answer), category }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || 'FAQ가 등록되었습니다.' };
  return { success: false, message: response.data?.message || 'FAQ 등록에 실패했습니다.' };
}

/**
 * FAQ 수정
 */
export async function updateFaq(
  faqId: number,
  question: string,
  answer: string,
  category: string,
): Promise<ActionResult> {
  const response = await externalApiPut<ApiResponse>(
    `/api/admin-app/faq/${faqId}`,
    { question: EncodeBase64(question), answer: EncodeBase64(answer), category }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || 'FAQ가 수정되었습니다.' };
  return { success: false, message: response.data?.message || 'FAQ 수정에 실패했습니다.' };
}

/**
 * FAQ 삭제
 */
export async function deleteFaq(faqId: number): Promise<ActionResult> {
  const response = await externalApiDelete<ApiResponse>(
    `/api/admin-app/faq/${faqId}`
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || 'FAQ가 삭제되었습니다.' };
  return { success: false, message: response.data?.message || 'FAQ 삭제에 실패했습니다.' };
}
