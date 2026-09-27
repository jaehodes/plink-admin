import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { isTokenExpired } from './tokenCrypto';

interface User {
  cidx: number;
  cname: string;
  mkey: string;
  pubkey: string;
  pburl: string;
  rw1: number;
  rw2: number;
  rw4: number;
  punit: string;
  st: number;
}


// 서버에서 인증 상태 확인
export async function getServerAuthState() {
  const cookieStore = await cookies();
  const base64AccessToken = cookieStore.get('accessToken')?.value;
  const base64RefreshToken = cookieStore.get('refreshToken')?.value;

  const accessToken = base64AccessToken ? Buffer.from(base64AccessToken, 'base64').toString() : null;
  const refreshToken = base64RefreshToken ? Buffer.from(base64RefreshToken, 'base64').toString() : null;

  if (accessToken && !isTokenExpired(accessToken)) {
    return { authenticated: true, accessToken, refreshToken };
  }

  if (refreshToken && !isTokenExpired(refreshToken)) {
    return { authenticated: true, accessToken: null, refreshToken, needsRefresh: true };
  }

  return { authenticated: false, accessToken: null, refreshToken: null };
}

// 서버에서 사용자 정보 가져오기
export async function getServerUser(): Promise<User | null> {
  try {
    const { authenticated, accessToken } = await getServerAuthState();

    if (!authenticated || !accessToken) {
      return null;
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

    const response = await fetch(`${API_BASE_URL}/rctpub/prf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();

      if (data.ret === 0) {
        return {
          cidx: data.cidx,
          cname: data.cname,
          mkey: data.mkey,
          pubkey: data.pubkey,
          pburl: data.pburl,
          rw1: data.rw1,
          rw2: data.rw2,
          rw4: data.rw4,
          punit: data.punit,
          st: data.st,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Get server user error:', error);
    return null;
  }
}

// 미들웨어에서 사용할 인증 체크
export function checkAuthFromRequest(request: NextRequest) {
  const base64AccessToken = request.cookies.get('accessToken')?.value;
  const base64RefreshToken = request.cookies.get('refreshToken')?.value;

  const accessToken = base64AccessToken ? Buffer.from(base64AccessToken, 'base64').toString() : null;
  const refreshToken = base64RefreshToken ? Buffer.from(base64RefreshToken, 'base64').toString() : null;

  if (accessToken && !isTokenExpired(accessToken)) {
    return { authenticated: true, accessToken, refreshToken };
  }

  if (refreshToken && !isTokenExpired(refreshToken)) {
    return { authenticated: true, accessToken: null, refreshToken, needsRefresh: true };
  }

  return { authenticated: false, accessToken: null, refreshToken: null };
}
