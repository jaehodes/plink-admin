import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import { externalApiGet } from "../lib/external-api";
import { Notice, NoticesResponse } from "../types/notice";
import { DecodeBase64 } from "../utils/base64Utils";
import NoticesClient from "./NoticesClient";

export const metadata: Metadata = {
  title: '공지사항 - 플리커 관리자',
  description: '플리커 공지사항 관리',
  keywords: ['공지사항', '플리커', '관리'],
  openGraph: {
    title: '공지사항 - 플리커 관리자',
    description: '플리커 공지사항 관리',
    type: 'website',
  },
  robots: "noindex, nofollow",
};

function decodeNotice(notice: Notice): Notice {
  return {
    ...notice,
    title: DecodeBase64(notice.title),
    content: DecodeBase64(notice.content),
    createdBy: notice.createdBy ? DecodeBase64(notice.createdBy) : notice.createdBy,
    updatedBy: notice.updatedBy ? DecodeBase64(notice.updatedBy) : notice.updatedBy,
  };
}

interface PageProps {
  searchParams: Promise<{
    isImportant?: string;
    page?: string;
  }>;
}

export default async function NoticesPage({ searchParams }: PageProps) {
  await requireAuth();

  const params = await searchParams;

  // 중요 공지 (항상 상단 고정)
  const pinnedResponse = await externalApiGet<NoticesResponse>(
    '/api/admin-app/notices?isImportant=true&limit=100'
  );
  const rawPinned = pinnedResponse.data?.data || [];
  const pinnedNotices = rawPinned.map(decodeNotice);

  // 일반 공지 (페이지네이션)
  const queryParams = new URLSearchParams();
  if (params.isImportant !== 'true') {
    queryParams.set('isImportant', 'false');
  }
  queryParams.set('page', params.page || '1');
  queryParams.set('limit', '7');

  const response = await externalApiGet<NoticesResponse>(
    `/api/admin-app/notices?${queryParams.toString()}`
  );
  const rawNotices = response.data?.data || [];
  const normalNotices = rawNotices.map(decodeNotice);
  const initialTotal = response.data?.total || 0;
  const initialError = pinnedResponse.error || response.error || null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <NoticesClient
          pinnedNotices={params.isImportant === 'false' ? [] : pinnedNotices}
          initialNotices={params.isImportant === 'true' ? [] : normalNotices}
          initialTotal={params.isImportant === 'true' ? 0 : initialTotal}
          initialError={initialError}
        />
      </div>
    </Layout>
  );
}
