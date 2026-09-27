// 토큰 유틸리티 (암호화 제거됨)

// 토큰 저장용 (pass-through)
export function encryptToken(token: string): string {
  return token;
}

// 토큰 복호화용 (pass-through)
export function decryptToken(encryptedToken: string): string {
  return encryptedToken;
}

// JWT 토큰의 만료 시간 체크
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const expiration = payload.exp * 1000; // exp는 초 단위이므로 밀리초로 변환
    return Date.now() >= expiration;
  } catch {
    return true; // 파싱 실패시 만료된 것으로 간주
  }
}

// JWT 토큰이 곧 만료되는지 체크 (기본값: 10분 전)
export function isTokenExpiringSoon(token: string, minutesThreshold = 10): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const expiration = payload.exp * 1000; // exp는 초 단위이므로 밀리초로 변환
    const threshold = Date.now() + (minutesThreshold * 60 * 1000); // 현재 시간 + 임계값
    return expiration <= threshold;
  } catch {
    return true; // 파싱 실패시 곧 만료된 것으로 간주
  }
}
