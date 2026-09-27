import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import { externalApiGet } from "../lib/external-api";
import { FaqItem, FaqResponse, FaqCategory, FaqCategoriesResponse } from "../types/faq";
import { DecodeBase64 } from "../utils/base64Utils";
import FaqClient from "./FaqClient";

export const metadata: Metadata = {
  title: 'FAQ 관리 - 플리커 관리자',
  description: '플리커 자주묻는 질문 관리',
  keywords: ['FAQ', '자주묻는 질문', '플리커', '관리'],
  openGraph: {
    title: 'FAQ 관리 - 플리커 관리자',
    description: '플리커 자주묻는 질문 관리',
    type: 'website',
  },
  robots: "noindex, nofollow",
};

function decodeFaq(faq: FaqItem): FaqItem {
  return {
    ...faq,
    question: DecodeBase64(faq.question),
    answer: DecodeBase64(faq.answer),
  };
}

interface PageProps {
  searchParams: Promise<{
    category?: string;
    page?: string;
  }>;
}

export default async function FaqPage({ searchParams }: PageProps) {
  await requireAuth();

  const params = await searchParams;

  // 카테고리 목록 조회
  const categoriesResponse = await externalApiGet<FaqCategoriesResponse>(
    '/api/admin-app/faq/categories'
  );
  const categories: FaqCategory[] = categoriesResponse.data?.data || [];

  // FAQ 목록 조회
  const queryParams = new URLSearchParams();
  if (params.category && params.category !== 'all') {
    queryParams.set('category', params.category);
  }
  queryParams.set('page', params.page || '1');
  queryParams.set('limit', '10');

  const response = await externalApiGet<FaqResponse>(
    `/api/admin-app/faq?${queryParams.toString()}`
  );
  const rawFaqs = response.data?.data || [];
  const faqs = rawFaqs.map(decodeFaq);
  const initialTotal = response.data?.total || 0;
  const initialError = categoriesResponse.error || response.error || null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <FaqClient
          categories={categories}
          initialFaqs={faqs}
          initialTotal={initialTotal}
          initialError={initialError}
        />
      </div>
    </Layout>
  );
}
