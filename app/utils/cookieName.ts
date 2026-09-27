const isProduction = process.env.NEXT_PUBLIC_NODE_ENV === 'production';
const prefix = isProduction ? 'padmin-' : 'test-padmin-';

export const TOKEN_COOKIE_NAME = `${prefix}token`;
