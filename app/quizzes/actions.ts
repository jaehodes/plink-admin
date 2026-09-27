'use server';

import { externalApiGet, externalApiPost } from '../lib/external-api';
import { EncodeBase64 } from '../utils/base64Utils';
import { MissionProblemType, QuizzesResponse, ParkingResponse } from '../types/quiz';

interface ApiResponse {
  ret: number;
  message: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

/**
 * 퀴즈/주차장 문제 일괄 활성화/비활성화
 */
export async function batchToggleMissionProblemActive(
  type: MissionProblemType,
  ids: number[],
  isActive: boolean,
  reason?: string,
): Promise<ActionResult> {
  const label = type === 'quiz' ? '퀴즈' : '주차장 문제';
  let successCount = 0;
  let failCount = 0;

  for (const id of ids) {
    const body: Record<string, unknown> = { type, id, isActive };
    if (!isActive && reason) {
      body.reason = EncodeBase64(reason);
    }

    const response = await externalApiPost<ApiResponse>(
      '/api/admin-app/missions/toggle-active',
      body
    );

    if (response.data?.ret === 0) {
      successCount++;
    } else {
      failCount++;
    }
  }

  if (failCount === 0) {
    return { success: true, message: `${label} ${successCount}개가 ${isActive ? '활성화' : '비활성화'}되었습니다.` };
  }
  return { success: successCount > 0, message: `${label} ${successCount}개 성공, ${failCount}개 실패` };
}

/**
 * 검색 조건에 맞는 전체 ID 목록 조회 (페이지네이션 없이)
 */
export async function fetchAllFilteredIds(
  mode: 'quiz' | 'parking',
  params: {
    tab?: string;
    isActive?: string;
    searchType?: string;
    searchWords?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  },
): Promise<{ activeIds: number[]; inactiveIds: number[] }> {
  const queryParams = new URLSearchParams();
  if (mode === 'quiz' && params.tab && params.tab !== 'all') {
    queryParams.set('tab', params.tab);
  }
  if (params.isActive && params.isActive !== 'all') {
    queryParams.set('isActive', params.isActive);
  }
  if (params.searchType && params.searchWords) {
    queryParams.set('searchType', params.searchType);
    queryParams.set('searchWords', EncodeBase64(params.searchWords));
  }
  if (params.period) {
    queryParams.set('period', params.period);
    if (params.period === 'custom' && params.startDate && params.endDate) {
      queryParams.set('startDate', params.startDate);
      queryParams.set('endDate', params.endDate);
    }
  }
  queryParams.set('limit', '100');

  const endpoint = mode === 'quiz' ? '/api/admin-app/quizzes' : '/api/admin-app/parkings';
  const allItems: { id: number; isActive: boolean }[] = [];
  let page = 1;
  let total = 0;

  do {
    queryParams.set('page', String(page));
    const response = mode === 'quiz'
      ? await externalApiGet<QuizzesResponse>(`${endpoint}?${queryParams.toString()}`)
      : await externalApiGet<ParkingResponse>(`${endpoint}?${queryParams.toString()}`);

    const items = response.data?.data || [];
    total = response.data?.total || 0;
    allItems.push(...items.map(item => ({ id: item.id, isActive: item.isActive })));
    page++;
  } while (allItems.length < total);

  const allIds = allItems.map(item => item.id);
  return {
    activeIds: params.isActive === 'true' ? allIds : allItems.filter(item => item.isActive).map(item => item.id),
    inactiveIds: params.isActive === 'false' ? allIds : allItems.filter(item => !item.isActive).map(item => item.id),
  };
}

/**
 * 퀴즈/주차장 문제 활성화/비활성화
 */
export async function toggleMissionProblemActive(
  type: MissionProblemType,
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
    body
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: `${label}가 ${isActive ? '활성화' : '비활성화'}되었습니다.` };
  return { success: false, message: response.data?.message || `${label} 상태 변경에 실패했습니다.` };
}
