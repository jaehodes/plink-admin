import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { REFRESH_COOKIE_NAME, TOKEN_COOKIE_NAME } from '../utils/cookieName';
import {
  accessCookieOptions,
  decodeTokenPayload,
  isAccessTokenValid,
  refreshCookieOptions,
  type AuthTokens,
} from './admin-auth';

export async function getTokenPayload(): Promise<Record<string, unknown> | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  return token ? decodeTokenPayload(token) : null;
}

export async function getAdminName(): Promise<string | null> {
  const payload = await getTokenPayload();
  return typeof payload?.uname === 'string' ? payload.uname : null;
}

export async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  return !!token && isAccessTokenValid(token);
}

/**
 * 페이지 진입 시 인증 확인. 대부분 proxy.ts에서 걸러지지만, 만료 경계 등 예외 상황을 위한 안전장치.
 */
export async function requireAuth(): Promise<void> {
  if (!(await checkAuth())) redirect('/login');
}

/** Server Action에서만 호출 가능 (Server Component는 쿠키를 쓸 수 없음) */
export async function saveTokens(tokens: AuthTokens): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, tokens.accessToken, accessCookieOptions(tokens));
  cookieStore.set(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());
}

export async function clearTokens(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  cookieStore.delete(TOKEN_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);
  return refreshToken;
}
