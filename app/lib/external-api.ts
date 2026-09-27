import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TOKEN_COOKIE_NAME } from '../utils/cookieName';

interface ExternalApiOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

interface ExternalApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

/**
 * 외부 API 서버 호출 공통 함수
 * - EXTERNAL_API_URL 환경변수 사용
 * - 자동으로 Authorization 헤더 추가 (requireAuth: true일 때)
 * - 토큰 갱신은 proxy.ts에서 처리하므로 여기서는 쿠키의 access token을 그대로 사용
 * - 401 응답(차단·비밀번호 변경 등으로 토큰이 무효화됨)이면 로그인 페이지로 이동
 */
export async function externalApiFetch<T = unknown>(
  endpoint: string,
  options: ExternalApiOptions = {}
): Promise<ExternalApiResponse<T>> {
  const { requireAuth = true, headers: customHeaders = {}, ...fetchOptions } = options;

  const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL || 'http://localhost:3000';

  let token: string | undefined;
  if (requireAuth) {
    const cookieStore = await cookies();
    token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

    if (!token) {
      redirect('/login');
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

  let result: ExternalApiResponse<T>;
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
        else if (errorData?.error) errorMessage = errorData.error;
      } catch {
        console.log('[API ERR]', response.status, url);
      }
      result = {
        data: null,
        error: errorMessage,
        status: response.status,
      };
    } else {
      const data = await response.json();
      console.log('[API RES]', response.status, url, JSON.stringify(data).slice(0, 300));
      result = {
        data,
        error: null,
        status: response.status,
      };
    }
  } catch (error) {
    console.error('External API fetch error:', error);
    result = {
      data: null,
      error: '서버 요청 중 오류가 발생했습니다.',
      status: 500,
    };
  }

  // redirect()는 예외로 동작하므로 try 블록 밖에서 호출한다
  if (requireAuth && result.status === 401) {
    redirect('/login?reason=expired');
  }

  return result;
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
