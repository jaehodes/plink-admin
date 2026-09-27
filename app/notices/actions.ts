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
 * 공지사항 등록
 */
export async function createNotice(
  title: string,
  content: string,
  isImportant: boolean,
): Promise<ActionResult> {
  const response = await externalApiPost<ApiResponse>(
    '/api/admin-app/notices',
    { title: EncodeBase64(title), content: EncodeBase64(content), isImportant },
    { saveRefreshedToken: true }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || '공지사항이 등록되었습니다.' };
  return { success: false, message: response.data?.message || '공지사항 등록에 실패했습니다.' };
}

/**
 * 공지사항 수정
 */
export async function updateNotice(
  noticeId: number,
  title: string,
  content: string,
  isImportant: boolean,
): Promise<ActionResult> {
  const response = await externalApiPut<ApiResponse>(
    `/api/admin-app/notices/${noticeId}`,
    { title: EncodeBase64(title), content: EncodeBase64(content), isImportant },
    { saveRefreshedToken: true }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || '공지사항이 수정되었습니다.' };
  return { success: false, message: response.data?.message || '공지사항 수정에 실패했습니다.' };
}

/**
 * 공지사항 삭제
 */
export async function deleteNotice(noticeId: number): Promise<ActionResult> {
  const response = await externalApiDelete<ApiResponse>(
    `/api/admin-app/notices/${noticeId}`,
    { saveRefreshedToken: true }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || '공지사항이 삭제되었습니다.' };
  return { success: false, message: response.data?.message || '공지사항 삭제에 실패했습니다.' };
}

/**
 * 공지사항 활성화/비활성화 토글
 */
export async function toggleNoticeActive(noticeId: number, isActive: boolean): Promise<ActionResult> {
  const response = await externalApiPut<ApiResponse>(
    `/api/admin-app/notices/${noticeId}/active`,
    { isActive },
    { saveRefreshedToken: true }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || (isActive ? '활성화되었습니다.' : '비활성화되었습니다.') };
  return { success: false, message: response.data?.message || '상태 변경에 실패했습니다.' };
}
