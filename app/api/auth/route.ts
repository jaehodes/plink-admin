import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE_NAME } from '../../utils/cookieName';

interface LoginResponse {
  ret: number;
  token?: string;
  pidx?: number;
  cname?: string;
  uname?: string;
  userType?: number;
  cidx?: number;
  phone?: string;
  price?: number;
  totalPoint?: number;
  remPoint?: number;
  st?: number;
  lastDpDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

    // 외부 API로 auth 파라미터를 이용한 로그인 요청
    const response = await fetch(`${API_BASE_URL}/rctadmin/gettk/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: body,
    });

    if (!response.ok) {
      return NextResponse.json(
        { ret: -1, message: '서버 연결에 실패했습니다.' },
        { status: 500 }
      );
    }

    const data: LoginResponse = await response.json();

    // ret 코드에 따른 에러 처리
    if (data.ret === 1) {
      return NextResponse.json(
        { ret: 1, message: '잘못된 요청입니다. 인증 정보를 확인해주세요.' },
        { status: 400 }
      );
    } else if (data.ret === 2) {
      return NextResponse.json(
        { ret: 2, message: '인증키 오류입니다. 올바른 인증키를 사용해주세요.' },
        { status: 401 }
      );
    } else if (data.ret === 3) {
      return NextResponse.json(
        { ret: 3, message: '인증 시간이 초과되었습니다. 다시 시도해주세요.' },
        { status: 401 }
      );
    }

    // 로그인 성공시 쿠키에 토큰 저장
    if (data.ret === 0 && data.token) {
      const cookieStore = await cookies();

      // JWT 토큰의 만료 시간 파싱 (토큰의 payload에서 exp 추출)
      const getTokenExpiration = (token: string) => {
        try {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          return new Date(payload.exp * 1000);
        } catch {
          // 기본값: 5분
          return new Date(Date.now() + 5 * 60 * 1000);
        }
      };

      const tokenExp = getTokenExpiration(data.token);

      // HTTP-only 쿠키로 토큰 저장
      cookieStore.set(TOKEN_COOKIE_NAME, data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: tokenExp,
        path: '/',
      });

      // 토큰을 제외한 정보만 클라이언트로 반환
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { token: _token, ...responseData } = data;

      const response = NextResponse.json(responseData);

      // 보안 헤더 추가
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');

      return response;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Login with auth error:', error);
    return NextResponse.json(
      { ret: -1, message: '로그인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
