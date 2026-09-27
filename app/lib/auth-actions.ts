'use server';

import { redirect } from 'next/navigation';
import { postAuthApi } from './admin-auth';
import { clearTokens, saveTokens } from './auth-server';

export interface LoginState {
  error: string | null;
}

/** 로그인 후 이동할 경로. 외부 URL로의 이동(open redirect)을 막기 위해 내부 경로만 허용한다. */
function safeNextPath(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : '/';
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const loginId = String(formData.get('loginId') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!loginId || !password) {
    return { error: '아이디와 비밀번호를 입력해 주세요.' };
  }

  const result = await postAuthApi('login', { loginId, password });
  if (!result.ok) {
    return { error: result.message };
  }

  await saveTokens(result.tokens);
  redirect(safeNextPath(formData.get('next')));
}

export async function logout(): Promise<void> {
  const refreshToken = await clearTokens();
  if (refreshToken) {
    await postAuthApi('logout', { refreshToken });
  }
  redirect('/login');
}
