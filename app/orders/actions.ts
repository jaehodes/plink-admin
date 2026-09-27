'use server';

import { externalApiGet, externalApiPost } from '../lib/external-api';
import { EncodeBase64 } from '../utils/base64Utils';
import { Order } from '../types/order';

interface OrderDetailApiResponse {
  ret: number;
  order: Order;
}

interface CancelApiResponse {
  ret: number;
  message: string;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

export interface OrderDetailResult {
  success: boolean;
  order: Order | null;
  error: string | null;
}

interface OrdersApiResponse {
  ret: number;
  orders: Order[];
  total: number;
}

export interface OrdersResult {
  success: boolean;
  orders: Order[];
  total: number;
  error: string | null;
}

/**
 * 발주 목록 조회 Server Action
 */
export async function getOrders(params: { status?: string; type?: string; page?: string }): Promise<OrdersResult> {
  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') queryParams.set('status', params.status);
  if (params.type && params.type !== 'all') queryParams.set('type', params.type);
  queryParams.set('page', params.page || '1');
  queryParams.set('limit', '20');

  const response = await externalApiGet<OrdersApiResponse>(
    `/api/admin-app/orders?${queryParams.toString()}`
  );

  if (response.error) return { success: false, orders: [], total: 0, error: response.error };
  if (response.data?.ret === 0) return { success: true, orders: response.data.orders || [], total: response.data.total || 0, error: null };
  return { success: false, orders: [], total: 0, error: '목록을 불러올 수 없습니다.' };
}

/**
 * 발주 상세 조회 Server Action
 */
export async function getOrderDetail(orderId: string): Promise<OrderDetailResult> {
  const response = await externalApiGet<OrderDetailApiResponse>(
    `/api/admin-app/orders/${orderId}`
  );

  if (response.error) {
    return { success: false, order: null, error: response.error };
  }

  if (response.data && response.data.ret === 0) {
    return { success: true, order: response.data.order, error: null };
  }

  return { success: false, order: null, error: '발주 정보를 불러올 수 없습니다.' };
}

/**
 * 발주 취소 Server Action
 */
export async function cancelOrder(orderId: string): Promise<ActionResult> {
  const response = await externalApiPost<CancelApiResponse>(
    `/api/admin-app/orders/${orderId}/cancel`,
    {}
  );

  if (response.error) {
    return { success: false, message: response.error };
  }

  if (response.data && response.data.ret === 0) {
    return { success: true, message: response.data.message || '발주가 취소되었습니다.' };
  }

  return { success: false, message: response.data?.message || '발주 취소에 실패했습니다.' };
}

/**
 * 발주 썸네일 변경 Server Action
 */
export async function uploadThumbnail(orderId: string, thumbnail: string): Promise<ActionResult> {
  const response = await externalApiPost<CancelApiResponse>(
    `/api/admin-app/orders/${orderId}/thumbnail`,
    { thumbnail }
  );

  if (response.error) {
    return { success: false, message: response.error };
  }

  if (response.data && response.data.ret === 0) {
    return { success: true, message: response.data.message || '썸네일이 변경되었습니다.' };
  }

  return { success: false, message: response.data?.message || '썸네일 변경에 실패했습니다.' };
}

/**
 * 발주 퀴즈 교체 Server Action
 */
export async function replaceQuizzes(
  orderId: string,
  quizzes: { tab: string; question: string; answer: string }[],
): Promise<ActionResult> {
  const encoded = quizzes.map(q => ({
    tab: q.tab,
    question: EncodeBase64(q.question),
    answer: EncodeBase64(q.answer),
  }));

  const response = await externalApiPost<CancelApiResponse>(
    `/api/admin-app/orders/${orderId}/quizzes/replace`,
    { quizzes: encoded }
  );

  if (response.error) return { success: false, message: response.error };
  if (response.data?.ret === 0) return { success: true, message: response.data.message || '퀴즈가 교체되었습니다.' };
  return { success: false, message: response.data?.message || '퀴즈 교체에 실패했습니다.' };
}
