import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE_NAME } from '../../../utils/cookieName';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { exp: null, message: '토큰이 없습니다.' },
        { status: 200 }
      );
    }

    // JWT 토큰의 만료 시간 및 이름 추출
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const exp = payload.exp;
    const name = payload.uname || payload.name || payload.username || payload.adminName || null;

    return NextResponse.json({ exp, name });
  } catch (error) {
    console.error('Get token expiry error:', error);
    return NextResponse.json(
      { exp: null, error: '토큰 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
