'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const env = process.env.NEXT_PUBLIC_NODE_ENV;
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [expiryTime, setExpiryTime] = useState<number | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenExpiry = async () => {
      try {
        const response = await fetch('/api/auth/token-expiry');
        if (response.ok) {
          const data = await response.json();
          if (data.exp) setExpiryTime(data.exp * 1000);
          if (data.name) setAdminName(data.name);
        }
      } catch (error) {
        console.error('Failed to fetch token expiry:', error);
      }
    };

    const initialFetch = setTimeout(fetchTokenExpiry, 500);
    return () => clearTimeout(initialFetch);
  }, []);

  useEffect(() => {
    if (!expiryTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiryTime - now;

      if (diff <= 0) {
        setRemainingTime('만료됨');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setRemainingTime(`${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiryTime]);

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
          {remainingTime && (
            <span className="font-mono tabular-nums">{remainingTime}</span>
          )}
          {adminName && remainingTime && <span className="text-slate-300 hidden sm:inline">|</span>}
          {adminName && <span className="hidden sm:inline">{adminName}</span>}
          {getEnvBadge()}
        </div>
      </div>
    </header>
  );
}
