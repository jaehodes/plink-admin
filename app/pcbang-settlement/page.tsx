import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import PcbangSettlementClient from "./PcbangSettlementClient";

export const metadata: Metadata = {
  title: 'PC방 정산 - 플링크 관리자',
  description: '플링크 PC방 월 정산',
  robots: "noindex, nofollow",
};

export default async function PcbangSettlementPage() {
  await requireAuth();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <PcbangSettlementClient />
      </div>
    </Layout>
  );
}
