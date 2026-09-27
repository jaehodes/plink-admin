// 대시보드 v2 타입 정의

// ① 물량 진척
export interface HeroStats {
  orders: number;          // 발주 건수
  target: number;          // 목표 물량 (Σ totalDailyCount)
  completed: number;       // 소화 물량 (completed 수행)
  timeout: number;         // 타임오버 수
}

// ①-2 유저 진척
export interface UserStats {
  newUsers: number;          // 신규 가입자
  dailyActiveUsers: number;  // 일일 유입자
  avgExecutions: number;     // 평균 수행치 (유저 1인당)
}

// ② 발주 집계
export interface OrderAgg {
  orders: number;          // 총 발주 건수
  target: number;          // 총 목표 물량
  revenue: number;         // 총 매출 (원)
}

export interface OrdererRow {
  name: string;            // 발주처명
  orders: number;          // 발주 건수
  target: number;          // 목표 물량
  revenue: number;         // 매출 (원)
}

// ③ 앱사별 소화량
export interface MediaRow {
  name: string;            // 앱사명
  completed: number;       // 소화량
  share: number;           // 점유율 (%)
  timeoutRate: number;     // 타임오버율 (%)
}

// ④ 상태별 수행
export interface StatusStats {
  completed: number;
  timeout: number;
  skipped: number;
  failed: number;
  progress: number;
  total: number;
}

// ⑤ 타입별 수행
export interface TypeRow {
  key: string;             // save, quiz1, quiz2, direction
  completed: number;       // 수행 완료
  target: number;          // 목표
  avgDuration: number;     // 평균 소요시간 (초)
}

// ⑥ 상위 랭커
export interface TopRanker {
  rank: number;
  uname: string;            // 유저 닉네임
  completed: number;        // 완료 수행 수
}

// 대시보드 API 응답
export interface DashboardData {
  hero: HeroStats;
  userStats: UserStats;
  orderAgg: OrderAgg;
  orderers: OrdererRow[];
  media: MediaRow[];
  status: StatusStats;
  types: TypeRow[];
  topRankers: TopRanker[];
}

// 기간 필터 타입
export type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

// 기간 필터 라벨
export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  today: '오늘',
  yesterday: '어제',
  week: '이번 주',
  month: '이번 달',
  all: '전체',
  custom: '기간 설정',
};

// 타입 컬러
export const TYPE_COLORS: Record<string, string> = {
  save: '#5b8cff',
  quiz1: '#27c499',
  quiz2: '#f6b73c',
  direction: '#b27bff',
};

// 타입 라벨
export const TYPE_LABELS: Record<string, string> = {
  save: '플레이스 저장',
  quiz1: '유입미션(퀴즈1)',
  quiz2: '유입미션(퀴즈2)',
  direction: '길찾기 미션',
};

// 상태 메타
export const STATUS_META: [string, string, string][] = [
  ['completed', '완료', '#27c499'],
  ['progress', '진행중', '#5b8cff'],
  ['timeout', '타임오버', '#ff5e7a'],
  ['skipped', '포기', '#5f6889'],
  ['failed', '실패', '#7a3a4a'],
];
