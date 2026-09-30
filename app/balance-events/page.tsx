import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import BalanceEventsClient from "./BalanceEventsClient";

export const metadata: Metadata = {
  title: '건수 원장 - 플리커 관리자',
  description: '플리커 대리점 건수 원장',
  robots: "noindex, nofollow",
};

interface PageProps {
  searchParams: Promise<{ userId?: string; kind?: string }>;
}

export default async function BalanceEventsPage({ searchParams }: PageProps) {
  await requireAuth();
  const params = await searchParams;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <BalanceEventsClient initialUserId={params.userId} initialKind={params.kind} />
      </div>
    </Layout>
  );
}
