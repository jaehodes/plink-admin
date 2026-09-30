/**
 * plink-api 자체 인증(/api/admin-app/auth/*) 호출과 토큰 쿠키 옵션.
 * proxy.ts와 Server Action 양쪽에서 쓰므로 next/headers에 의존하지 않는다.
 */

export const REFRESH_TOKEN_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type AuthApiResult =
  | { ok: true; tokens: AuthTokens }
  | { ok: false; status: number; message: string };

interface AuthApiResponse extends Partial<AuthTokens> {
  ret: number;
  message?: string;
}

export async function postAuthApi(
  path: 'login' | 'refresh' | 'logout',
  body: Record<string, string>
): Promise<AuthApiResult> {
  const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${EXTERNAL_API_URL}/api/admin-app/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data: AuthApiResponse = await response.json().catch(() => ({ ret: -1 }));

    if (response.ok && data.ret === 0) {
      return {
        ok: true,
        tokens: {
          accessToken: data.accessToken ?? '',
          refreshToken: data.refreshToken ?? '',
          expiresIn: data.expiresIn ?? 0,
        },
      };
    }
    return { ok: false, status: response.status, message: data.message || `서버 오류 (${response.status})` };
  } catch (error) {
    console.error(`[AUTH] ${path} request failed:`, error);
    return { ok: false, status: 503, message: '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.' };
  }
}

/** JWT payload를 서명 검증 없이 읽는다. 표시·만료 확인용이며, 실제 검증은 plink-api가 한다. */
export function decodeTokenPayload(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
}

/** 만료까지 marginSec 초 이상 남았으면 true */
export function isAccessTokenValid(token: string, marginSec = 0): boolean {
  const exp = decodeTokenPayload(token)?.exp;
  return typeof exp === 'number' && exp * 1000 - marginSec * 1000 > Date.now();
}

const baseCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export function accessCookieOptions(tokens: AuthTokens) {
  return { ...baseCookieOptions, maxAge: tokens.expiresIn };
}

export function refreshCookieOptions() {
  return { ...baseCookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE_SEC };
}
