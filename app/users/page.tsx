import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import { externalApiGet } from "../lib/external-api";
import { User, UsersResponse } from "../types/user";
import { DecodeBase64 } from "../utils/base64Utils";
import UsersClient from "./UsersClient";

export const metadata: Metadata = {
  title: '회원관리 - 플링크 관리자',
  description: '플링크 회원 관리',
  keywords: ['회원', '관리', '플링크'],
  openGraph: {
    title: '회원관리 - 플링크 관리자',
    description: '플링크 회원 관리',
    type: 'website',
  },
  robots: "noindex, nofollow",
};

function decodeUser(user: User): User {
  return {
    ...user,
    affiliation: user.affiliation ? DecodeBase64(user.affiliation) : user.affiliation,
    memo: user.memo ? DecodeBase64(user.memo) : user.memo,
    uname: user.uname ? DecodeBase64(user.uname) : user.uname,
  };
}

interface PageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    searchType?: string;
    searchWords?: string;
  }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  await requireAuth();

  const params = await searchParams;

  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') {
    queryParams.set('status', params.status);
  }
  queryParams.set('page', params.page || '1');
  queryParams.set('limit', '10');

  if (params.searchType && params.searchWords) {
    queryParams.set('searchType', params.searchType);
    queryParams.set('searchWords', params.searchWords);
  }

  const response = await externalApiGet<UsersResponse>(
    `/api/admin-app/users?${queryParams.toString()}`
  );

  const rawUsers = response.data?.data || [];
  const initialUsers = rawUsers.map(decodeUser);
  const initialTotal = response.data?.total || 0;
  const initialError = response.error || null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <UsersClient
          initialUsers={initialUsers}
          initialTotal={initialTotal}
          initialError={initialError}
        />
      </div>
    </Layout>
  );
}
