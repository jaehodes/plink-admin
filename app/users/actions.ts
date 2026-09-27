'use server';

import { externalApiGet, externalApiPost } from '../lib/external-api';
import { DecodeBase64, EncodeBase64 } from '../utils/base64Utils';
import { UserNotification } from '../types/user';

interface ApiResponse { ret: number; message: string; }
interface UserStatusResponse { ret: number; isBlocked: boolean; }
interface NotificationsResponse { ret: number; data: UserNotification[]; total: number; }

export interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * 회원 상태 조회 (차단 여부)
 */
export async function getUserStatus(uid: string): Promise<{ success: boolean; isBlocked: boolean; message: string }> {
  const response = await externalApiGet<UserStatusResponse>(
    `/api/admin-app/users/status?uid=${encodeURIComponent(uid)}`,
  );

  if (response.error) return { success: false, isBlocked: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, isBlocked: response.data.isBlocked, message: '' };
  return { success: false, isBlocked: false, message: '상태 조회에 실패했습니다.' };
}

/**
 * 회원 차단/해제 토글
 */
export async function toggleUserBlock(uid: string, isBlocked: boolean): Promise<ActionResult> {
  const response = await externalApiPost<ApiResponse>(
    '/api/admin-app/users/toggle-block',
    { uid, isBlocked },
    { saveRefreshedToken: true }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || (isBlocked ? '차단되었습니다.' : '차단이 해제되었습니다.') };
  return { success: false, message: response.data?.message || '상태 변경에 실패했습니다.' };
}

/**
 * 회원 메모 저장
 */
export async function updateUserMemo(uid: string, memo: string): Promise<ActionResult> {
  const response = await externalApiPost<ApiResponse>(
    '/api/admin-app/users/memo',
    { uid, memo: EncodeBase64(memo) },
    { saveRefreshedToken: true }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || '메모가 저장되었습니다.' };
  return { success: false, message: response.data?.message || '메모 저장에 실패했습니다.' };
}

/**
 * 회원 알림 내역 조회
 */
export async function getUserNotifications(uid: string): Promise<{ success: boolean; notifications: UserNotification[]; message: string }> {
  const response = await externalApiGet<NotificationsResponse>(
    `/api/admin-app/users/${encodeURIComponent(uid)}/notifications`,
  );

  if (response.error) return { success: false, notifications: [], message: response.error };
  if (response.data?.ret === 0) {
    const decoded = (response.data.data || []).map((n: UserNotification) => ({
      ...n,
      title: DecodeBase64(n.title),
      message: DecodeBase64(n.message),
      sentBy: n.sentBy ? DecodeBase64(n.sentBy) : n.sentBy,
    }));
    return { success: true, notifications: decoded, message: '' };
  }
  return { success: false, notifications: [], message: '알림 내역 조회에 실패했습니다.' };
}

/**
 * 회원에게 알림 전송
 */
export async function sendNotification(uid: string, title: string, message: string): Promise<ActionResult> {
  const response = await externalApiPost<ApiResponse>(
    '/api/admin-app/users/send-notification',
    { uid, title: EncodeBase64(title), message: EncodeBase64(message) },
    { saveRefreshedToken: true }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || '알림이 전송되었습니다.' };
  return { success: false, message: response.data?.message || '알림 전송에 실패했습니다.' };
}
