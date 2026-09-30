import type { Metadata } from "next";
import Link from "next/link";
import Layout from "../../components/Layout";
import { requireAuth } from "../../lib/auth-server";
import { getPcbang, getPcbangAgents } from "../actions";
import PcbangDetailClient from "./PcbangDetailClient";

export const metadata: Metadata = {
  title: 'PC방 상세 - 플링크 관리자',
  description: '플링크 PC방 에이전트와 수행 통계',
  robots: "noindex, nofollow",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PcbangDetailPage({ params }: PageProps) {
  await requireAuth();

  const { id } = await params;
  const [pcbang, agents] = await Promise.all([getPcbang(id), getPcbangAgents(id)]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {pcbang.ok && pcbang.data ? (
          <PcbangDetailClient
            key={pcbang.data.id}
            pcbang={pcbang.data}
            agents={agents.data}
            agentsError={agents.ok ? null : agents.error}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-3">
            <p className="text-sm text-red-500">{pcbang.status === 404 ? 'PC방을 찾을 수 없습니다.' : pcbang.error}</p>
            <Link href="/pcbangs" className="text-sm text-blue-600 hover:underline">PC방 목록으로</Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
