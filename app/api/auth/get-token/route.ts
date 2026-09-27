import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE_NAME } from '../../../utils/cookieName';

export async function GET() {
  // 프로덕션 환경에서는 접근 불가
  if (process.env.NEXT_PUBLIC_NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const cookieStore = await cookies();
    const base64Token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

    if (!base64Token) {
      return NextResponse.json(
        { token: null, message: '토큰이 없습니다.' },
        { status: 200 }
      );
    }

    // 쿠키에 저장된 Base64 값 그대로 반환
    return NextResponse.json({
      token: base64Token
    });
  } catch (error) {
    console.error('Get token error:', error);
    return NextResponse.json(
      { error: '토큰을 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
