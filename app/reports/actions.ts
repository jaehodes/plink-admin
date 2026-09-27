'use server';

import { externalApiGet, externalApiPost } from '../lib/external-api';
import { DecodeBase64, EncodeBase64 } from '../utils/base64Utils';
import { MissionReportDetail, MissionReportDetailResponse } from '../types/mission-report';

interface ApiResponse { ret: number; message: string; }

export interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * 상세 문의 조회
 */
export async function getReportDetail(reportId: number): Promise<{ success: boolean; detail: MissionReportDetail | null; message: string }> {
  const response = await externalApiGet<MissionReportDetailResponse>(
    `/api/admin-app/mission-reports/${reportId}`,
  );

  if (response.error) return { success: false, detail: null, message: response.error };
  if (response.data?.ret === 0 && response.data.data) {
    const d = response.data.data;
    const decoded: MissionReportDetail = {
      ...d,
      reason: DecodeBase64(d.reason),
      submittedValue: d.submittedValue ? DecodeBase64(d.submittedValue) : d.submittedValue,
      adminNote: d.adminNote ? DecodeBase64(d.adminNote) : d.adminNote,
      uname: d.uname ? DecodeBase64(d.uname) : d.uname,
      orderer: d.orderer ? DecodeBase64(d.orderer) : d.orderer,
      mname: d.mname ? DecodeBase64(d.mname) : d.mname,
      rewardName: d.rewardName ? DecodeBase64(d.rewardName) : d.rewardName,
      placeName: d.placeName ? DecodeBase64(d.placeName) : d.placeName,
      resolvedBy: d.resolvedBy ? DecodeBase64(d.resolvedBy) : d.resolvedBy,
      quiz: d.quiz ? { ...d.quiz, question: DecodeBase64(d.quiz.question), answer: DecodeBase64(d.quiz.answer), reason: d.quiz.reason ? DecodeBase64(d.quiz.reason) : d.quiz.reason } : d.quiz,
      carParking: d.carParking ? { ...d.carParking, parkingAnswer: DecodeBase64(d.carParking.parkingAnswer), reason: d.carParking.reason ? DecodeBase64(d.carParking.reason) : d.carParking.reason } : d.carParking,
    };
    return { success: true, detail: decoded, message: '' };
  }
  return { success: false, detail: null, message: '상세 조회에 실패했습니다.' };
}

/**
 * 문의 처리 완료
 */
export async function resolveReport(
  reportId: number,
  adminNote: string,
  rewardRate?: number,
): Promise<ActionResult> {
  const response = await externalApiPost<ApiResponse>(
    `/api/admin-app/mission-reports/${reportId}/resolve`,
    { adminNote: EncodeBase64(adminNote), rewardRate: rewardRate || 0 },
    { saveRefreshedToken: true }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || '처리가 완료되었습니다.' };
  return { success: false, message: response.data?.message || '처리 완료에 실패했습니다.' };
}

/**
 * 미션 문제 활성화/비활성화 토글
 */
export async function toggleMissionActive(
  type: 'quiz' | 'parking',
  id: number,
  isActive: boolean,
  reason?: string,
): Promise<ActionResult> {
  const label = type === 'quiz' ? '퀴즈' : '주차장 문제';

  const body: Record<string, unknown> = { type, id, isActive };
  if (!isActive && reason) {
    body.reason = EncodeBase64(reason);
  }

  const response = await externalApiPost<ApiResponse>(
    '/api/admin-app/missions/toggle-active',
    body,
    { saveRefreshedToken: true }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || `${label}가 ${isActive ? '활성화' : '비활성화'}되었습니다.` };
  return { success: false, message: response.data?.message || `${label} 상태 변경에 실패했습니다.` };
}
