import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import PlacesClient from "./PlacesClient";

export const metadata: Metadata = {
  title: '플레이스 - 플링크 관리자',
  description: '플링크 플레이스 목록',
  robots: "noindex, nofollow",
};

export default async function PlacesPage() {
  await requireAuth();

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <PlacesClient />
      </div>
    </Layout>
  );
}
