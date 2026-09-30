import type { Metadata } from "next";
import Layout from "../components/Layout";
import { requireAuth } from "../lib/auth-server";
import { externalApiGet } from "../lib/external-api";
import { MissionReportSummary, MissionReportsResponse } from "../types/mission-report";
import { DecodeBase64 } from "../utils/base64Utils";
import ReportsClient from "./ReportsClient";

export const metadata: Metadata = {
  title: '문의 목록 - 플링크 관리자',
  description: '플링크 미션 신고 문의 목록',
  keywords: ['문의', '신고', '플링크', '관리'],
  openGraph: {
    title: '문의 목록 - 플링크 관리자',
    description: '플링크 미션 신고 문의 목록',
    type: 'website',
  },
  robots: "noindex, nofollow",
};

function decodeSummary(report: MissionReportSummary): MissionReportSummary {
  return {
    ...report,
    reason: DecodeBase64(report.reason),
    uname: report.uname ? DecodeBase64(report.uname) : report.uname,
    orderer: report.orderer ? DecodeBase64(report.orderer) : report.orderer,
    affiliation: report.affiliation ? DecodeBase64(report.affiliation) : report.affiliation,
    placeName: report.placeName ? DecodeBase64(report.placeName) : report.placeName,
  };
}

const VALID_PERIODS = ['today', 'yesterday', 'week', 'month', 'custom'] as const;
type PeriodFilter = typeof VALID_PERIODS[number];

function isValidPeriod(p: string | undefined): p is PeriodFilter {
  return !!p && (VALID_PERIODS as readonly string[]).includes(p);
}

interface PageProps {
  searchParams: Promise<{
    status?: string;
    page?: string;
    searchType?: string;
    searchWords?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  await requireAuth();

  const params = await searchParams;
  const period: PeriodFilter | undefined = isValidPeriod(params.period) ? params.period : undefined;

  const queryParams = new URLSearchParams();
  if (params.status && params.status !== 'all') {
    queryParams.set('status', params.status);
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
  queryParams.set('limit', '5');

  const response = await externalApiGet<MissionReportsResponse>(
    `/api/admin-app/mission-reports?${queryParams.toString()}`
  );

  const rawReports = response.data?.data || [];
  const initialReports = rawReports.map(decodeSummary);
  const initialTotal = response.data?.total || 0;
  const initialError = response.error || null;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <ReportsClient
          initialReports={initialReports}
          initialTotal={initialTotal}
          initialError={initialError}
          period={period}
        />
      </div>
    </Layout>
  );
}
