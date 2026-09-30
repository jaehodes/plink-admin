'use server';

import { externalApiFetch } from '../lib/external-api';
import { DecodeBase64, EncodeBase64 } from '../utils/base64Utils';
import type {
  AgencyUser,
  BalanceEvent,
  BalanceType,
  BlockHistory,
  Counts,
  InvertedChild,
  LedgerEntry,
  LedgerKind,
  PeriodFilter,
  PriceChange,
  PriceHistory,
  Prices,
} from '../types/agency';

/**
 * 대리점 계정·건수·단가 Server Actions (plink-api /api/admin-app/order-users 등, docs/admin-app/order-users-api.md)
 * - 이름·memo·사유는 여기서 base64로 바꿔 보내고, 받은 값은 복원해 넘긴다.
 * - 실패하면 상태 코드와 code를 그대로 넘긴다. 화면이 409 INSUFFICIENT_BALANCE 같은 code로 안내를 나눈다.
 * - 건수를 옮기는 요청(적립·회수·전환·조정)은 화면에서 만든 requestId를 받는다. 재시도에 같은 값을 보내면 중복 처리되지 않는다.
 */

export interface AgencyResult<T> {
  ok: boolean;
  status: number;
  code?: string;
  error: string | null;
  data: T | null;
}

type Method = 'GET' | 'POST' | 'PUT';

async function call<Raw, T>(
  endpoint: string,
  { method = 'GET', body }: { method?: Method; body?: unknown } = {},
  map: (raw: Raw) => T,
  fallback = '요청에 실패했습니다.',
): Promise<AgencyResult<T>> {
  const res = await externalApiFetch<Raw & { ret?: number; error?: string; message?: string }>(endpoint, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.error || !res.data) return { ok: false, status: res.status, code: res.code, error: res.error || fallback, data: null };
  if (res.data.ret !== 0) return { ok: false, status: res.status, error: res.data.error || res.data.message || fallback, data: null };
  return { ok: true, status: res.status, error: null, data: map(res.data) };
}

const query = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
};

const decodeOrNull = (v: string | null | undefined) => (v ? DecodeBase64(v) : null);
const encodeOrUndefined = (v: string | undefined) => (v && v.trim() ? EncodeBase64(v.trim()) : undefined);
const encodeRequired = (v: string) => EncodeBase64(v.trim());

/* eslint-disable @typescript-eslint/no-explicit-any */
const decodeRef = (r: any) => (r ? { ...r, name: DecodeBase64(r.name ?? '') } : null);

const decodeUser = (u: any): AgencyUser => ({
  ...u,
  name: DecodeBase64(u.name ?? ''),
  parent: decodeRef(u.parent),
  blockedReason: decodeOrNull(u.blockedReason),
});

const decodeLedger = (e: any): LedgerEntry => ({ ...e, counterparty: decodeRef(e.counterparty), memo: decodeOrNull(e.memo) });

const decodeEvent = (e: any): BalanceEvent => ({ ...e, from: decodeRef(e.from), to: decodeRef(e.to), memo: decodeOrNull(e.memo) });

const decodeInverted = (list: any[] | null | undefined): InvertedChild[] =>
  (list ?? []).map((c) => ({ ...c, name: DecodeBase64(c.name ?? '') }));

const decodePriceHistory = (p: any): PriceHistory => ({ ...p, invertedChildren: decodeInverted(p.invertedChildren), memo: decodeOrNull(p.memo) });

const decodePriceChange = (changed: any): PriceChange =>
  Object.fromEntries(
    Object.entries(changed ?? {}).map(([t, c]: [string, any]) => [t, { ...c, invertedChildren: decodeInverted(c.invertedChildren) }]),
  );
/* eslint-enable @typescript-eslint/no-explicit-any */

// ── 조회 ──

export interface AgencyListParams {
  tier?: string;
  blocked?: string;
  searchWords?: string;
  parentId?: string;
  page?: number;
  limit?: number;
}

export async function listAgencies(params: AgencyListParams): Promise<AgencyResult<{ users: AgencyUser[]; total: number }>> {
  const q = query({
    tier: params.tier && params.tier !== 'all' ? params.tier : undefined,
    blocked: params.blocked && params.blocked !== 'all' ? params.blocked : undefined,
    searchWords: params.searchWords?.trim() || undefined,
    parentId: params.parentId,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });
  return call<{ users: unknown[]; total: number }, { users: AgencyUser[]; total: number }>(
    `/api/admin-app/order-users${q}`,
    {},
    (r) => ({ users: r.users.map(decodeUser), total: r.total }),
    '대리점 목록을 불러오지 못했습니다.',
  );
}

export interface AgencyDetail {
  user: AgencyUser;
  children: AgencyUser[];
  blockHistory: BlockHistory[];
}

export async function getAgencyDetail(id: string): Promise<AgencyResult<AgencyDetail>> {
  return call<{ user: unknown; children: unknown[]; blockHistory: BlockHistory[] }, AgencyDetail>(
    `/api/admin-app/order-users/${encodeURIComponent(id)}`,
    {},
    (r) => ({
      user: decodeUser(r.user),
      children: r.children.map(decodeUser),
      blockHistory: r.blockHistory.map((h) => ({ ...h, reason: decodeOrNull(h.reason) })),
    }),
    '대리점 정보를 불러오지 못했습니다.',
  );
}

export async function getAgencyLedger(
  id: string,
  params: { type?: 'all' | BalanceType; kind?: 'all' | LedgerKind; page?: number; limit?: number },
): Promise<AgencyResult<{ entries: LedgerEntry[]; total: number }>> {
  const q = query({ type: params.type ?? 'all', kind: params.kind ?? 'all', page: params.page ?? 1, limit: params.limit ?? 20 });
  return call<{ entries: unknown[]; total: number }, { entries: LedgerEntry[]; total: number }>(
    `/api/admin-app/order-users/${encodeURIComponent(id)}/ledger${q}`,
    {},
    (r) => ({ entries: r.entries.map(decodeLedger), total: r.total }),
    '잔액 변동을 불러오지 못했습니다.',
  );
}

export async function getAgencyPriceHistory(
  id: string,
  params: { type?: 'all' | BalanceType; page?: number; limit?: number },
): Promise<AgencyResult<{ prices: PriceHistory[]; total: number }>> {
  const q = query({ type: params.type ?? 'all', page: params.page ?? 1, limit: params.limit ?? 20 });
  return call<{ prices: unknown[]; total: number }, { prices: PriceHistory[]; total: number }>(
    `/api/admin-app/order-users/${encodeURIComponent(id)}/prices${q}`,
    {},
    (r) => ({ prices: r.prices.map(decodePriceHistory), total: r.total }),
    '단가 이력을 불러오지 못했습니다.',
  );
}

export interface BalanceEventParams {
  kind?: 'all' | LedgerKind;
  type?: 'all' | BalanceType;
  userId?: string;
  period?: PeriodFilter;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export async function getBalanceEvents(params: BalanceEventParams): Promise<AgencyResult<{ events: BalanceEvent[]; total: number }>> {
  const q = query({
    kind: params.kind ?? 'all',
    type: params.type ?? 'all',
    userId: params.userId,
    period: params.period,
    startDate: params.period === 'custom' ? params.startDate : undefined,
    endDate: params.period === 'custom' ? params.endDate : undefined,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });
  return call<{ events: unknown[]; total: number }, { events: BalanceEvent[]; total: number }>(
    `/api/admin-app/order-balance-events${q}`,
    {},
    (r) => ({ events: r.events.map(decodeEvent), total: r.total }),
    '원장을 불러오지 못했습니다.',
  );
}

export interface PlatformPrices {
  current: Prices;
  history: PriceHistory[];
  total: number;
}

export async function getPlatformPrices(params: { type?: 'all' | BalanceType; page?: number; limit?: number } = {}): Promise<AgencyResult<PlatformPrices>> {
  const q = query({ type: params.type ?? 'all', page: params.page ?? 1, limit: params.limit ?? 20 });
  return call<{ current: Prices; history: unknown[]; total: number }, PlatformPrices>(
    `/api/admin-app/order-prices/platform${q}`,
    {},
    (r) => ({ current: r.current, history: r.history.map(decodePriceHistory), total: r.total }),
    '플랫폼 단가를 불러오지 못했습니다.',
  );
}

// ── 계정 ──

export async function createTier1Agency(input: { loginId: string; name: string; password: string }): Promise<AgencyResult<{ id: string; loginId: string }>> {
  return call<{ id: string; loginId: string }, { id: string; loginId: string }>(
    '/api/admin-app/order-users',
    { method: 'POST', body: { loginId: input.loginId.trim().toLowerCase(), name: encodeRequired(input.name), password: input.password } },
    (r) => ({ id: r.id, loginId: r.loginId }),
    '계정을 만들지 못했습니다.',
  );
}

export async function setAgencyBlocked(id: string, blocked: boolean, reason?: string): Promise<AgencyResult<{ changed: boolean; blocked: boolean }>> {
  return call<{ changed: boolean; blocked: boolean }, { changed: boolean; blocked: boolean }>(
    `/api/admin-app/order-users/${encodeURIComponent(id)}/block`,
    { method: 'POST', body: { blocked, reason: encodeOrUndefined(reason) } },
    (r) => ({ changed: r.changed, blocked: r.blocked }),
    blocked ? '차단하지 못했습니다.' : '차단을 해제하지 못했습니다.',
  );
}

// ── 건수 (requestId 필수) ──

interface MoveResult {
  eventId: string;
  duplicate: boolean;
}

export async function issueBalance(
  id: string,
  input: { type: BalanceType; count: number; memo: string; requestId: string },
): Promise<AgencyResult<MoveResult & { availableCount: number }>> {
  return call<MoveResult & { availableCount: number }, MoveResult & { availableCount: number }>(
    `/api/admin-app/order-users/${encodeURIComponent(id)}/issue`,
    { method: 'POST', body: { type: input.type, count: input.count, memo: encodeRequired(input.memo), requestId: input.requestId } },
    (r) => ({ eventId: r.eventId, duplicate: r.duplicate, availableCount: r.availableCount }),
    '적립하지 못했습니다.',
  );
}

export async function reclaimBalance(
  id: string,
  input: { type: BalanceType; count: number; memo: string; sourceEventId?: string; requestId: string },
): Promise<AgencyResult<MoveResult & { parentId: string; availableCount: number; parentAvailableCount: number }>> {
  type R = MoveResult & { parentId: string; availableCount: number; parentAvailableCount: number };
  return call<R, R>(
    `/api/admin-app/order-users/${encodeURIComponent(id)}/reclaim`,
    {
      method: 'POST',
      body: {
        type: input.type,
        count: input.count,
        memo: encodeRequired(input.memo),
        sourceEventId: input.sourceEventId || undefined,
        requestId: input.requestId,
      },
    },
    (r) => ({ eventId: r.eventId, duplicate: r.duplicate, parentId: r.parentId, availableCount: r.availableCount, parentAvailableCount: r.parentAvailableCount }),
    '회수하지 못했습니다.',
  );
}

export async function convertBalance(
  id: string,
  input: { fromType: BalanceType; toType: BalanceType; toCount: number; memo: string; requestId: string },
): Promise<AgencyResult<MoveResult & { fromCount: number; toCount: number; availableCounts: Counts }>> {
  type R = MoveResult & { fromCount: number; toCount: number; availableCounts: Counts };
  return call<R, R>(
    `/api/admin-app/order-users/${encodeURIComponent(id)}/convert`,
    {
      method: 'POST',
      body: { fromType: input.fromType, toType: input.toType, toCount: input.toCount, memo: encodeRequired(input.memo), requestId: input.requestId },
    },
    (r) => ({ eventId: r.eventId, duplicate: r.duplicate, fromCount: r.fromCount, toCount: r.toCount, availableCounts: r.availableCounts }),
    '유형을 전환하지 못했습니다.',
  );
}

export async function adjustBalance(
  id: string,
  input: { type: BalanceType; delta: number; memo: string; requestId: string },
): Promise<AgencyResult<MoveResult & { availableCount: number }>> {
  return call<MoveResult & { availableCount: number }, MoveResult & { availableCount: number }>(
    `/api/admin-app/order-users/${encodeURIComponent(id)}/adjust`,
    { method: 'POST', body: { type: input.type, delta: input.delta, memo: encodeRequired(input.memo), requestId: input.requestId } },
    (r) => ({ eventId: r.eventId, duplicate: r.duplicate, availableCount: r.availableCount }),
    '조정하지 못했습니다.',
  );
}

// ── 플랫폼 단가 ──

export async function updatePlatformPrices(prices: Partial<Record<BalanceType, number>>, memo?: string): Promise<AgencyResult<{ changed: PriceChange }>> {
  return call<{ changed: unknown }, { changed: PriceChange }>(
    '/api/admin-app/order-prices/platform',
    { method: 'PUT', body: { prices, memo: encodeOrUndefined(memo) } },
    (r) => ({ changed: decodePriceChange(r.changed) }),
    '플랫폼 단가를 바꾸지 못했습니다.',
  );
}
