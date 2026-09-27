import type { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: '로그인 - 플리커 관리자',
  robots: 'noindex, nofollow',
};

interface PageProps {
  searchParams: Promise<{
    next?: string;
    reason?: string;
  }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, reason } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.ico" alt="플리커" className="w-14 h-14 mb-4" />
          <h1 className="text-xl font-bold text-slate-900">플리커 관리자</h1>
        </div>

        {reason === 'expired' && (
          <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            인증이 만료되었습니다. 다시 로그인해 주세요.
          </p>
        )}

        <LoginForm next={next ?? ''} />
      </div>
    </div>
  );
}
