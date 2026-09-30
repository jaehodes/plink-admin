import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import PcbangStatsClient from "./PcbangStatsClient";

export const metadata: Metadata = {
  title: 'PC방 통계 - 플링크 관리자',
  description: '플링크 PC방 수행 통계',
  robots: "noindex, nofollow",
};

export default async function PcbangStatsPage() {
  await requireAuth();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <PcbangStatsClient />
      </div>
    </Layout>
  );
}
