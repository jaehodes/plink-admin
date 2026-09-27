import { NextResponse, type NextRequest } from 'next/server';
import { REFRESH_COOKIE_NAME, TOKEN_COOKIE_NAME } from './app/utils/cookieName';
import {
  accessCookieOptions,
  isAccessTokenValid,
  postAuthApi,
  refreshCookieOptions,
  type AuthApiResult,
} from './app/lib/admin-auth';

/**
 * 모든 페이지 요청의 인증 관문.
 * - access token이 충분히 남아 있으면 통과
 * - 만료가 가까우면 refresh token으로 갱신해 쿠키를 교체 (Server Component는 쿠키를 쓸 수 없으므로 여기서 처리)
 * - 유효한 토큰이 없으면 /login으로 보낸다
 */
const PUBLIC_PATHS = new Set(['/login']);
const REFRESH_MARGIN_SEC = 5 * 60;

// refresh token은 1회용이라, 같은 쿠키로 동시에 들어온 요청(페이지 + prefetch 등)이 각자 갱신하면 한쪽이 실패한다.
// 같은 프로세스 안에서는 갱신 결과를 잠시 공유한다.
// 공유하는 동안에는 이미 교체된 refresh token도 통하므로, 동시 요청만 커버할 만큼 짧게 둔다.
const REFRESH_SHARE_MS = 5 * 1000;
const refreshResults = new Map<string, { result: Promise<AuthApiResult>; expiresAt: number }>();

function refreshOnce(refreshToken: string): Promise<AuthApiResult> {
  const now = Date.now();
  for (const [key, entry] of refreshResults) {
    if (entry.expiresAt <= now) refreshResults.delete(key);
  }

  const shared = refreshResults.get(refreshToken);
  if (shared) return shared.result;

  const result = postAuthApi('refresh', { refreshToken });
  refreshResults.set(refreshToken, { result, expiresAt: now + REFRESH_SHARE_MS });
  return result;
}

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (accessToken && isAccessTokenValid(accessToken, REFRESH_MARGIN_SEC)) {
    return NextResponse.next();
  }

  if (refreshToken) {
    const result = await refreshOnce(refreshToken);
    if (result.ok) {
      const { tokens } = result;
      // 이번 요청을 처리하는 Server Component/Action도 새 토큰을 보도록 요청 쿠키도 교체한다
      request.cookies.set(TOKEN_COOKIE_NAME, tokens.accessToken);
      request.cookies.set(REFRESH_COOKIE_NAME, tokens.refreshToken);

      const response = NextResponse.next({ request: { headers: request.headers } });
      response.cookies.set(TOKEN_COOKIE_NAME, tokens.accessToken, accessCookieOptions(tokens));
      response.cookies.set(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());
      return response;
    }
  }

  // 갱신에 실패해도 access token이 아직 만료 전이면 그대로 사용한다
  if (accessToken && isAccessTokenValid(accessToken)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|api/alive|favicon.ico|manifest.json|robots.txt|.*\\.svg$).*)'],
};
