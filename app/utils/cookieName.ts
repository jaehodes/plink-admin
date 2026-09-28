import { isProductionEnv } from '../lib/app-env';

// dev(8443)와 prod(443)는 같은 도메인이라 쿠키를 함께 쓴다(쿠키는 포트를 구분하지 않는다). 이름으로 나눈다.
const prefix = isProductionEnv() ? 'padmin-' : 'test-padmin-';

export const TOKEN_COOKIE_NAME = `${prefix}token`;
export const REFRESH_COOKIE_NAME = `${prefix}refresh`;
