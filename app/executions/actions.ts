'use server';

import { externalApiGet } from '../lib/external-api';
import { ExecutionDetail } from '../types/execution';

interface ExecutionDetailApiResponse {
  ret: number;
  execution: ExecutionDetail;
}

export interface ExecutionDetailResult {
  success: boolean;
  execution: ExecutionDetail | null;
  error: string | null;
}

/**
 * 수행 상세 조회 Server Action
 */
export async function getExecutionDetail(executionId: string): Promise<ExecutionDetailResult> {
  const response = await externalApiGet<ExecutionDetailApiResponse>(
    `/api/admin-app/executions/${executionId}`
  );

  if (response.error) {
    return { success: false, execution: null, error: response.error };
  }

  if (response.data && response.data.ret === 0) {
    return { success: true, execution: response.data.execution, error: null };
  }

  return { success: false, execution: null, error: '수행 정보를 불러올 수 없습니다.' };
}
