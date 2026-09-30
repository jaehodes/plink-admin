import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import { externalApiGet } from "../lib/external-api";
import { isProductionEnv } from "../lib/app-env";
import { DashboardData, PeriodFilter } from "../types/dashboard";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: '대시보드 - 플링크 관리자',
  description: '플링크 대시보드',
  keywords: ['대시보드', '플링크', '관리'],
  openGraph: {
    title: '대시보드 - 플링크 관리자',
    description: '플링크 대시보드',
    type: 'website',
  },
  robots: "noindex, nofollow",
};

function isValidPeriod(period: string | undefined): period is PeriodFilter {
  return period !== undefined && ['today', 'yesterday', 'week', 'month', 'all', 'custom'].includes(period);
}

interface DashboardApiResponse {
  ret: number;
  data: DashboardData;
}

interface PageProps {
  searchParams: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  await requireAuth();

  const params = await searchParams;
  const period: PeriodFilter = isValidPeriod(params.period) ? params.period : 'today';

  const queryParams = new URLSearchParams();
  queryParams.set('period', period);
  if (period === 'custom' && params.startDate && params.endDate) {
    queryParams.set('startDate', params.startDate);
    queryParams.set('endDate', params.endDate);
  }

  const response = await externalApiGet<DashboardApiResponse>(
    `/api/admin-app/dashboard?${queryParams.toString()}`
  );

  let dashboardData: DashboardData | null = null;
  let error: string | null = null;

  console.log('[DASHBOARD]', response.error, JSON.stringify(response.data)?.slice(0, 300));

  if (response.error) {
    error = response.error;
  } else if (response.data && response.data.ret === 0) {
    // data 필드가 있으면 사용, 없으면 response.data 자체를 사용
    dashboardData = response.data.data ?? response.data as unknown as DashboardData;
  } else if (response.data) {
    // ret 필드 없이 바로 데이터가 올 수도 있음
    dashboardData = response.data as unknown as DashboardData;
  } else {
    error = '데이터를 불러오는데 실패했습니다.';
  }

  return (
    <Layout>
      <div className="max-w-[1100px] mx-auto">
        <DashboardClient data={dashboardData} error={error} period={period} isProduction={isProductionEnv()} />
      </div>
    </Layout>
  );
}
