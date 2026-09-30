'use server';

import { externalApiGet } from '../lib/external-api';
import type { Pcbang, PcbangAgent, StatsPcbangItem, StatsPeriodItem } from '../types/pcbang';

/**
 * PC방 조회·통계 Server Actions (plink-api /api/admin-app/pcbangs 등, docs/admin-app/pcbangs-api.md)
 * 읽기 전용이다. 날짜는 KST YYYY-MM-DD.
 */

export interface PcbangResult<T> {
  ok: boolean;
  status: number;
  error: string | null;
  data: T | null;
}

async function get<T>(endpoint: string, params?: Record<string, string>, fallback = '요청에 실패했습니다.'): Promise<PcbangResult<T>> {
  const res = await externalApiGet<T>(endpoint, params);
  if (res.error || !res.data) return { ok: false, status: res.status, error: res.error || fallback, data: null };
  return { ok: true, status: res.status, error: null, data: res.data };
}

const pcbangPath = (pcbangId: string) => `/api/admin-app/pcbangs/${encodeURIComponent(pcbangId)}`;

export async function getPcbangs(): Promise<PcbangResult<Pcbang[]>> {
  const r = await get<{ pcbangs: Pcbang[] }>('/api/admin-app/pcbangs', undefined, 'PC방 목록을 불러오지 못했습니다.');
  return { ...r, data: r.data?.pcbangs ?? null };
}

export async function getPcbang(pcbangId: string): Promise<PcbangResult<Pcbang>> {
  const r = await get<{ pcbang: Pcbang }>(pcbangPath(pcbangId), undefined, 'PC방을 불러오지 못했습니다.');
  return { ...r, data: r.data?.pcbang ?? null };
}

export async function getPcbangAgents(pcbangId: string): Promise<PcbangResult<PcbangAgent[]>> {
  const r = await get<{ agents: PcbangAgent[] }>(`${pcbangPath(pcbangId)}/agents`, undefined, '에이전트 목록을 불러오지 못했습니다.');
  return { ...r, data: r.data?.agents ?? null };
}

/** 한 PC방의 날짜별 수행 수. agentId를 주면 그 에이전트만 센다 */
export async function getPcbangDailyStats(
  pcbangId: string,
  { from, to, agentId }: { from: string; to: string; agentId?: string },
): Promise<PcbangResult<StatsPeriodItem[]>> {
  const params: Record<string, string> = agentId ? { type: 'agent', agent_id: agentId, from, to } : { type: 'period', from, to };
  const r = await get<{ stats: StatsPeriodItem[] }>(`${pcbangPath(pcbangId)}/stats`, params, '통계를 불러오지 못했습니다.');
  return { ...r, data: r.data?.stats ?? null };
}

/** 전체 PC방 합계의 날짜별 수행 수 */
export async function getAllPcbangsDailyStats({ from, to }: { from: string; to: string }): Promise<PcbangResult<StatsPeriodItem[]>> {
  const r = await get<{ stats: StatsPeriodItem[] }>('/api/admin-app/pcbang-stats', { type: 'period', from, to }, '통계를 불러오지 못했습니다.');
  return { ...r, data: r.data?.stats ?? null };
}

/** PC방별 기간 합계 (count 내림차순, 수행 0인 PC방 포함) */
export async function getPcbangTotals({ from, to }: { from: string; to: string }): Promise<PcbangResult<StatsPcbangItem[]>> {
  const r = await get<{ stats: StatsPcbangItem[] }>('/api/admin-app/pcbang-stats', { type: 'pcbang', from, to }, '통계를 불러오지 못했습니다.');
  return { ...r, data: r.data?.stats ?? null };
}
