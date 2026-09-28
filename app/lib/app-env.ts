/**
 * 실행 환경 (development / test / production).
 * NEXT_PUBLIC_* 값은 빌드 시 코드에 고정되므로, 이미지 하나로 dev/prod를 함께 운영하기 위해 서버 환경변수로 읽는다.
 * 서버 코드에서만 읽을 수 있으며, 클라이언트 컴포넌트에는 prop으로 넘긴다.
 */
export function getAppEnv(): string | undefined {
  return process.env.APP_ENV;
}

export function isProductionEnv(): boolean {
  return getAppEnv() === 'production';
}
