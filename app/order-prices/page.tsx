import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import PlatformPricesClient from "./PlatformPricesClient";

export const metadata: Metadata = {
  title: '플랫폼 단가 - 플리커 관리자',
  description: '플리커 플랫폼 단가 관리',
  robots: "noindex, nofollow",
};

export default async function OrderPricesPage() {
  await requireAuth();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <PlatformPricesClient />
      </div>
    </Layout>
  );
}
