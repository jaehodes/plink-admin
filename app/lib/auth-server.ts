import { cookies } from 'next/headers';
import { TOKEN_COOKIE_NAME } from '../utils/cookieName';

export async function getTokenPayload(): Promise<Record<string, unknown> | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
    if (!token || token.split('.').length !== 3) return null;
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch {
    return null;
  }
}

export async function getAdminName(): Promise<string | null> {
  const payload = await getTokenPayload();
  if (!payload) return null;
  return (payload.uname || payload.name || payload.username || payload.adminName || null) as string | null;
}

export async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  try {
    // JWT 토큰이 유효한지 간단히 체크 (형식 확인)
    if (token.split('.').length !== 3) {
      return false;
    }

    // 토큰 만료 시간 체크
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const exp = payload.exp;

    if (!exp || exp * 1000 < Date.now()) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token verification failed:', error);
    return false;
  }
}
