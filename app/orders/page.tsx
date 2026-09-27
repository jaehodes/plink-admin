import type { Metadata } from "next";
import Layout from "../components/Layout";
import AccessDenied from "../components/AccessDenied";
import { checkAuth } from "../lib/auth-server";
import { externalApiGet } from "../lib/external-api";
import { Order } from "../types/order";
import OrdersClient from "./OrdersClient";

export const metadata: Metadata = {
  title: '발주 목록 - 플리커 관리자',
  description: '플리커 발주 목록',
  keywords: ['발주', '목록', '플리커', '관리'],
  openGraph: {
    title: '발주 목록 - 플리커 관리자',
    description: '플리커 발주 목록',
    type: 'website',
  },
  robots: "noindex, nofollow",
};

interface OrdersApiResponse {
  ret: number;
  orders: Order[];
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

export default async function OrdersPage({ searchParams }: PageProps) {
  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    return <AccessDenied />;
  }

  const params = await searchParams;
  const period: PeriodFilter | undefined = isValidPeriod(params.period) ? params.period : undefined;

  // API 쿼리 파라미터 구성
  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') {
    queryParams.set('status', params.status);
  }
  if (params.type && params.type !== 'all') {
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

  // 서버에서 초기 데이터 가져오기
  const response = await externalApiGet<OrdersApiResponse>(
    `/api/admin-app/orders?${queryParams.toString()}`
  );

  const initialOrders = response.data?.orders || [];
  const initialTotal = response.data?.total || 0;
  const initialError = response.error || null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <OrdersClient
          initialOrders={initialOrders}
          initialTotal={initialTotal}
          initialError={initialError}
          period={period}
        />
      </div>
    </Layout>
  );
}
