import type { Metadata } from "next";
import Layout from '../components/Layout';
import AccessDenied from '../components/AccessDenied';
import { checkAuth } from '../lib/auth-server';

export const metadata: Metadata = {
  title: '수행 목록 - 플리커 관리자',
  description: '플리커 수행 목록',
  keywords: ['수행', '플리커', '관리'],
  openGraph: {
    title: '수행 목록 - 플리커 관리자',
    description: '플리커 수행 목록',
    type: 'website',
  },
  robots: "noindex, nofollow",
};

export default async function ReviewsPage() {
  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    return <AccessDenied />;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <p className="text-gray-900">수행 목록 페이지 입니다.</p>
      </div>
    </Layout>
  );
}
