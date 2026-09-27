'use client';

import Link from 'next/link';
import { logout } from '../lib/auth-actions';

interface HeaderProps {
  adminName: string | null;
}

export default function Header({ adminName }: HeaderProps) {
  const env = process.env.NEXT_PUBLIC_NODE_ENV;

  const getEnvBadge = () => {
    if (env === 'development') {
      return (
        <span className="px-2.5 py-0.5 text-xs font-semibold text-white bg-green-500 rounded-full animate-pulse">
          개발
        </span>
      );
    } else if (env === 'test') {
      return (
        <span className="px-2.5 py-0.5 text-xs font-semibold text-white bg-yellow-500 rounded-full animate-pulse">
          테스트
        </span>
      );
    } else if (env === 'production') {
      return (
        <span className="px-2.5 py-0.5 text-xs font-semibold text-white bg-red-500 rounded-full animate-pulse">
          라이브
        </span>
      );
    }
    return null;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.ico" alt="플리커" className="w-5 h-5 sm:w-6 sm:h-6" />
          <Link href="/" className="text-base sm:text-xl font-semibold text-gray-900 hover:text-gray-700 transition-colors whitespace-nowrap">
            플리커 관리자
          </Link>
          {process.env.NEXT_PUBLIC_APP_VERSION && (
            <span className="hidden sm:inline text-xs text-gray-400 font-medium">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500 shrink-0">
          {adminName && <span className="hidden sm:inline">{adminName}</span>}
          {getEnvBadge()}
          <form action={logout}>
            <button
              type="submit"
              className="px-2 py-1 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
