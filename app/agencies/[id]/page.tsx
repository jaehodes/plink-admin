import type { Metadata } from "next";
import Link from "next/link";
import Layout from "../../components/Layout";
import { requireAuth } from "../../lib/auth-server";
import { getAgencyDetail, getPlatformPrices } from "../actions";
import AgencyDetailClient from "./AgencyDetailClient";

export const metadata: Metadata = {
  title: '대리점 상세 - 플링크 관리자',
  description: '플링크 대리점 계정 상세',
  robots: "noindex, nofollow",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgencyDetailPage({ params }: PageProps) {
  await requireAuth();

  const { id } = await params;
  // 플랫폼 단가는 적립 청구 참고 금액과 유형 전환 계산에 쓴다. 이력은 필요 없으므로 1건만 받는다
  const [detail, platform] = await Promise.all([getAgencyDetail(id), getPlatformPrices({ limit: 1 })]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {detail.ok && detail.data ? (
          <AgencyDetailClient
            key={detail.data.user.id}
            detail={detail.data}
            platformPrices={platform.data?.current ?? { quiz1: null, quiz2: null, direction: null }}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
            <p className="text-sm text-red-500">{detail.status === 404 ? '대리점 계정을 찾을 수 없습니다.' : detail.error}</p>
            <Link href="/agencies" className="text-sm text-blue-600 hover:underline">대리점 목록으로</Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
