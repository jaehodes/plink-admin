import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import { listAgencies } from "./actions";
import AgenciesClient from "./AgenciesClient";

export const metadata: Metadata = {
  title: '대리점 관리 - 플리커 관리자',
  description: '플리커 대리점 계정·건수 관리',
  robots: "noindex, nofollow",
};

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{
    tier?: string;
    blocked?: string;
    searchWords?: string;
    page?: string;
  }>;
}

export default async function AgenciesPage({ searchParams }: PageProps) {
  await requireAuth();

  const params = await searchParams;
  const tier = ['1', '2', '3'].includes(params.tier ?? '') ? params.tier! : 'all';
  const blocked = ['true', 'false'].includes(params.blocked ?? '') ? params.blocked! : 'all';
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);

  const result = await listAgencies({ tier, blocked, searchWords: params.searchWords, page, limit: PAGE_SIZE });

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <AgenciesClient
          users={result.data?.users ?? []}
          total={result.data?.total ?? 0}
          error={result.error}
          pageSize={PAGE_SIZE}
        />
      </div>
    </Layout>
  );
}
