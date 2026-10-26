'use server';

import { externalApiGet } from '../lib/external-api';
import type { Place } from '../types/place';

/** 플레이스 조회 Server Actions (plink-api /api/admin-app/places, docs/admin-app/places-api.md). 읽기 전용이다. */

export interface PlaceResult<T> {
  ok: boolean;
  status: number;
  error: string | null;
  data: T | null;
}

export async function getPlaces({ page, limit }: { page: number; limit: number }): Promise<PlaceResult<{ places: Place[]; total: number }>> {
  const res = await externalApiGet<{ places: Place[]; total: number }>('/api/admin-app/places', { page: String(page), limit: String(limit) });
  if (res.error || !res.data) return { ok: false, status: res.status, error: res.error || '플레이스 목록을 불러오지 못했습니다.', data: null };
  return { ok: true, status: res.status, error: null, data: { places: res.data.places, total: res.data.total } };
}
