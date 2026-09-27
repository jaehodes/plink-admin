import { Suspense } from 'react';
import Link from 'next/link';
import { checkAuth, getAdminName } from './lib/auth-server';
import Layout from './components/Layout';
import AccessDenied from './components/AccessDenied';
import HomeClient from './components/HomeClient';
import DevTokenDisplay from './components/DevTokenDisplay';

export default async function Home() {
  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    return (
      <>
        <Suspense fallback={null}>
          <HomeClient />
        </Suspense>
        <AccessDenied />
      </>
    );
  }

  const adminName = await getAdminName();

  const quickLinks = [
    { name: '대시보드', href: '/dashboard', desc: '핵심 지표 한눈에', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
    { name: '발주 목록', href: '/orders', desc: '발주 현황 관리', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
    { name: '퀴즈/주차장', href: '/quizzes', desc: '문제 활성/비활성 관리', color: 'bg-violet-50 hover:bg-violet-100 border-violet-200' },
    { name: '수행 목록', href: '/executions', desc: '미션 수행 내역 조회', color: 'bg-teal-50 hover:bg-teal-100 border-teal-200' },
    { name: '문의 목록', href: '/reports', desc: '신고/문의 처리', color: 'bg-orange-50 hover:bg-orange-100 border-orange-200' },
    { name: '공지사항', href: '/notices', desc: '공지사항 관리', color: 'bg-rose-50 hover:bg-rose-100 border-rose-200' },
    { name: '회원관리', href: '/users', desc: '회원 정보 관리', color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200' },
    { name: 'FAQ 관리', href: '/faq', desc: 'FAQ 관리', color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
  ];

  return (
    <Layout>
      <Suspense fallback={null}>
        <HomeClient />
      </Suspense>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {adminName ? `${adminName}님, 안녕하세요` : '플리커 관리자에 오신 것을 환영합니다'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">플리커 관리자 시스템입니다.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl border p-4 transition-colors ${link.color}`}
            >
              <p className="text-sm font-semibold text-slate-700">{link.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{link.desc}</p>
            </Link>
          ))}
        </div>

        {process.env.NEXT_PUBLIC_NODE_ENV !== 'production' && (
          <DevTokenDisplay />
        )}
      </div>
    </Layout>
  );
}
