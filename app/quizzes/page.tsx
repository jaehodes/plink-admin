import type { Metadata } from "next";
import Layout from "../components/Layout";
import AccessDenied from "../components/AccessDenied";
import { checkAuth } from "../lib/auth-server";
import { externalApiGet } from "../lib/external-api";
import { QuizItem, ParkingItem, QuizzesResponse, ParkingResponse } from "../types/quiz";
import { DecodeBase64, EncodeBase64 } from "../utils/base64Utils";
import QuizzesClient from "./QuizzesClient";

export const metadata: Metadata = {
  title: '퀴즈/주차장 관리 - 플리커 관리자',
  description: '플리커 퀴즈 및 주차장 문제 관리',
  keywords: ['퀴즈', '주차장', '관리', '플리커'],
  openGraph: {
    title: '퀴즈/주차장 관리 - 플리커 관리자',
    description: '플리커 퀴즈 및 주차장 문제 관리',
    type: 'website',
  },
  robots: "noindex, nofollow",
};

function decodeQuiz(quiz: QuizItem): QuizItem {
  return {
    ...quiz,
    question: DecodeBase64(quiz.question),
    answer: DecodeBase64(quiz.answer),
    placeName: quiz.placeName ? DecodeBase64(quiz.placeName) : quiz.placeName,
    reason: quiz.reason ? DecodeBase64(quiz.reason) : quiz.reason,
  };
}

function decodeParking(parking: ParkingItem): ParkingItem {
  return {
    ...parking,
    parkingAnswer: DecodeBase64(parking.parkingAnswer),
    placeName: parking.placeName ? DecodeBase64(parking.placeName) : parking.placeName,
    reason: parking.reason ? DecodeBase64(parking.reason) : parking.reason,
  };
}

const VALID_PERIODS = ['today', 'yesterday', 'week', 'month', 'custom'] as const;
type PeriodFilter = typeof VALID_PERIODS[number];

function isValidPeriod(p: string | undefined): p is PeriodFilter {
  return !!p && (VALID_PERIODS as readonly string[]).includes(p);
}

interface PageProps {
  searchParams: Promise<{
    mode?: string; // 'quiz' | 'parking'
    tab?: string;
    isActive?: string;
    searchType?: string;
    searchWords?: string;
    page?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function QuizzesPage({ searchParams }: PageProps) {
  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    return <AccessDenied />;
  }

  const params = await searchParams;
  const mode = params.mode === 'parking' ? 'parking' : 'quiz';
  const period: PeriodFilter | undefined = isValidPeriod(params.period) ? params.period : undefined;

  const queryParams = new URLSearchParams();
  if (mode === 'quiz' && params.tab && params.tab !== 'all') {
    queryParams.set('tab', params.tab);
  }
  if (params.isActive && params.isActive !== 'all') {
    queryParams.set('isActive', params.isActive);
  }
  if (params.searchType && params.searchWords) {
    queryParams.set('searchType', params.searchType);
    queryParams.set('searchWords', EncodeBase64(params.searchWords));
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

  if (mode === 'quiz') {
    const response = await externalApiGet<QuizzesResponse>(
      `/api/admin-app/quizzes?${queryParams.toString()}`
    );
    const rawQuizzes = response.data?.data || [];
    const quizzes = rawQuizzes.map(decodeQuiz);

    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <QuizzesClient
            mode="quiz"
            initialQuizzes={quizzes}
            initialParkings={[]}
            initialTotal={response.data?.total || 0}
            initialError={response.error || null}
            period={period}
          />
        </div>
      </Layout>
    );
  } else {
    const response = await externalApiGet<ParkingResponse>(
      `/api/admin-app/parkings?${queryParams.toString()}`
    );
    const rawParkings = response.data?.data || [];
    const parkings = rawParkings.map(decodeParking);

    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <QuizzesClient
            mode="parking"
            initialQuizzes={[]}
            initialParkings={parkings}
            initialTotal={response.data?.total || 0}
            initialError={response.error || null}
            period={period}
          />
        </div>
      </Layout>
    );
  }
}
