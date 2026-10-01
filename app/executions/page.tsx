import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import { externalApiGet } from "../lib/external-api";
import { Execution, EXECUTION_TYPE_LABELS } from "../types/execution";
import ExecutionsClient from "./ExecutionsClient";

export const metadata: Metadata = {
  title: '수행목록 - 플링크 관리자',
  description: '플링크 수행목록',
  keywords: ['수행', '목록', '플링크', '관리'],
  openGraph: {
    title: '수행목록 - 플링크 관리자',
    description: '플링크 수행목록',
    type: 'website',
  },
  robots: "noindex, nofollow",
};

interface ExecutionsApiResponse {
  ret: number;
  executions: Execution[];
  total: number;
}

const VALID_PERIODS = ['today', 'yesterday', 'week', 'month', 'custom'] as const;
type PeriodFilter = typeof VALID_PERIODS[number];

function isValidPeriod(p: string | undefined): p is PeriodFilter {
  return !!p && (VALID_PERIODS as readonly string[]).includes(p);
}

interface PageProps {
  searchParams: Promise<{
    status?: string;
    type?: string;
    page?: string;
    searchType?: string;
    searchWords?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ExecutionsPage({ searchParams }: PageProps) {
  await requireAuth();

  const params = await searchParams;
  const period: PeriodFilter | undefined = isValidPeriod(params.period) ? params.period : undefined;

  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') {
    queryParams.set('status', params.status);
  }
  // 없어진 유형(예: 예전 북마크의 type=save)은 API가 400을 주므로 전체로 본다.
  if (params.type && Object.hasOwn(EXECUTION_TYPE_LABELS, params.type)) {
    queryParams.set('type', params.type);
  }
  if (params.searchType && params.searchWords) {
    queryParams.set('searchType', params.searchType);
    queryParams.set('searchWords', params.searchWords);
  }
  if (period) {
    queryParams.set('period', period);
    if (period === 'custom' && params.startDate && params.endDate) {
      queryParams.set('startDate', params.startDate);
      queryParams.set('endDate', params.endDate);
    }
  }
  queryParams.set('page', params.page || '1');
  queryParams.set('limit', '20');

  const response = await externalApiGet<ExecutionsApiResponse>(
    `/api/admin-app/executions?${queryParams.toString()}`
  );

  const initialExecutions = response.data?.executions || [];
  const initialTotal = response.data?.total || 0;
  const initialError = response.error || null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <ExecutionsClient
          initialExecutions={initialExecutions}
          initialTotal={initialTotal}
          initialError={initialError}
          period={period}
        />
      </div>
    </Layout>
  );
}
