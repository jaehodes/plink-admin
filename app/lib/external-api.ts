import { cookies } from 'next/headers';
import { TOKEN_COOKIE_NAME } from '../utils/cookieName';

interface ExternalApiOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  requireAuth?: boolean;
  /** Server Action에서 호출 시 true로 설정하면 토큰 갱신 후 쿠키에 저장 */
  saveRefreshedToken?: boolean;
}

interface ExternalApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

interface RefreshResponse {
  ret: number;
  token?: string;
}

/**
 * 토큰 만료 여부 확인
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const exp = payload.exp * 1000;
    return Date.now() >= exp;
  } catch {
    return true;
  }
}

/**
 * 토큰 만료 시간 계산
 */
function getTokenExpiration(token: string): Date {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return new Date(payload.exp * 1000);
  } catch {
    return new Date(Date.now() + 5 * 60 * 1000);
  }
}

/**
 * 토큰 갱신 함수 (쿠키 저장 없이 새 토큰만 반환)
 */
async function refreshTokenOnly(currentToken: string): Promise<string | null> {
  try {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

    const response = await fetch(`${API_BASE_URL}/rctadmin/tkrefblog/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Authorization': `Bearer ${currentToken}`,
      },
      body: '',
    });

    if (!response.ok) {
      return null;
    }

    const data: RefreshResponse = await response.json();

    if (data.ret === 0 && data.token) {
      return data.token;
    }

    return null;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

/**
 * 토큰 갱신 및 쿠키 저장 (Server Action에서 사용)
 */
export async function refreshTokenAndSave(currentToken: string): Promise<string | null> {
  const newToken = await refreshTokenOnly(currentToken);

  if (newToken) {
    const cookieStore = await cookies();
    const tokenExp = getTokenExpiration(newToken);

    cookieStore.set(TOKEN_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: tokenExp,
      path: '/',
    });

    return newToken;
  }

  return null;
}

/**
 * 외부 API 서버 호출 공통 함수
 * - EXTERNAL_API_URL 환경변수 사용
 * - 자동으로 Authorization 헤더 추가 (requireAuth: true일 때)
 * - 요청 전 토큰 갱신
 */
export async function externalApiFetch<T = unknown>(
  endpoint: string,
  options: ExternalApiOptions = {}
): Promise<ExternalApiResponse<T>> {
  const { requireAuth = true, saveRefreshedToken = false, headers: customHeaders = {}, ...fetchOptions } = options;

  const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'http://localhost:3000';

  // 인증이 필요한 경우 토큰 가져오기 및 갱신
  let token: string | undefined;
  if (requireAuth) {
    const cookieStore = await cookies();
    token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

    if (!token) {
      return {
        data: null,
        error: '인증이 필요합니다.',
        status: 401,
      };
    }

    // 토큰 만료 여부 확인
    if (isTokenExpired(token)) {
      return {
        data: null,
        error: '인증이 만료되었습니다. 다시 로그인해주세요.',
        status: 401,
      };
    }

    // 토큰 갱신 시도
    const refreshedToken = await refreshTokenOnly(token);
    if (refreshedToken) {
      token = refreshedToken;
      // Server Action에서 호출된 경우 쿠키에 저장
      if (saveRefreshedToken) {
        const tokenExp = getTokenExpiration(refreshedToken);
        cookieStore.set(TOKEN_COOKIE_NAME, refreshedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          expires: tokenExp,
          path: '/',
        });
      }
    }
  }

  // 헤더 설정
  const headers: Record<string, string> = {
    ...customHeaders,
  };

  // body가 있는 요청에만 Content-Type 추가
  if (fetchOptions.body) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // URL 생성
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${EXTERNAL_API_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    console.log('[API REQ]', fetchOptions.method || 'GET', url, fetchOptions.body ? String(fetchOptions.body) : '');
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `서버 오류 (${response.status})`;
      try {
        const errorData = await response.json();
        console.log('[API ERR]', response.status, url, JSON.stringify(errorData));
        if (errorData?.message) errorMessage = errorData.message;
      } catch {
        console.log('[API ERR]', response.status, url);
      }
      return {
        data: null,
        error: errorMessage,
        status: response.status,
      };
    }

    const data = await response.json();
    console.log('[API RES]', response.status, url, JSON.stringify(data).slice(0, 300));
    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (error) {
    console.error('External API fetch error:', error);
    return {
      data: null,
      error: '서버 요청 중 오류가 발생했습니다.',
      status: 500,
    };
  }
}

/**
 * GET 요청 헬퍼
 */
export async function externalApiGet<T = unknown>(
  endpoint: string,
  params?: Record<string, string>,
  options?: Omit<ExternalApiOptions, 'method' | 'body'>
): Promise<ExternalApiResponse<T>> {
  let url = endpoint;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url = `${endpoint}?${queryString}`;
  }
  return externalApiFetch<T>(url, { ...options, method: 'GET' });
}

/**
 * POST 요청 헬퍼
 */
export async function externalApiPost<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<ExternalApiOptions, 'method' | 'body'>
): Promise<ExternalApiResponse<T>> {
  return externalApiFetch<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT 요청 헬퍼
 */
export async function externalApiPut<T = unknown>(
  endpoint: string,
  body?: unknown,
  options?: Omit<ExternalApiOptions, 'method' | 'body'>
): Promise<ExternalApiResponse<T>> {
  return externalApiFetch<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE 요청 헬퍼
 */
export async function externalApiDelete<T = unknown>(
  endpoint: string,
  options?: Omit<ExternalApiOptions, 'method' | 'body'>
): Promise<ExternalApiResponse<T>> {
  return externalApiFetch<T>(endpoint, { ...options, method: 'DELETE' });
}
