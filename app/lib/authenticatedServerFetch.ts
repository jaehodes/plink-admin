'use server';

import { cookies } from 'next/headers';
import { TOKEN_COOKIE_NAME } from '../utils/cookieName';

interface AuthenticatedFetchOptions extends RequestInit {
  requireAuth?: boolean;
}

interface RefreshResponse {
  ret: number;
  token?: string;
}

/**
 * 토큰 갱신 함수
 */
async function refreshToken(currentToken: string): Promise<string | null> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    const isDev = process.env.NEXT_PUBLIC_NODE_ENV === 'development';

    if (isDev) {
      console.log('🔄 [Token Refresh] 토큰 갱신 시도 중...');
    }

    const response = await fetch(`${API_BASE_URL}/rctadmin/tkrefblog/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Authorization': `Bearer ${currentToken}`,
      },
      body: '',
    });

    if (!response.ok) {
      if (isDev) {
        console.log('❌ [Token Refresh] 서버 응답 오류:', response.status);
      }
      return null;
    }

    const data: RefreshResponse = await response.json();

    if (data.ret === 0 && data.token) {
      if (isDev) {
        console.log('✅ [Token Refresh] 토큰 갱신 성공');
      }

      // 새 토큰을 쿠키에 저장
      const cookieStore = await cookies();

      const getTokenExpiration = (token: string) => {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          return new Date(payload.exp * 1000);
        } catch {
          return new Date(Date.now() + 5 * 60 * 1000);
        }
      };

      const tokenExp = getTokenExpiration(data.token);

      cookieStore.set(TOKEN_COOKIE_NAME, data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: tokenExp,
        path: '/',
      });

      if (isDev) {
        console.log('📝 [Token Refresh] 새 토큰 쿠키 저장 완료, 만료 시간:', tokenExp.toISOString());
      }

      return data.token;
    }

    if (isDev) {
      console.log('⚠️ [Token Refresh] 토큰 갱신 실패, ret 코드:', data.ret);
    }

    return null;
  } catch (error) {
    if (process.env.NEXT_PUBLIC_NODE_ENV === 'development') {
      console.error('❌ [Token Refresh] 예외 발생:', error);
    }
    return null;
  }
}

/**
 * Authenticated server-side fetch utility
 * Automatically retrieves and adds Authorization header
 * Prepends API_BASE_URL to relative URLs
 * Automatically refreshes token before making request
 */
export async function authenticatedServerFetch(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const { requireAuth = true, ...fetchOptions } = options;

  // Get token from cookies
  const cookieStore = await cookies();
  let token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    if (requireAuth) {
      throw new Error('Authentication token not found');
    }
    return fetch(url, fetchOptions);
  }

  // 토큰 갱신 시도
  const refreshedToken = await refreshToken(token);
  if (refreshedToken) {
    token = refreshedToken;
  }

  // Add Authorization header
  const headers = new Headers(fetchOptions.headers);
  headers.set('Authorization', `Bearer ${token}`);

  // Prepend API_BASE_URL for relative URLs
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}/${url.replace(/^\//, '')}`;

  return fetch(fullUrl, {
    ...fetchOptions,
    headers,
  });
}

/**
 * Authenticated server-side fetch with JSON response
 */
export async function authenticatedServerFetchJSON<T>(
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<T> {
  const response = await authenticatedServerFetch(url, options);

  if (!response.ok) {
    throw new Error(`Server request failed: ${response.status}`);
  }

  return response.json();
}
